# CodRoom — Project Structure

## Architecture Overview

CodRoom runs as two separate Node.js processes:
- **Next.js App** (port 3000) — App Router, API routes, React UI
- **Socket.IO Server** (port 3001) — standalone Node process for real-time events

Redis connects both processes via pub/sub and shared room state. PostgreSQL (via Prisma) is the primary database.

```
Browser ──▶ Next.js :3000 ──▶ PostgreSQL (Prisma)
    │              │
    │              └──▶ Redis (rate limiting, pub/sub)
    │
    └──▶ Socket.IO :3001 ──▶ Redis (room state, pub/sub)
                   │
                   └──▶ Docker Engine (code sandbox)
                   └──▶ Groq AI API (report generation)
```

## Top-Level Directory Layout

```
codroom/
├── server/          # Standalone Socket.IO server (CJS)
├── src/             # Next.js application (ESM)
├── prisma/          # Database schema, migrations, seed
├── scripts/         # Load testing, lint report generation
├── public/          # Static assets (SVGs)
├── review-reports/  # ESLint markdown reports
└── .amazonq/        # Amazon Q rules and memory bank
```

## server/ — Socket.IO Process

| File | Responsibility |
|---|---|
| `socket.js` | Entry point; registers all Socket.IO event handlers |
| `roomStateManager.js` | Redis-backed room state (participants, code, cursor positions) |
| `room.service.js` | DB helpers used by the socket server (room lookups, updates) |
| `interview.service.js` | Interview DB helpers for socket server |
| `db.js` | Prisma client instance for the socket process (CJS) |
| `logger.js` | CJS Pino logger for the socket server |

## src/app/ — Next.js App Router

### Page Routes
| Route | Description |
|---|---|
| `/` | Landing page |
| `/(auth)/login` | Login |
| `/(auth)/register` | Registration |
| `/(auth)/verify-email` | Email verification |
| `/(auth)/forgot-password` | Password reset request |
| `/(auth)/reset-password` | Password reset form |
| `/dashboard` | Interviewer dashboard (rooms list) |
| `/analytics` | Analytics dashboard |
| `/problems` | Problem library |
| `/pipelines/[pipelineId]` | Hiring pipeline detail |
| `/room/[roomId]` | Live interview room |
| `/room/[roomId]/report` | AI report view |
| `/room/[roomId]/playback` | Interview playback |
| `/share/[token]` | Public shareable report |

### API Routes (src/app/api/)
| Prefix | Endpoints |
|---|---|
| `/api/auth/` | register, login, logout, me, verify-email, resend-verification, forgot-password, reset-password |
| `/api/rooms/` | CRUD, join, messages, notes, run-tests, from-template |
| `/api/interviews/[id]/` | start, end, report, share, snapshots, events, playback |
| `/api/problems/` | CRUD with search/filter/pagination |
| `/api/templates/` | CRUD |
| `/api/pipelines/` | CRUD |
| `/api/analytics/` | Interviewer stats |
| `/api/execute/` | Code execution (Docker sandbox) |
| `/api/share/[token]/` | Public report access |
| `/api/health/` | DB + Redis + socket health check |
| `/api/turn/` | WebRTC ICE server config |
| `/api/internal/` | Server-to-server endpoints (notify, room-owner) |
| `/api/audit/` | Audit log access |
| `/api/data-export/` | GDPR data export |
| `/api/data-deletion/` | GDPR data deletion |

## src/components/ — React Components

### editor/
- `CodeEditor.js` — Monaco editor wrapper with language support and live sync
- `OutputPanel.js` — Code execution output display
- `ProblemPanel.js` — Problem statement display with test cases
- `TestCaseRunner.js` — Runs test cases against submitted code

### dashboard/
- `RoomCard.js` — Room list item with status and actions
- `CreateRoomModal.js` — Room creation form (language, problems, template)
- `CreateTemplateModal.js` — Template creation/edit form
- `CreatePipelineModal.js` — Pipeline creation form

### ui/
- `Navbar.js` — Top navigation bar
- `Button.js`, `Input.js` — Base form components
- `ChatPanel.js` — In-room chat with message history
- `NotesPanel.js` — Interviewer private notes
- `SecurityPanel.js`, `SecurityWarning.js` — Focus mode / tab-switch alerts
- `AnimatedBackground.js` — Landing page animated gradient background
- `AnimatedCounter.js`, `TypingText.js`, `TiltCard.js` — Landing page UI effects
- `Skeleton.js` — Loading skeleton placeholders
- `ConfirmModal.js` — Generic confirmation dialog
- `Toast.js` — Toast notification wrapper (Sonner)
- `CodeEditorSim.js` — Simulated editor for landing page demo

### video/
- `VideoPanel.js` — WebRTC video/audio via PeerJS

### whiteboard/
- `Whiteboard.js` — Canvas-based collaborative whiteboard

### room/
- `RoomShortcuts.js` — Keyboard shortcut handler for the interview room

## src/lib/ — Server-Side Utilities

| File | Responsibility |
|---|---|
| `auth.js` | JWT sign/verify, cookie helpers, room ticket generation |
| `authz.js` | `requireAuth`, `requireRoomOwner`, `withAuthz` middleware wrappers |
| `csrf.js` | Origin/Referer CSRF validation |
| `db.js` | Prisma client singleton with slow-query logging (>200ms) and health check |
| `rateLimit.js` | Token-bucket rate limiter (Upstash Redis or in-memory fallback) |
| `circuitBreaker.js` | Generic circuit breaker (configurable threshold + reset window) |
| `groq.js` | Groq AI evaluation with circuit breaker |
| `judge0.js` | Docker code execution sandbox |
| `testRunner.js` | Automated test case runner |
| `email.js` | Brevo transactional email (verification, password reset) |
| `pdfReport.js` | jsPDF report generation |
| `audit.js` | Audit log writer |
| `logger.js` | Pino structured logger (ESM, pretty in dev) |
| `utils.js` | Shared utility functions |
| `validateEnv.js` | Startup environment variable validation |

## src/repositories/ — Data Access Layer

Thin Prisma wrappers, one file per model. No business logic.

| File | Model(s) |
|---|---|
| `user.repository.js` | User |
| `room.repository.js` | Room, RoomProblem, ChatMessage |
| `interview.repository.js` | Interview, CodeSnapshot, InterviewEvent, InterviewerNote, AIReport |
| `problem.repository.js` | Problem, Tag |
| `template.repository.js` | InterviewTemplate |
| `pipeline.repository.js` | HiringPipeline |

## src/services/ — Business Logic Layer

Orchestrates repositories and lib utilities. Called by API route handlers.

| File | Responsibility |
|---|---|
| `auth.service.js` | Registration, login, email verification, password reset |
| `room.service.js` | Room CRUD, join flow, template application |
| `interview.service.js` | Interview lifecycle, snapshots, events, AI report generation |
| `problem.service.js` | Problem CRUD, search, pagination |
| `template.service.js` | Template CRUD |
| `pipeline.service.js` | Pipeline CRUD, status management |

## src/hooks/ — React Hooks

| File | Responsibility |
|---|---|
| `useSocket.js` | Socket.IO client connection, event subscription, room sync |
| `useKeyboardShortcuts.js` | Global keyboard shortcut registration for the interview room |
| `useSecurityMonitor.js` | Detects tab switches and focus loss (focus mode) |

## src/constants/

- `languages.js` — Shared language config: Monaco language IDs, file extensions, Docker image names, starter code templates

## prisma/

- `schema.prisma` — Full data model (User, Room, RoomProblem, Problem, Tag, Interview, CodeSnapshot, InterviewEvent, ChatMessage, InterviewerNote, AIReport, HiringPipeline, InterviewTemplate, AuditLog)
- `migrations/` — Incremental SQL migrations (11 migrations from init to performance indexes)
- `seed.js` — Sample problem data loader

## Architectural Patterns

- **Layered architecture**: API route → Service → Repository → Prisma
- **Separation of concerns**: Socket server is fully decoupled from Next.js; communicates via Redis pub/sub and internal HTTP endpoints
- **Repository pattern**: All DB access goes through repository files; services never call Prisma directly
- **Circuit breaker**: Wraps Groq AI and Docker executor to prevent cascade failures
- **Token bucket rate limiting**: Applied per-socket and per-API-route; falls back to in-memory if Upstash is unavailable
- **Audit trail**: All sensitive mutations write to AuditLog via `src/lib/audit.js`
