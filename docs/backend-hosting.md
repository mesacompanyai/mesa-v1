# Mesa cloud backend hosting

This repo is set up so production does not depend on a local computer.

## Services

| Service | Host | Start command | Public |
| --- | --- | --- | --- |
| mesa-web | Vercel | existing static build | yes |
| mesa-api | Railway | `npm run start:api` | yes |
| mesa-worker-messages | Railway | `npm run start:worker:messages` | no |
| mesa-worker-media | Railway | `npm run start:worker:media` | no |
| mesa-postgres | Railway Postgres | managed | no |
| mesa-redis | Railway Redis | managed | no |
| evolution-api | Railway | Evolution API image/template | preferably no |
| evolution-postgres | Railway Postgres | managed | no |
| evolution-redis | Railway Redis | managed | no |
| mesa-media-bucket | Cloudflare R2 | managed object storage | private |
| openai-api | OpenAI | managed API | external |
| sentry | Sentry | managed | external |

## Railway deployment shape

Create three Railway services from this same GitHub repo:

1. `mesa-api`
   - Public networking enabled.
   - Build command: `npm run prisma:generate && npm run build`.
   - Start command: `npm run start:api`.
   - Health check: `/api/health`.
2. `mesa-worker-messages`
   - Public networking disabled.
   - Build command: `npm run prisma:generate && npm run build`.
   - Start command: `npm run start:worker:messages`.
3. `mesa-worker-media`
   - Public networking disabled.
   - Build command: `npm run prisma:generate && npm run build`.
   - Start command: `npm run start:worker:media`.

All three services should share the same `DATABASE_URL`, `REDIS_URL`,
`OPENAI_API_KEY`, and R2 variables. Only `mesa-api` needs a public domain for
Evolution webhooks.

In Railway, set `MESA_SERVICE_ROLE` per service:

- `mesa-api`: `api`
- `mesa-worker-messages`: `worker:messages`
- `mesa-worker-media`: `worker:media`

The root `railway.json` uses that variable to choose the right start command.
Set `/api/health` as the healthcheck path only on `mesa-api`.

For Railway Free plan constraints, `mesa-api` can temporarily run all processes
with `MESA_SERVICE_ROLE=all`. This starts the API plus both workers in one
container. Split them back into separate services before production traffic.

## Evolution API

Run Evolution API as its own Railway service with its own Postgres and Redis.
Do not point Evolution API at Mesa's database. The Mesa API talks to Evolution
through `EVOLUTION_API_URL` and `EVOLUTION_GLOBAL_API_KEY`.

Configure each Evolution instance webhook to:

`POST https://<mesa-api-domain>/api/webhooks/evolution`

Send either:

- `Authorization: Bearer <EVOLUTION_WEBHOOK_SECRET>`
- or `x-mesa-webhook-secret: <EVOLUTION_WEBHOOK_SECRET>`

## Media

The backend never stores image/audio/file bytes in Postgres. It stores files in
Cloudflare R2 and keeps only metadata in `media_assets`.

Recommended buckets:

- `mesa-media-prod`
- `mesa-media-staging`

Keep buckets private and serve files with short-lived signed URLs.
