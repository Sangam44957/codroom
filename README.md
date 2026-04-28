# CodRoom

Full-stack technical interview platform with real-time collaboration, AI evaluation, and interview playback.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Next.js App    │────▶│  Socket.IO :3001  │────▶│    Redis    │
│  (App Router)   │     │  (Real-time)      │     │ (Pub/Sub +  │
│  :3000          │     └────────┬──────────┘     │  State)     │
└────────┬────────┘              │                └─────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│   PostgreSQL    │     │  Docker Engine   │
│  (Prisma ORM)   │     │  (Code Sandbox)  │
└─────────────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│   Groq AI API   │
│  (Evaluation)   │
└─────────────────┘
```

## Features

- **Real-time collaboration** — shared code editor, chat, whiteboard, video (WebRTC)
- **Code execution** — sandboxed Docker containers, 8 languages, 10s timeout
- **AI evaluation** — Groq LLM generates hiring recommendations and detailed reports
- **Interview playback** — full timeline replay with code evolution, events, and stats
- **Problem library** — searchable bank with tags, difficulty, company filters, and pagination
- **Interview templates** — save room presets (language, problems, rubric) for reuse
- **Analytics dashboard** — interviewing patterns, score distributions, recommendation breakdown
- **Shareable reports** — time-limited public links for candidate feedback
- **Security** — CSRF protection, JWT auth, per-socket rate limiting, focus mode

## Quick Start

**Prerequisites:** Node 18+, PostgreSQL, Docker (for code execution), Redis

```bash
# 1. Clone and install
git clone https://github.com/yourorg/codroom.git
cd codroom
npm install

# 2. Environment
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, INTERNAL_SECRET, GROQ_API_KEY at minimum

# 3. Database
npx prisma migrate deploy
npm run seed          # optional: loads sample problems

# 4. Start everything (recommended)
npm run dev:all       # Next.js :3000 + Socket.IO :3001 concurrently

# Or start separately
npm run dev           # Next.js only
npm run dev:socket    # Socket.IO only
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DIRECT_URL` | ✅ | Direct Postgres URL (for migrations; same as DATABASE_URL if no pooler) |
| `JWT_SECRET` | ✅ | 256-bit secret for auth + room ticket JWTs |
| `INTERNAL_SECRET` | ✅ | Shared secret between Next.js API and socket server |
| `GROQ_API_KEY` | ✅ | Groq API key for AI report generation |
| `BREVO_API_KEY` | ✅ | Brevo (Sendinblue) key for email verification + password reset |
| `BREVO_SENDER_EMAIL` | ✅ | From address for transactional emails |
| `REDIS_URL` | ✅ | Redis URL — required for Socket.IO pub/sub and shared room state |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL of the Next.js app (used for CSRF and invite links) |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | WebSocket server URL visible to the browser |
| `SOCKET_PORT` | — | Socket.IO port (default: `3001`) |
| `LOG_LEVEL` | — | Pino log level: `debug`, `info`, `warn`, `error` (default: `info` in prod, `debug` in dev) |
| `UPSTASH_REDIS_REST_URL` | — | Upstash REST URL — enables distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | — | Upstash REST token |
| `SENTRY_DSN` | — | Sentry DSN for error tracking |
| `METERED_API_KEY` | — | Metered.ca key for auto-rotating TURN credentials (video reliability) |
| `METERED_APP_NAME` | — | Metered.ca app subdomain |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | — | Static TURN server (alternative to Metered) |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Key Flows

### Interviewer
1. Register → verify email → log in
2. Create room — pick language, problems from library, optional template
3. Share invite link with candidate (`/room/[id]?token=...`)
4. Start interview → collaborate live (code, chat, whiteboard, video)
5. End interview → generate AI report → share report link

### Candidate
1. Open invite link → enter name → receive HttpOnly room-ticket cookie
2. Code in the shared editor, chat, use whiteboard
3. Run code against test cases at any time

## Project Structure

```
codroom/
├── server/
│   ├── socket.js          # Socket.IO server (separate Node process)
│   ├── roomStateManager.js # Redis-backed room state
│   ├── room.service.js    # DB helpers for socket server
│   ├── interview.service.js
│   └── logger.js          # CJS pino logger for socket server
├── src/
│   ├── app/
│   │   ├── api/           # Next.js App Router API routes
│   │   │   ├── auth/      # register, login, logout, me, verify-email, ...
│   │   │   ├── rooms/     # CRUD + join + messages + notes + run-tests
│   │   │   ├── interviews/# start, end, report, share, snapshots, events, playback
│   │   │   ├── problems/  # problem library CRUD
│   │   │   ├── templates/ # interview templates CRUD
│   │   │   ├── analytics/ # interviewer analytics dashboard
│   │   │   ├── execute/   # code execution (Docker sandbox)
│   │   │   ├── share/     # public report links
│   │   │   ├── health/    # DB + Redis + socket health check
│   │   │   └── turn/      # WebRTC ICE server config
│   │   ├── dashboard/     # interviewer dashboard
│   │   ├── analytics/     # analytics page
│   │   ├── problems/      # problem library page
│   │   ├── room/[roomId]/ # interview room, report, playback
│   │   └── (auth)/        # login, register, verify-email, ...
│   ├── components/
│   │   ├── editor/        # CodeEditor, OutputPanel, ProblemPanel, TestCaseRunner
│   │   ├── dashboard/     # RoomCard, CreateRoomModal
│   │   ├── ui/            # Navbar, Button, Input, ChatPanel, NotesPanel, ...
│   │   ├── video/         # VideoPanel (WebRTC/PeerJS)
│   │   └── whiteboard/    # Whiteboard (canvas)
│   ├── lib/
│   │   ├── auth.js        # JWT helpers, cookie management
│   │   ├── authz.js       # requireAuth, requireRoomOwner, withAuthz
│   │   ├── circuitBreaker.js # Circuit breaker for Groq + Docker
│   │   ├── csrf.js        # Origin/Referer CSRF check
│   │   ├── db.js          # Prisma client + slow-query logging + health check
│   │   ├── groq.js        # Groq AI evaluation (with circuit breaker)
│   │   ├── judge0.js      # Docker code execution sandbox
│   │   ├── logger.js      # Pino structured logger (ESM)
│   │   ├── rateLimit.js   # Token-bucket rate limiter (Upstash or in-memory)
│   │   └── testRunner.js  # Automated test case runner
│   ├── repositories/      # Thin Prisma wrappers (one per model)
│   ├── services/          # Business logic (auth, room, interview, problem, template)
│   ├── hooks/             # useSocket, useSecurityMonitor
│   └── constants/
│       └── languages.js   # Shared language config (Monaco IDs, extensions, templates)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.js
├── openapi.yaml           # Full API reference
└── .env.example
```

## Supported Languages

| Language | Runtime | Extension |
|---|---|---|
| JavaScript | Node 20 Alpine | `.js` |
| TypeScript | tsx (codroom-ts image) | `.ts` |
| Python | Python 3.12 Alpine | `.py` |
| Java | OpenJDK 21 | `.java` |
| C++ | GCC 13 | `.cpp` |
| C | GCC 13 | `.c` |
| Go | Go 1.22 Alpine | `.go` |
| Rust | Rust 1.77 Alpine | `.rs` |

TypeScript requires building the custom Docker image first:
```bash
docker build -t codroom-ts -f Dockerfile.sandbox .
```

## Testing

```bash
npm test                          # run all tests
npm test -- --watch               # watch mode
npm test -- roomJoin              # single file
```

Tests are in `src/__tests__/`. They use Jest with Babel for ESM transpilation and mock all external dependencies (Prisma, Next.js headers).

## API Reference

See [`openapi.yaml`](./openapi.yaml) for the full OpenAPI 3.1 spec.

Health check (no auth required):
```
GET /api/health
```
Returns DB latency, Redis status, socket server status, and circuit breaker states.

## Deployment

```bash
# Build
npm run build:all          # prisma generate + next build

# Apply migrations
npx prisma migrate deploy

# Start
node .next/standalone/server.js &
node server/socket.js &
```

**Redis** is required in production. Use Redis Cloud, Upstash, or Render Redis and set `REDIS_URL`.

**Docker** must be running on the server for code execution. The sandbox runs with `--network none`, `--memory 128m`, `--cpus 0.5`, `--read-only`, and `--cap-drop ALL`.

For production PostgreSQL with a connection pooler (PgBouncer / Supabase / Neon), set both `DATABASE_URL` (pooler) and `DIRECT_URL` (direct connection for migrations).

## Observability

- **Structured logging** — Pino JSON in production, pretty-printed in dev. Set `LOG_LEVEL` to control verbosity.
- **Slow query detection** — Prisma queries over 200ms are logged as warnings with query text and duration.
- **Error tracking** — Sentry captures uncaught exceptions in both the Next.js app and socket server.
- **Circuit breakers** — Groq AI (threshold: 3 failures, 60s reset) and Docker executor (threshold: 5 failures, 30s reset) open automatically under sustained failures and recover via half-open probing.
- **Health endpoint** — `GET /api/health` reports all service states including circuit breaker status.
