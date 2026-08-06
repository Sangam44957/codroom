# CodRoom Technical Interview Questions

Based on the CodRoom real-time technical interview platform project, here are comprehensive interview questions covering architecture, implementation, and design decisions.

## System Architecture & Design

### Question 1: Real-time Collaboration Architecture
**Question:** CodRoom uses Socket.IO with Redis Pub/Sub for real-time synchronization across multiple backend servers. Explain why this architecture was chosen over alternatives like WebSocket straight to a single server or using a message queue like RabbitMQ. What specific challenges does this solve for a real-time interview platform?

**Expected Answer:**
- **Horizontal Scaling:** Socket.IO alone doesn't scale across multiple Node.js instances; Redis Pub/Sub enables broadcasting events to all connected Socket.IO servers
- **Low Latency:** Pub/Sub provides faster event distribution compared to traditional message queues for real-time use cases
- **Room-based Broadcasting:** Efficiently sends events only to users in the same interview room
- **Fault Tolerance:** If one Socket.IO server fails, others continue handling connections via shared Redis state
- **Specific Challenges Solved:**
  - Code editor synchronization (Monaco) requiring low-latency updates
  - Shared whiteboard state consistency
  - Real-time chat delivery
  - Syncing interview state (started/ended/paused) across instances
  - WebRTC signaling coordination

### Question 2: WebRTC vs Socket.IO for Media
**Question:** Why did CodRoom choose WebRTC (via PeerJS) for video/audio communication instead of routing media through Socket.IO servers? What trade-offs exist, and how were challenges like NAT traversal addressed?

**Expected Answer:**
- **Performance:** WebRTC establishes peer-to-peer connections, eliminating server bandwidth bottlenecks for media streams
- **Scalability:** Media doesn't consume server resources; only signaling uses Socket.IO/Redis
- **Quality:** Lower latency and better quality for real-time communication
- **Trade-offs:**
  - Increased complexity in connection management
  - Need for STUN/TURN servers for NAT traversal (addressed via Metered.ca or static TURN)
  - Fallback mechanisms required for restrictive networks
- **Implementation:** Uses PeerJS library to simplify WebRTC complexity, with Metered.ca for auto-rotating TURN credentials

### Question 3: State Management Strategy
**Question:** How does CodRoom manage state between the Next.js frontend, Socket.IO server, and Redis? Describe the flow when a user types in the code editor and that change needs to propagate to all participants.

**Expected Answer:**
1. **Frontend State:** React state (via useSocket hook) maintains local optimistic UI
2. **Change Capture:** Monaco editor emits onChange event
3. **Socket Event:** Frontend sends `code-change` event via Socket.IO with roomId and diff
4. **Socket.IO Server:** Receives event, validates room membership, publishes to Redis channel
5. **Redis Pub/Sub:** All Socket.IO server instances subscribe to room-specific channels
6. **Broadcast:** Other Socket.IO servers forward event to their connected clients in same room
7. **Frontend Update:** Remote clients apply diff to editor state via useSocket hook
8. **Persistence:** Periodic snapshots saved to PostgreSQL via interview.service.js for DVR

### Question 4: Security Implementation
**Question:** CodRoom implements multiple security layers including JWT HttpOnly cookies, Redis rate limiting, and fullscreen lock with tab-blur detection. Explain how each contributes to preventing cheating during technical interviews and potential bypass attempts.

**Expected Answer:**
- **JWT HttpOnly Cookies:**
  - Prevents XSS token theft (not accessible via JavaScript)
  - Contains user ID and role (interviewer/candidate)
  - Room-ticket JWT for fine-grained room access control
- **Redis Rate Limiting:**
  - Token-bucket algorithm (Upstash or in-memory)
  - Prevents brute-force attacks on auth/APIs
  - Per-socket limits for messaging/code execution to prevent spam
- **Fullscreen Lock & Tab-Blur Detection:**
  - Uses Page Visibility API and focus/blur events
  - Forces candidate into fullscreen mode on interview start
  - Logs violations and can auto-end interview if cheating detected
  - Disables devtools via overlay and keyboard shortcut blocking
- **Additional Measures:**
  - CSRF protection via origin/referer checks
  - Input sanitization to prevent XSS
  - Docker sandbox with `--network none`, `--read-only`, `--cap-drop ALL`
  - Circuit breakers for external services (Groq, Docker)

### Question 5: Code Sandbox Execution
**Question:** Describe the Docker-based sandboxed execution engine that supports 8 languages. What specific Docker run arguments are used for security and resource constraint, and how are language-specific build/execution handled?

**Expected Answer:**
- **Security Constraints:**
  - `--network none`: No external network access
  - `--memory 128m`: Memory limit
  - `--cpus 0.5`: CPU limit (half core)
  - `--read-only`: Read-only root filesystem
  - `--cap-drop ALL`: Drop all Linux capabilities
  - Temporary container per execution (removed after)
- **Language Support:**
  - Pre-built images for each language (node, python, java, etc.)
  - TypeScript requires custom `codroom-ts` image (built via `docker build -t codroom-ts -f Dockerfile.sandbox .`)
  - Language detection via file extension
  - Executor service compiles/runs based on language config (constants/languages.js)
- **Execution Flow:**
  1. Candidate submits code via `/api/rooms/[id]/execute`
  2. Next.js API validates and forwards to Socket.IO server
  3. Socket.IO validates room permissions
  4. Calls `judge0.js` service which:
     - Creates Docker container with appropriate image
     - Mounts code as read-only volume
     - Sets resource limits via Docker args
     - Runs compilation/execution commands
     - Captures stdout/stderr/exit code
  5. Results sent back via Socket.IO `execution-result` event
  6. Test cases run via `testRunner.js` service
- **Output Parsing:** `parseResult.js` normalizes output across languages

### Question 6: AI Evaluation Pipeline
**Question:** How does CodRoom leverage the Groq API for automated interview evaluation? Describe the circuit breaker pattern implementation and what specific insights the AI generates for hiring reports.

**Expected Answer:**
- **Integration:** `groq.js` service with circuit breaker (`circuitBreaker.js`)
- **Circuit Breaker:**
  - Failure threshold: 5 consecutive failures
  - Reset timeout: 120 seconds for Groq, 60 seconds for Docker
  - Half-open state: Trial requests to test recovery
  - Prevents cascading failures during service degradation
- **AI Evaluation Process:**
  1. When interview ends, collects:
     - Code snapshots (keystroke-level via interview DVR)
     - Execution results & test case performance
     - Chat interactions
     - Whiteboard activity
     - Time spent per problem
  2. Sends structured prompt to Groq API (Llama 3 70B or Mixtral)
  3. Prompt engineered to generate:
     - Technical competency scores
     - Problem-solving approach analysis
     - Code quality assessment
     - Communication skills evaluation
     - Hiring recommendation (Strong Hire/Hire/No Hire/Strong No Hire)
     - Detailed narrative report
  4. Results stored in interview record
  5. Shareable public links generated via `/api/interviews/[id]/share`

### Question 7: Database Modeling (Prisma)
**Question:** Based on the project structure and features, infer key Prisma models and their relationships for CodRoom. What fields would be essential for Room, Interview, Problem, and User models, and why?

**Expected Answer:**
- **User Model:**
  - id, email, passwordHash, name, role (interviewer/candidate)
  - emailVerified, emailVerificationToken
  - createdAt, updatedAt
  - Relations: createdRooms[], participatedInterviews[]
- **Room Model:**
  - id, title, language, status (waiting/active/ended)
  - interviewerId (User), candidateId (User, nullable until joined)
  - problemId (Problem), templateId (Template, optional)
  - startTime, endTime
  - currentCodeSnapshot, whiteboardState (JSON)
  - Relations: interviewer, candidate, problem, template, messages[], interviews[]
- **Problem Model:**
  - id, title, description, difficulty, tags[]
  - testCases[] (input/expectedOutput)
  - company, difficulty, isPublic
  - Relations: rooms[]
- **Interview Model:**
  - id, roomId, interviewerFeedback, candidateScore
  - startedAt, endedAt
  - aiReport (JSON: scores, recommendations, narrative)
  - codeSnapshots[] (for DVR: timestamp, code, cursorPos)
  - events[] (timestamp, type: code-change, test-run, etc.)
  - Relations: room, sharedVia[] (for public links)
- **Key Design Points:**
  - Denormalized code snapshots for efficient DVR replay
  - JSON fields for flexible state (whiteboard, AI report)
  - Soft deletes or archive for compliance
  - Indexes on roomId, status, createdAt for query performance

### Question 8: Interview DVR System
**Question:** Explain how CodRoom implements the interview DVR (Digital Video Recorder) system that records CodeSnapshots for full keystroke-level session replay. What data is captured, how frequently, and how is it optimized for storage and replay performance?

**Expected Answer:**
- **Data Captured per Snapshot:**
  - Timestamp (high precision)
  - Full editor state (code content)
  - Cursor position and selection
  - Optional: scroll position, viewport
- **Capture Strategy:**
  - Debounced onChange events (e.g., 500ms delay) to reduce frequency
  - Alternative: capture on significant events (focus loss, test run, etc.)
  - Minimum interval to prevent excessive storage
- **Storage Optimization:**
  - Store diffs from previous snapshot instead of full content (operational transform concept)
  - Binary encoding or compression for snapshots
  - Prisma JSON field for metadata
  - TTL policies or archival for old interviews
- **Replay Mechanism:**
  - Load snapshots in chronological order
  - Apply diffs incrementally to reconstruct editor state at any point
  - Sync with timestamped events (chat messages, test runs, whiteboard changes)
  - Variable playback speed with interpolation between snapshots
- **Implementation Clues:** `interview.service.js` likely handles snapshot creation; `src/app/api/interviews/[id]/snapshots/route.ts` endpoint

### Question 9: Rate Limiting Implementation
**Question:** CodRoom implements both traditional rate limiting and Upstash-based distributed rate limiting. Compare these approaches and explain when each is used in the system.

**Expected Answer:**
- **In-Memory Token Bucket (rateLimit.js):**
  - Used for low-traffic, single-instance protection
  - Development and testing environments
  - Simple implementation without external dependency
  - Reset on server restart
  - Used for: auth attempts, API endpoints with low volume
- **Upstash Redis Rate Limiting:**
  - Used in production for distributed systems
  - Shared state across all Socket.IO and Next.js instances
  - Survives server restarts and deployments
  - Configurable windows and limits
  - Used for:
    - Socket.IO events per connection (messaging, code execution)
    - API endpoints with high traffic (problem listing, room listing)
    - IP-based abuse prevention
  - Implementation: `rateLimit.js` detects UPSTASH_REDIS_* env vars to switch modes
- **Hybrid Approach:** Fallback to in-memory if Upstash unavailable (degraded mode)

### Question 10: Eventual Consistency & Conflict Resolution
**Question:** In a distributed system with Socket.IO servers and Redis Pub/Sub, how does CodRoom handle potential conflicts (e.g., two users editing the same line simultaneously)? What strategies are used for eventual consistency?

**Expected Answer:**
- **Conflict Prevention > Resolution:**
  - Operational Transforms (OT) or Conflict-free Replicated Data Types (CRDTs) implied for editor
  - Monaco Editor likely uses its own diff mechanism; CodRoom may send operational transforms
  - For non-editor state (whiteboard, chat): last-write-wins with vector timestamps or simple timestamps
- **Specific Mechanisms:**
  - **Code Editor:** Sends cursor-aware diffs; client-side reconciliation if conflicts detected
  - **Whiteboard:** Object-based states with unique IDs; merge by object ID + timestamp
  - **Chat:** Simple append-only with server-assigned sequence numbers per room
  - **Room State:** Critical states (started/ended) use optimistic locking with version numbers
- **Consistency Guarantees:**
  - Strong consistency for room membership and permissions (validated on Socket.IO server)
  - Eventual consistency for collaborative state (acceptable UX trade-off)
  - Conflict resolution policies documented per feature type
- **Implementation:** `roomStateManager.js` likely handles state merging and conflict detection

### Question 11: Monitoring & Observability
**Question:** What observability tools and strategies does CodRoom implement for production monitoring? How do structured logging, slow query detection, circuit breakers, and health checks work together?

**Expected Answer:**
- **Structured Logging (Pino):**
  - JSON logs in production; pretty-printed in development
  - `LOG_LEVEL` controls verbosity (debug/info/warn/error)
  - Correlation via request IDs traced across services
  - `logger.js` (Next.js) and `logger.mjs` (Socket.IO)
- **Slow Query Detection:**
  - Prisma middleware logs queries >200ms as warnings
  - Includes query text and duration
  - Helps identify missing indexes or inefficient joins
- **Circuit Breakers:**
  - Separate breakers for Groq AI (5 failures/120s reset) and Docker executor (10 failures/60s reset)
  - Half-open state probes for recovery detection
  - Status exposed via `/api/health` endpoint
  - Prevents cascading failures during external service issues
- **Health Endpoint (`/api/health`):**
  - Aggregates status: DB latency, Redis pub/sub, Socket.IO server status
  - Includes circuit breaker states (open/closed/half-open)
  - Used by load balancers and monitoring systems
  - No auth required for basic health
- **Error Tracking:**
  - Sentry integration (`@sentry/nextjs`) for both frontend and backend
  - Captures unhandled exceptions with context
  - Release tracking for deployments
- **Metrics:** Implicit via logging; could extend with Prometheus

### Question 12: Deployment & DevOps
**Question:** Describe CodRoom's deployment strategy using Docker, AWS, and GitHub Actions. What are the key considerations for deploying a real-time system with stateful components like Redis and PostgreSQL?

**Expected Answer:**
- **Containerization:**
  - Multi-stage Dockerfiles: `Dockerfile.prod` (Next.js), `Dockerfile.socket` (Socket.IO server)
  - Sandbox images built via `scripts/build-sandbox-images.sh`
  - Separate containers for: web app, Socket.IO server, AI worker
- **Orchestration Options:**
  - Docker Compose for dev/staging (files: docker-compose.dev.yml, .prod.yml, .monitoring.yml)
  - Kubernetes manifests in `k8s/` directory
  - Terraform for AWS infrastructure (`terraform/` directory)
- **CI/CD Pipeline (GitHub Actions):**
  - Testing: unit, integration, smoke, performance (k6)
  - Security scanning: npm audit + Docker scan
  - Build: Docker images pushed to registry
  - Deploy: Staging → manual approval → Production
  - Database migrations: `prisma migrate deploy` as part of deploy
- **Stateful Components Considerations:**
  - **PostgreSQL:** 
    - Managed service (AWS RDS) or self-hosted with replication
    - Connection pooling via PgBouncer (uses DIRECT_URL for migrations)
    - Backup/restore strategies (pg_dump cron job)
  - **Redis:**
    - Required for production (Redis Cloud, Upstash, or self-hosted)
    - Persistence configured (AOF or RDB snapshots)
    - Monitoring for memory usage and eviction
  - **Session Affinity:** Not needed due to Redis-backed state and JWT stateless auth
- **Zero-Downtime Deploys:**
  - Blue/green or rolling updates
  - Database backward compatibility during migrations
  - Graceful Socket.IO connection draining
- **Environment Parity:**
  - `.env.example` template
  - Same Docker images across environments
  - Feature flags via environment variables

### Question 13: Performance Optimization
**Question:** What specific techniques does CodRoom use to ensure low-latency real-time collaboration, especially for code editing and whiteboard interactions under varying network conditions?

**Expected Answer:**
- **Network Optimization:**
  - WebRTC P2P for media (eliminates server roundtrip)
  - Socket.IO with polling fallback for restrictive networks
  - Message compression via Socket.IO built-in support
- **Data Efficiency:**
  - Sending diffs/deltas instead of full state (code, whiteboard)
  - Throttling and debouncing high-frequency events (e.g., mousemove on whiteboard)
  - Binary encoding for large payloads where supported
- **Client-Side Optimizations:**
  - React.memo and useMemo for expensive computations
  - Virtualized lists for large problem sets
  - Skeleton screens during loading
  - Optimistic UI updates (immediate local feedback)
- **Server-Side Optimizations:**
  - Redis as in-memory store for active room state (vs. DB for every event)
  - Efficient event routing: only broadcast to room participants
  - Connection cleanup on disconnect (removing from rooms, clearing timers)
  - Prepared statements via Prisma for DB queries
- **Resource Management:**
  - Docker sandbox resource limits prevent noisy neighbors
  - Rate limiting prevents abuse-induced latency
  - Lazy loading of problem resources and test cases
- **Monitoring:** Health endpoint and logging identify bottlenecks

### Question 14: Testing Strategy
**Question:** CodRoom implements unit, socket-integration, and executor test suites. How does the testing approach handle the challenges of testing real-time features, external APIs (Groq, Docker), and ensuring test reliability?

**Expected Answer:**
- **Test Suite Structure (jest.config.js):**
  - **unit:** jsdom environment, tests Next.js API routes and components
  - **socket-integration:** node environment, tests Socket.IO server logic
  - **executor:** node environment, tests Docker sandbox interactions
- **Mocking Strategies:**
  - **Prisma:** Fully mocked in unit tests (`jest.mock('@prisma/client')`)
  - **Next.js Headers:** Mocked in API route tests
  - **External APIs:**
    - Groq: mocked in `groq.js` tests
    - Docker: mocked in `judge0.js` and `executor.test.js`
    - Redis: mocked or using in-memory alternatives
  - **Socket.IO:** `socket.io-client` and `@socket.io/admin-client` for simulation
- **Reliability Practices:**
  - Deterministic test data via factories/seeds
  - Timeouts for async operations
  - Cleanup hooks (`afterEach`) to reset mocks and state
  - Test isolation: no shared state between tests
  - Snapshot testing for UI components where appropriate
- **Specific Test Types:**
  - **API Routes:** Auth validation, input sanitization, error handling
  - **Socket Events:** Permission checks, broadcasting logic, state updates
  - **Executor:** Language-specific compilation/run, timeout handling, security boundary tests
  - **Integration:** Full interview flow (create room → join → code edit → run tests → end)
  - **Smoke Tests:** Critical path validation (login → create interview)
  - **Performance:** k6 load tests for concurrent users and message throughput
- **CI Integration:** `npm test` runs all suites; `npm run test:coverage` for reporting

### Question 15: Problem Library & Templates
**Question:** How does CodRoom's problem library and interview template system support reuse and customization? What fields are essential for problems and templates to support the features described (search, filtering, company tags)?

**Expected Answer:**
- **Problem Model Essentials:**
  - id, title, description, difficulty (enum: easy/medium/hard)
  - tags[] (algorithms, data structures, company-specific)
  - testCases[]: {input, expectedOutput, explanation}
  - starterCode[] (language-specific boilerplates)
  - company[] (for company-filtered search)
  - isPublic, difficulty, avgSolveTime
  - createdBy, updatedAt
  - Relations: room[], templateProblems[]
- **Template Model Essentials:**
  - id, name, description
  - defaultLanguage, duration
  - problemIds[] (ordered list)
  - evaluationRubric (JSON: weights for coding, communication, etc.)
  - isPublic, createdBy
  - Relations: rooms[], problems[]
- **Search & Filtering Features:**
  - Full-text search on title/description
  - Filter by difficulty, company, tags
  - Pagination (limit/offset) for scalability
  - Sorting by popularity, date, difficulty
  - Problem preview in modal before selection
- **Template Benefits:**
  - One-click room creation with predefined settings
  - Consistency across interviews for same role
  - Easy updates propagate to future interviews
  - Sharing templates between interviewers (team libraries)
- **Implementation:** 
  - `/api/problems/` CRUD endpoints with search/filter
  - `/api/templates/` for interview presets
  - Problem seeding via `prisma/seed.js` for demo data
  - Caching layer for frequent problem lookups (Redis)

### Question 16: Handling Network Partitions & Offline Scenarios
**Question:** How does CodRoom handle temporary network disconnections for candidates during an interview? What state is preserved, and how is recovery attempted?

**Expected Answer:**
- **Detection:** Socket.IO heartbeat/ping mechanism (engine.io)
- **Client-Side Actions:**
  - Show reconnection UI and "You're offline" banner
  - Queue local optimistic updates (code changes, chat messages)
  - Disable certain actions (test runs, submission) while disconnected
  - Preserve unsent events in IndexedDB or localStorage as fallback
- **Server-Side Actions:**
  - Mark socket as disconnected after timeout (default ~20s)
  - Preserve room state and user's last-known position
  - Do not immediately remove user (grace period for reconnection)
- **Recovery Process:**
  - Socket.IO attempts reconnection with exponential backoff
  - On reconnect:
    1. Re-authenticate via JWT cookie
    2. Rejoin room(s) with stored roomId/token
    3. Request missed events from server (via seq numbers or timestamp)
    4. Sync state: request latest code snapshot, whiteboard state
    5. Re-apply queued local events in order
- **State Preservation:**
  - Critical state (code editor) recovered via interview DVR snapshots
  - Chat: message gaps filled via history fetch
  - Whiteboard: object-based state merged upon reconnect
  - Test results: re-run if needed or cached server-side
- **Limits & Fallbacks:**
  - Maximum disconnection time (e.g., 5 minutes) before auto-pause
  - Interviewer notified of candidate connectivity issues
  - Offline mode not supported for core collaboration (requires real-time sync)
  - Emergency: interviewer can extend time or reset connection

### Question 17: Internationalization & Accessibility
**Question:** While not explicitly mentioned in the README, what considerations would be important for making CodRoom accessible and usable internationally, and how might existing architecture support or hinder these efforts?

**Expected Answer:**
- **Accessibility (a11y) Considerations:**
  - Keyboard navigation for all features (toolbar, panels, settings)
  - ARIA labels for custom components (Monaco editor wrapper, whiteboard canvas)
  - Screen reader support for chat, notifications, and status updates
  - Color contrast compliant themes (WCAG AA)
  - Focus management during modals and dialogs
  - Reduced motion preferences respect
  - Current UI (lucide-react, sonner) generally accessible but needs audit
- **Internationalization (i18n) Considerations:**
  - UI strings externalized (react-i18next or similar)
  - Right-to-left (RTL) layout support for languages like Arabic/Hebrew
  - Date/time formatting per locale
  - Problem descriptions and test cases in multiple languages
  - Current architecture supports i18n:
    - Next.js has built-in i18n routing
    - JSON-based translations feasible
    - Challenges: Embedded code comments, problem statements may need translation
- **Architecture Impact:**
  - **Supports:** 
    - Component-based UI (chakra/mantine/lucide) allows accessible primitives
    - Centralized state (Redux/Zustand or Context) could manage locale
    - API responses structured for localization
  - **Challenges:**
    - Canvas-based whiteboard requires custom a11y work
    - Real-time collaboration complexity with locale-specific formatting
    - Code syntax and keywords remain English (industry standard)
    - Third-party libraries (Monaco, PeerJS) may have limited a11l
- **Recommendations:**
  - Start with ARIA roles/labels on custom components
  - Implement language detection and preference storage
  - Use server-side locale for emails/reports (AI reports translatable)
  - Community contributions for problem translations

### Question 18: Technical Debt & Future Improvements
**Question:** Based on the code review and architecture, what are three areas of technical debt or potential improvement in CodRoom, and how would you address them?

**Expected Answer:**
- **Technical Debt 1: Tight Coupling Between Socket.IO and Business Logic**
  - *Issue:* Socket.IO server (`server/services.mjs`) directly calls Prisma and contains complex business rules
  - *Improvement:* Extract pure business logic into `src/services/` layer; Socket.IO becomes thin transport layer
  - *Benefit:* Easier testing, reusability with other transports (webhooks, etc.)
- **Technical Debt 2: Inefficient Code Snapshot Storage**
  - *Issue:* Storing full code snapshots (not deltas) for DVR consumes excessive storage
  - *Improvement:* Implement operational transform or diff-based storage with snapshot anchoring
  - *Benefit:* 10x storage reduction, faster DVR seeking
- **Technical Debt 3: Limited Granularity in Rate Limiting**
  - *Issue:* Rate limits applied per-connection or globally, not per-user-or-IP
  - *Improvement:* Implement user/IP-based limiting with RedisINCRBY and expiration
  - *Benefit:* Better abuse prevention without affecting legitimate users
- **Future Improvement 1: Adaptive Bitrate for Whiteboard**
  - *Issue:* Whiteboard strokes sent as raw JSON; inefficient for complex drawings
  - *Solution:* Implement stroke simplification algorithms or delta compression
- **Future Improvement 2: P2P Fallback for Code Sync**
  - *Issue:* All code sync goes through servers; potential bottleneck
  - *Solution:* Explore WebRTC data channels for non-critical sync (presence, cursor)
- **Future Improvement 3: On-Device Code Execution**
  - *Issue:* Docker sandbox requires host Docker access (security/complexity)
  - *Solution:* WebAssembly-based sandboxes for client-side execution (supported languages only)

### Question 19: Failure Scenario Handling
**Question:** Describe how CodRoom handles partial system failures (e.g., Redis down, PostgreSQL unavailable, Groq API failing) and what degraded functionality remains available.

**Expected Answer:**
- **Redis Failure:**
  - *Detection:* Health check fails; Socket.IO publish/subscribe errors
  - *Degraded Mode:* 
    - Fall back to in-memory Pub/Sub (single instance only)
    - Room state lost on server restart
    - Rate limiting reverts to in-memory (less effective in cluster)
    - *Available:* Basic room creation and auth (if DB up); no real-time sync across instances
  - *Recovery:* Automatic retry with backoff; alerting via health checks
- **PostgreSQL Failure:**
  - *Detection:* Prisma connection errors; health check DB latency timeout
  - *Degraded Mode:*
    - Auth fails (no user/session validation)
    - Room creation fails
    - *Available:* 
      - Existing Socket.IO connections may persist if auth cached
      - Health endpoint shows DB down
      - Circuit breakers prevent cascading failures
  - *Recovery:* 
    - Failover to read replica (if configured)
    - Alerting and manual intervention
    - Queue writes for replay after recovery
- **Groq API Failure:**
  - *Detection:* Circuit breaker trips after 5 failures
  - *Degraded Mode:*
    - AI report generation disabled
    - Interview endings show "AI evaluation unavailable" message
    - Manual interviewer feedback still works
    - *Available:* Full interview conduction, code execution, chat
  - *Recovery:* 
    - Half-open state tests recovery
    - Manual retry option in UI
    - Fallback to templated reports (basic stats)
- **Docker Host Failure:**
  - *Detection:* Executor service timeouts; health check via docker ping
  - *Degraded Mode:*
    - Code execution disabled
    - Interviewers informed that test running unavailable
    - *Available:* Code editing, chat, whiteboard, video (no execution)
  - *Recovery:* 
    - Restart Docker daemon
    - Host-level monitoring and alerts
    - Consider job queue for deferred execution
- **General Patterns:**
  - Circuit breakers prevent overwhelming failing services
  - Health endpoint provides granular status for load balancers
  - Graceful degradation prioritizes core collaboration over features
  - Explicit error states shown to users (not silent failures)
  - Logging and alerting for all failure modes

### Question 20: GDPR & Data Privacy Compliance
**Question:** How would you modify CodRoom to ensure GDPR compliance for user data, particularly regarding the interview DVR system that records keystroke-level data?

**Expected Answer:**
- **Data Minimization & Purpose Limitation:**
  - Store only necessary DVR data (code snapshots, not raw keylogging)
  - Clear purpose disclosure: "For interview evaluation and feedback only"
  - Retention policies: Auto-delete after X days unless explicitly retained
- **User Consent & Control:**
  - Explicit opt-in for DVR recording before interview starts
  - Option to disable recording (with interviewer override for compliance)
  - Access to download/delete personal DVR data
  - Anonymization option for aggregated analytics
- **Data Subject Rights Implementation:**
  - **Right to Access:** `/api/users/me/data` export (JSON: profile, interview metadata, DVR)
  - **Right to Rectification:** Allow profile edits; limited interview data correction
  - **Right to Erasure:** 
    - Soft delete user data (GDPR "right to be forgotten")
    - Purge interview recordings and personal identifiers
    - Retain only anonymized analytics
  - **Right to Portability:** Export interview data in standard format
- **Technical Implementation:**
  - Encrypt PII at rest (PostgreSQL pgcrypto, Redis encryption)
  - Tokenize identifiers where possible (DVR snapshots linked by anonymous ID)
  - Separate storage for PII vs. interview content
  - Audit logging for data access and modification
  - Data processing agreements with third parties (Groq, AWS, etc.)
- **Architecture Changes:**
  - Add `consentFlags` to User model (dvrRecording, analytics, marketing)
  - Add `retentionUntil` to Interview model
  - Implement GDPR middleware for request filtering
  - Create `/api/gdpr/` endpoints for user requests
  - Update privacy policy and terms of service
- **Special Considerations:**
  - DVR data may contain IP address or PII in code comments → require scanning/redaction
  - Backups must also be GDPR-compliant (encrypted, access-controlled)
  - Developer tooling: Ensure local dev data doesn't leak production-like PII



   Based on the CodRoom project codebase, here are the key data structures used:

  1. Primary Data Storage (PostgreSQL via Prisma ORM)

  Defined in prisma/schema.prisma, the main models include:

  - User - Authentication and profile information
  - Room - Interview rooms with status, language, and relationships
  - Problem - Coding challenge definitions with test cases and metadata
  - Tag - Tagging system for problems (many-to-many with Problem)
  - Interview - Session records linking to Room, with snapshots and events
  - InterviewEvent - Tracks actions like code execution, chat messages, etc.
  - ChatMessage - Real-time chat storage
  - AIReport - AI-generated evaluation results from Groq API
  - InterviewTemplate - Reusable interview configurations
  - HiringPipeline - Multi-stage interview workflows
  - AuditLog - Security and action logging 

  2. In-Memory Data Structures (Socket.IO Server)

  In server/roomStateManager.mjs and related files:
  - Map/Set structures - Tracking connected users per room (Map<roomId, Set<socketId>>)
  - Objects - Storing current room state (code content, cursor positions, whiteboard state)
  - Queues - Message queues for ordering events when needed
  - Counters - For rate limiting and analytics (token bucket implementation)

  3. Redis Data Structures

  Used for pub/sub and shared state:
  - Pub/Sub Channels - Real-time event broadcasting across Socket.IO instances
  - Hashes - Storing room metadata and user presence
  - Sets - Tracking active connections per room
  - Sorted Sets - For rate limiting with sliding windows
  - Strings - Caching frequently accessed data (like user sessions)

  4. Application-Level Structures

  - Debounce Timers - For optimizing code snapshot frequency
  - Operation Queues - Managing sequential code execution requests
  - Circuit Breaker States - Tracking failure counts and timeout states for external services
  - LRU Caches - For frequently accessed data like user profiles or problem definitions

  5. Frontend State (React/Next.js)

  - React State/Hooks - UI state management (useState, useReducer, useContext)
  - SWRTaking/React Query - Server state caching
  - Monaco Editor Models - Editor content and cursor position tracking
  - WebRTC Peer Connections - PeerJS connection objects for video/audio

  The architecture combines persistent relational storage for durability with in-memory and Redis structures for low-latency real-time
  collaboration, using Prisma as the ORM layer for type-safe database access.



---

### Question 21: Docker Commands & DevOps Infrastructure
**Question:** Walk through all the Docker commands used in CodRoom, what each does, and explain the full DevOps stack powering the project.

**Expected Answer:**

#### Docker Commands

**1. Building Sandbox Images (`scripts/build-sandbox-images.sh`)**
```bash
docker build -t codroom-node   -f Dockerfile.sandbox-node   .
docker build -t codroom-ts     -f Dockerfile.sandbox-ts     .
docker build -t codroom-python -f Dockerfile.sandbox-python .
docker build -t codroom-java   -f Dockerfile.sandbox-java   .
docker build -t codroom-cpp    -f Dockerfile.sandbox-cpp    .
docker build -t codroom-go     -f Dockerfile.sandbox-go     .
docker build -t codroom-rust   -f Dockerfile.sandbox-rust   .
```
- Why: Each language needs its own isolated image to safely run user-submitted code.

**2. Running Code Execution Containers (`server/executor.mjs`)**
```bash
docker run --rm \
  --network none \
  --memory 128m \
  --cpus 0.5 \
  --read-only \
  --tmpfs /tmp:size=32m \
  --cap-drop ALL \
  --no-new-privileges \
  --pids-limit 50 \
  --stop-timeout 2 \
  --ulimit nproc=50 \
  --ulimit cpu=5 \
  --memory-swap 128m \
  --name codroom_<id> \
  --volume /tmp/codroom/file.py:/sandbox/file.py:ro \
  --workdir /sandbox \
  codroom-python python file.py
```
- Why: Every user code execution spawns a fresh container with extreme security restrictions — no network, no root, no persistence, strict resource caps.

**3. Cleanup After Execution**
```bash
docker rm -f codroom_<id>
```
- Why: Force-removes the container after execution or on timeout to prevent resource leaks.

**4. Version Detection**
```bash
docker version --format {{.Server.Version}}
```
- Why: At startup, the executor checks Docker's version to know which security flags are supported (e.g., `--pids-limit` added in Docker 1.10).

**5. Docker Compose — Dev**
```bash
docker-compose -f docker-compose.dev.yml up
```
- Starts: `postgres:16-alpine` (port 5432) and `redis:7-alpine` (port 6379) with persistent volumes. App runs locally with `npm run dev`.

**6. Docker Compose — Production**
```bash
docker-compose -f docker-compose.prod.yml up
```
- Starts 4 services: Next.js app (port 3000), Socket.IO server (port 3001), postgres with health checks, redis with health checks.

**7. Docker Compose — Monitoring**
```bash
docker-compose -f docker-compose.monitoring.yml up
```
- Starts full observability stack: Prometheus (9090), Grafana (3030), node-exporter (9100), cAdvisor (8080), Alertmanager (9093), Loki (3100), Promtail.

---

#### Dockerfiles — Purpose of Each

| File | Purpose |
|---|---|
| `Dockerfile` | Dev/general — multi-stage, runs Next.js + Socket.IO together |
| `Dockerfile.prod` | Production Next.js only (node:20-alpine, standalone output) |
| `Dockerfile.socket` | Production Socket.IO server only (port 3001) |
| `Dockerfile.sandbox` | Base sandbox (node + tsx, non-root user) |
| `Dockerfile.sandbox-python` | Python 3.12 sandbox |
| `Dockerfile.sandbox-node` | Node.js 20 sandbox |
| `Dockerfile.sandbox-ts` | TypeScript sandbox (tsx runner) |
| `Dockerfile.sandbox-java` | Java 21 sandbox (eclipse-temurin) |
| `Dockerfile.sandbox-cpp` | C++ sandbox (alpine + g++) |
| `Dockerfile.sandbox-go` | Go 1.22 sandbox |
| `Dockerfile.sandbox-rust` | Rust 1.77 sandbox |

All sandbox images create a non-root `sandbox` user — code never runs as root.

---

#### CI/CD — GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy.yml` | push to `main` | Test → Build Docker images → Push to GHCR → Deploy to EC2 via SSH → Smoke test |
| `ci-cd.yml` | PR to `main` | Test → Build → Trivy security scan → Deploy staging/prod → Smoke tests |
| `ci.yml` | PRs | Runs tests only |
| `production.yml` | manual/push | Production-specific pipeline |
| `security.yml` | scheduled | Security scanning |

In CI, postgres and redis run as GitHub Actions service containers (Docker under the hood).

---

#### Infrastructure as Code

- **Terraform** (`terraform/main.tf`) — provisions AWS: VPC, subnets, RDS PostgreSQL, ElastiCache Redis, ECS cluster, ALB, ACM certs, Secrets Manager
- **Kubernetes** (`k8s/production.yaml`) — Deployments, Services, Ingress (nginx), HPA (auto-scales app 3→10 pods, socket 2→6 pods)
- **AWS ECS** (`aws-ecs-task-definition.json`) — Fargate task definition running Next.js + Socket.IO as a sidecar pair

#### Process Management
- **PM2** (`ecosystem.config.cjs`) — keeps Socket.IO server alive on EC2, with `pm2 restart` on every deploy

#### Monitoring Stack
- Prometheus + Grafana + Loki + Promtail + Alertmanager + cAdvisor + node-exporter — full metrics, logs, and alerting

---

#### Full DevOps Flow

```
Dev:     docker-compose.dev.yml (postgres + redis only)
          ↓
CI:      GitHub Actions spins up postgres/redis as service containers → runs tests
          ↓
Build:   docker build → push images to GHCR (ghcr.io)
          ↓
Deploy:  EC2 (PM2) or ECS Fargate or Kubernetes
          ↓
Runtime: docker run per code execution request (sandboxed containers)
          ↓
Monitor: Prometheus / Grafana stack
```
