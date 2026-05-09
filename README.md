# Mesa

Mesa is a restaurant operations prototype with a cloud backend scaffold for
WhatsApp synchronization, reservations, media processing, and AI-assisted
review flows.

## Frontend

The current dashboard prototype is still static and can be served by Vercel
with the existing `vercel.json`.

## Cloud backend

The production backend is designed to run fully in cloud infrastructure:

- `mesa-api`: NestJS API hosted on Railway.
- `mesa-worker-messages`: private Railway worker for Evolution webhook events.
- `mesa-worker-media`: private Railway worker for images, audio, PDFs, and attachments.
- `mesa-postgres`: Railway Postgres for Mesa business data.
- `mesa-redis`: Railway Redis for BullMQ queues.
- `evolution-api`: separate Railway service with its own Postgres and Redis.
- `mesa-media-bucket`: private Cloudflare R2 bucket.
- `openai-api`: external OpenAI API for text, audio, and vision.

See [docs/backend-hosting.md](docs/backend-hosting.md) for the full hosting
map and Railway setup.

## Local commands

```bash
npm install
npm run prisma:generate
npm run build
npm test
```

Run services locally:

```bash
npm run dev:api
npm run dev:worker:messages
npm run dev:worker:media
```

Copy `.env.example` to `.env` and fill Railway, Evolution, R2, and OpenAI
credentials before running the cloud backend locally.
