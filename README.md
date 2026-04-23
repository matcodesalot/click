# Click

A tiny global click counter. Every click increments a single number that everyone in the world shares, plus a per-user count if you're signed in.

## Stack

- **Client** — React 19 + Vite + Tailwind, in `apps/client`
- **Server** — Express 5 + better-auth, in `apps/server`
- **Shared schemas** — Zod, in `packages/shared`
- **Storage** — Redis (hot counters, source of truth at runtime) + MongoDB (auth + durable counter snapshots)
- **Monorepo** — npm workspaces

Counters are incremented in Redis on every click and flushed to MongoDB every 10 seconds. See `apps/server/src/clicks.ts` for the details.

## Prerequisites

- **Node.js 20.19+** (the toolchain warns on older 20.x) — [download](https://nodejs.org/)
- **npm 10+** (ships with Node 20)
- **Docker** — required, used to run MongoDB and Redis locally
  - **Windows / macOS**: install [Docker Desktop](https://www.docker.com/products/docker-desktop/). On Windows, also enable WSL2 integration for your distro under *Settings → Resources → WSL Integration*.
  - **Linux**: install [Docker Engine](https://docs.docker.com/engine/install/) and the [Compose plugin](https://docs.docker.com/compose/install/linux/).

Confirm Docker is working before continuing:

```bash
docker --version
docker compose version
docker info          # must succeed — means the daemon is reachable
```

You don't need to install Mongo or Redis on your host — they run in Docker.

## First-time setup

```bash
git clone <repo-url> click
cd click
npm install
cp apps/server/.env.example apps/server/.env
```

Then edit `apps/server/.env` and set `BETTER_AUTH_SECRET` to a long random string:

```bash
openssl rand -hex 32
```

Paste the output as the value of `BETTER_AUTH_SECRET`. The other defaults are fine for local dev.

### `apps/server/.env` reference

| Variable             | Default                              | Notes                                     |
| -------------------- | ------------------------------------ | ----------------------------------------- |
| `NODE_ENV`           | `development`                        |                                           |
| `PORT`               | `3000`                               | Express listen port                       |
| `MONGODB_URI`        | `mongodb://localhost:27017/click`    | Points at the docker-compose Mongo        |
| `REDIS_URL`          | `redis://localhost:6379`             | Points at the docker-compose Redis        |
| `CLIENT_URL`         | `http://localhost:5173`              | Used for CORS + better-auth trusted origin|
| `BETTER_AUTH_SECRET` | _(required)_                         | Generate with `openssl rand -hex 32`      |
| `BETTER_AUTH_URL`    | `http://localhost:3000`              |                                           |

## Start the infrastructure

```bash
docker compose up -d
```

This starts two containers:

- `click-mongo` on `localhost:27017` (volume `mongo-data`)
- `click-redis` on `localhost:6379` with AOF persistence (volume `redis-data`)

Verify they're up:

```bash
docker compose ps
docker compose exec redis redis-cli ping     # -> PONG
```

## Run the app

From the project root:

```bash
npm run dev
```

This runs the server (`apps/server`, port `3000`) and the Vite dev server (`apps/client`, port `5173`) concurrently with colored output.

Open http://localhost:5173 and start clicking. The first click will log:

```
Connected to MongoDB
Connected to Redis
Server running on http://localhost:3000
```

## Useful scripts

Run from the project root:

| Command                  | What it does                                       |
| ------------------------ | -------------------------------------------------- |
| `npm run dev`            | Server + client, watch mode                        |
| `npm run dev:server`     | Server only                                        |
| `npm run dev:client`     | Client only                                        |
| `npm run build`          | Production build of both apps                      |
| `npm run typecheck`      | Type-check both apps                               |

## Project layout

```
click/
├── apps/
│   ├── client/            # React + Vite frontend
│   └── server/            # Express + better-auth API
│       └── src/
│           ├── index.ts   # routes + server bootstrap
│           ├── auth.ts    # better-auth config (Mongo adapter)
│           ├── db.ts      # MongoDB connection
│           ├── redis.ts   # Redis connection
│           └── clicks.ts  # counter logic (Redis hot path, Mongo flusher)
├── packages/
│   └── shared/            # Zod schemas + types shared by client and server
├── docker-compose.yml     # Mongo + Redis for local dev
└── package.json           # workspace root
```

## How the counter works

1. `POST /api/clicks` runs an atomic Redis pipeline: `INCRBY` on `clicks:counter:global` (and `clicks:counter:<userId>` if signed in) plus `SADD clicks:dirty <id>`. No MongoDB write on the hot path.
2. `GET /api/clicks` reads from Redis. On a cache miss it falls back to MongoDB and warms the cache.
3. A background job runs every 10s: it atomically reads each dirty counter and clears its dirty marker, then upserts the values into the `clickCounters` collection in MongoDB via a single `bulkWrite`.
4. On startup, existing MongoDB counts are hydrated into Redis (without overwriting any values Redis already has).
5. `SIGINT`/`SIGTERM` triggers one final flush before exit.

Redis is the source of truth while the server is running; MongoDB is the durable backup. Worst-case data loss is ~10 seconds of clicks if Redis dies and nothing was in the dirty set.

## Day-to-day Docker commands

```bash
docker compose logs -f redis      # tail logs
docker compose stop               # stop, keep data
docker compose start              # start again
docker compose down               # remove containers, keep volumes
docker compose down -v            # remove containers AND wipe data
```

## Troubleshooting

**`Cannot connect to the Docker daemon`** — Docker Desktop isn't running, or WSL2 integration isn't enabled for your distro (Settings → Resources → WSL Integration).

**`bind: address already in use` on 27017 or 6379** — you have a native MongoDB or Redis already running on the host. Stop it (`sudo systemctl stop mongod` / `sudo systemctl stop redis`) or change the host-side port mapping in `docker-compose.yml`.

**`Failed to connect to MongoDB` / `Failed to connect to Redis`** — containers aren't running. Check `docker compose ps`; if they're not listed, run `docker compose up -d`.

**`BETTER_AUTH_SECRET` errors at startup** — you didn't set the secret in `apps/server/.env`. Generate one with `openssl rand -hex 32`.

**Counts in Mongo look stale** — that's expected. Mongo lags Redis by up to 10 seconds (the flush interval). Live values come from `GET /api/clicks`, which reads Redis.
