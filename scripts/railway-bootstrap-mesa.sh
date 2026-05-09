#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${RAILWAY_PROJECT_ID:-0021f453-f3c6-487f-8f2d-4fdfba956ca6}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
GITHUB_REPO="${GITHUB_REPO:-mesacompanyai/mesa-v1}"

WORKSPACE_ARGS=()
if [[ -n "${RAILWAY_WORKSPACE_ID:-}" ]]; then
  WORKSPACE_ARGS=(--workspace "$RAILWAY_WORKSPACE_ID")
fi

echo "Linking Railway project ${PROJECT_ID} (${ENVIRONMENT})..."
railway link --project "$PROJECT_ID" --environment "$ENVIRONMENT" "${WORKSPACE_ARGS[@]}"

echo "Creating Mesa data services. If these already exist, skip this step manually."
railway add --database postgres --service mesa-postgres --json || true
railway add --database redis --service mesa-redis --json || true

echo "Creating Mesa runtime services from ${GITHUB_REPO}. If these already exist, skip this step manually."
railway add --service mesa-api --repo "$GITHUB_REPO" --json || true
railway add --service mesa-worker-messages --repo "$GITHUB_REPO" --json || true
railway add --service mesa-worker-media --repo "$GITHUB_REPO" --json || true

set_plain_var() {
  local service="$1"
  local key="$2"
  local value="$3"
  railway variable set --service "$service" --environment "$ENVIRONMENT" --skip-deploys "${key}=${value}"
}

set_secret_var_from_env() {
  local service="$1"
  local key="$2"
  local value="${!key:-}"

  if [[ -z "$value" ]]; then
    echo "Skipping ${key} for ${service}: env var not set locally."
    return 0
  fi

  printf '%s' "$value" | railway variable set --service "$service" --environment "$ENVIRONMENT" --skip-deploys --stdin "$key"
}

configure_service() {
  local service="$1"
  local role="$2"

  set_plain_var "$service" NODE_ENV production
  set_plain_var "$service" MESA_SERVICE_ROLE "$role"
  set_plain_var "$service" DATABASE_URL '${{mesa-postgres.DATABASE_URL}}'
  set_plain_var "$service" REDIS_URL '${{mesa-redis.REDIS_URL}}'
  set_plain_var "$service" R2_BUCKET "${R2_BUCKET:-mesa-media-prod}"
  set_plain_var "$service" OPENAI_TEXT_MODEL "${OPENAI_TEXT_MODEL:-gpt-4.1-mini}"
  set_plain_var "$service" OPENAI_VISION_MODEL "${OPENAI_VISION_MODEL:-gpt-4.1-mini}"
  set_plain_var "$service" OPENAI_TRANSCRIPTION_MODEL "${OPENAI_TRANSCRIPTION_MODEL:-gpt-4o-mini-transcribe}"

  set_secret_var_from_env "$service" EVOLUTION_API_URL
  set_secret_var_from_env "$service" EVOLUTION_GLOBAL_API_KEY
  set_secret_var_from_env "$service" EVOLUTION_WEBHOOK_SECRET
  set_secret_var_from_env "$service" OPENAI_API_KEY
  set_secret_var_from_env "$service" R2_ACCOUNT_ID
  set_secret_var_from_env "$service" R2_ACCESS_KEY_ID
  set_secret_var_from_env "$service" R2_SECRET_ACCESS_KEY
  set_secret_var_from_env "$service" SENTRY_DSN
}

echo "Configuring service variables..."
configure_service mesa-api api
configure_service mesa-worker-messages 'worker:messages'
configure_service mesa-worker-media 'worker:media'

set_plain_var mesa-api PUBLIC_API_URL 'https://${{mesa-api.RAILWAY_PUBLIC_DOMAIN}}'
if [[ -n "${FRONTEND_URL:-}" ]]; then
  set_plain_var mesa-api FRONTEND_URL "$FRONTEND_URL"
else
  echo "Skipping FRONTEND_URL for mesa-api: env var not set locally."
fi

echo "Generating public Railway domain for mesa-api..."
railway domain --service mesa-api --json || true

echo "Bootstrap complete. Next:"
echo "1. Set missing secret variables in Railway if any were skipped."
echo "2. Ensure mesa-api has healthcheck path /api/health in Railway settings."
echo "3. Deploy mesa-api, run npm run prisma:deploy, then deploy both workers."
