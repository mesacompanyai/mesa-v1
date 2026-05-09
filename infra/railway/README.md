# Railway service setup

Use one Railway project with these Mesa services:

- `mesa-api`
- `mesa-worker-messages`
- `mesa-worker-media`
- `mesa-postgres`
- `mesa-redis`

Use a separate Evolution API service group:

- `evolution-api`
- `evolution-postgres`
- `evolution-redis`

## Shared Mesa variables

Set these on `mesa-api`, `mesa-worker-messages`, and `mesa-worker-media`:

```env
DATABASE_URL=${{mesa-postgres.DATABASE_URL}}
REDIS_URL=${{mesa-redis.REDIS_URL}}
MESA_SERVICE_ROLE=api # api, worker:messages, or worker:media per service
OPENAI_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=mesa-media-prod
SENTRY_DSN=...
```

Set these only where needed:

```env
EVOLUTION_API_URL=https://...
EVOLUTION_GLOBAL_API_KEY=...
EVOLUTION_WEBHOOK_SECRET=...
FRONTEND_URL=https://...
PUBLIC_API_URL=https://...
```

## Deploy order

1. Provision Postgres and Redis for Mesa.
2. Deploy `mesa-api` and run `npm run prisma:deploy`.
3. Deploy both workers.
4. Provision Evolution API with separate Postgres/Redis.
5. Connect each restaurant WhatsApp instance through the Mesa API.

## CLI bootstrap

When the Railway project is accessible to the logged-in CLI user, run:

```bash
RAILWAY_WORKSPACE_ID=... \
EVOLUTION_API_URL=... \
EVOLUTION_GLOBAL_API_KEY=... \
EVOLUTION_WEBHOOK_SECRET=... \
OPENAI_API_KEY=... \
R2_ACCOUNT_ID=... \
R2_ACCESS_KEY_ID=... \
R2_SECRET_ACCESS_KEY=... \
FRONTEND_URL=https://... \
bash scripts/railway-bootstrap-mesa.sh
```

The root `railway.json` uses `MESA_SERVICE_ROLE` to start the correct process:

- `api` -> `npm run start:api`
- `worker:messages` -> `npm run start:worker:messages`
- `worker:media` -> `npm run start:worker:media`
- `all` -> `npm run start:all` for temporary single-service deployments
