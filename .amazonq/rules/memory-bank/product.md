# CodRoom — Product Overview

## Purpose & Value Proposition

CodRoom is a full-stack technical interview platform that enables interviewers to conduct live coding sessions with candidates in a shared, real-time environment. It combines collaborative tooling, sandboxed code execution, and AI-powered evaluation to streamline the entire technical hiring workflow — from room creation to shareable candidate reports.

## Key Features & Capabilities

### Real-Time Collaboration
- Shared Monaco code editor with live sync via Socket.IO
- In-room chat panel with persistent message history
- Collaborative whiteboard (canvas-based)
- WebRTC video/audio via PeerJS

### Code Execution
- Sandboxed Docker containers per run (no network, 128MB RAM, 0.5 CPU, read-only FS)
- 8 supported languages: JavaScript, TypeScript, Python, Java, C++, C, Go, Rust
- 10-second execution timeout
- Automated test case runner against problem test cases

### AI Evaluation
- Groq LLM generates structured hiring reports (correctness, code quality, complexity, edge cases, overall score, recommendation)
- Interviewer rubric scoring (problem solving, communication, code quality, edge cases, speed)
- Custom prompt support per interview template
- Circuit breaker protects against Groq API failures

### Interview Lifecycle
- Room creation with language, problems, and optional template
- Candidate joins via time-limited invite link (HttpOnly room-ticket cookie)
- Live interview with code snapshots, event timeline, and interviewer notes
- End interview → AI report generation → shareable public report link (time-limited)

### Interview Playback
- Full timeline replay with code evolution, events, and stats

### Problem Library
- Searchable bank with tags, difficulty, company filters, and pagination
- Public and private problems; usage tracking

### Interview Templates
- Save room presets (language, problems, rubric weights, focus mode, custom AI prompt)
- Reusable across rooms and hiring pipelines

### Hiring Pipelines
- Group rooms under a named pipeline with target hire count and status (ACTIVE / PAUSED / CLOSED)

### Analytics Dashboard
- Interviewing patterns, score distributions, recommendation breakdown per interviewer

### Security
- JWT authentication (HttpOnly cookies), email verification, password reset via OTP
- CSRF protection (Origin/Referer check)
- Per-socket rate limiting (token bucket, Upstash or in-memory)
- Focus mode (candidate tab-switch detection)
- Audit logging for all sensitive actions
- Sentry error tracking

## Target Users

| Role | Use Case |
|---|---|
| Interviewer | Create rooms, set problems, conduct live sessions, review AI reports, track pipeline progress |
| Candidate | Join via invite link, write and run code, use whiteboard and chat |
| Hiring Manager | Review analytics, pipeline status, shareable candidate reports |

## Core User Flows

### Interviewer
1. Register → verify email → log in
2. Create room (language, problems, optional template/pipeline)
3. Share invite link with candidate
4. Conduct live interview (code, chat, whiteboard, video)
5. End interview → generate AI report → share report link

### Candidate
1. Open invite link → enter name → receive room-ticket cookie
2. Code in shared editor, chat, use whiteboard
3. Run code against test cases at any time
