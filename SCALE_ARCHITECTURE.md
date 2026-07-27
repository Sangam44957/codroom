# SCALE_ARCHITECTURE

Scaling plan to reach 100k users using the current CodRoom infrastructure stack.

## Scope and Targets

This plan is based on the existing production artifacts and focuses on the AWS / Kubernetes paths already defined. It assumes a growth path from the current baseline to 100k users (registered) with a peak concurrency envelope in the low tens of thousands. Adjust the numbers once real traffic data is available.

Target service goals:
- p95 API latency: <= 300 ms for authenticated reads and <= 500 ms for writes
- Socket connect time: <= 1 s p95
- Error rate: < 0.5% for API, < 1% for sockets
- Availability: 99.9% monthly

## Current Production Footprint (from repo)

- Two primary services: Next.js app (:3000) and Socket.IO server (:3001)
- Redis for shared state / pub-sub
- Postgres for persistent data
- Optional AWS production stack (VPC, ALB, ECS, RDS, ElastiCache, Secrets Manager)
- Optional Kubernetes stack with HPA
- Monitoring stack: Prometheus + Grafana + Loki

## Scaling Strategy Overview

Scale in layers, keep app and socket services independent, and push state into Postgres and Redis. Use autoscaling for stateless services, and scale stateful services vertically first, then horizontally where needed.

Phases:
1. Phase 0 (current): baseline deployments and basic monitoring
2. Phase 1 (10k-30k users): tighten observability, add autoscaling policies, increase DB + Redis capacity
3. Phase 2 (100k users): introduce read replicas, pooled DB connections, service sharding, and stronger traffic control

## Layer-by-Layer Plan

### 1) Edge, Load Balancing, and TLS

- Keep ALB termination and host-based routing for app and socket.
- Enable HTTP/2 and long idle timeouts to support WebSocket traffic.
- Add a CDN in front of Next.js static assets (CloudFront or equivalent) when traffic grows; cache immutable assets aggressively.
- Add WAF rules for abusive traffic and bot spikes once traffic is sustained.

### 2) Next.js App Service (:3000)

Stateless service that can scale horizontally.

Actions:
- Run as a separate ECS service (or K8s Deployment) with autoscaling on CPU and memory.
- Increase replica counts over time; target 1-2 vCPU per 2-3 pods at peak until load testing gives real numbers.
- Keep connection pooling for Postgres and avoid per-request Prisma instantiation.

Phase guidance:
- Phase 1: 4-8 replicas, autoscale to 12
- Phase 2: 8-16 replicas, autoscale to 24

### 3) Socket Service (:3001)

Sockets scale independently from HTTP. Redis is the shared state layer.

Actions:
- Keep sockets separate from the app for resource isolation.
- Ensure Redis pub-sub is used for cross-instance room state.
- Scale by socket count; track connections per instance and CPU.

Phase guidance:
- Phase 1: 4-6 replicas
- Phase 2: 8-16 replicas (with per-instance socket caps)

### 4) Redis (ElastiCache / Redis)

Redis is used for socket state, pub-sub, and rate limiting.

Actions:
- Upgrade node type as memory grows; tune eviction to allkeys-lru.
- Set TTLs for room state and ephemeral data.
- Monitor memory fragmentation, hit ratio, and replication lag.

Phase guidance:
- Phase 1: upgrade to cache.t3.small or cache.m6g.large
- Phase 2: multi-shard cluster (if memory or throughput needs it)

### 5) Postgres (RDS)

Primary bottleneck at 100k scale.

Actions:
- Scale instance size early (db.t3.micro is only for dev / low load).
- Add connection pooling (PgBouncer, RDS Proxy, or a managed pooler).
- Enable read replicas for heavy read endpoints (analytics, reports, playback).
- Audit indexes on high-volume tables (messages, events, problems, rooms).
- Partition large event tables by time or room if growth accelerates.

Phase guidance:
- Phase 1: db.t3.medium or db.m6g.large, 200-500 connections via pooler
- Phase 2: db.r6g.large or higher + 1-2 read replicas

### 6) Code Execution Sandbox

Sandboxed Docker execution is CPU and IO heavy.

Actions:
- Isolate sandbox execution into a separate worker pool with strict concurrency limits.
- Apply a per-user and per-room queue to smooth spikes.
- Track execution duration, failures, and queue depth.

### 7) Background and AI Workloads

AI evaluation and report generation should not block request threads.

Actions:
- Move AI evaluations to a background worker (queue via Redis or SQS).
- Store intermediate results to Postgres and notify clients via sockets.

### 8) Observability and Alerting

Use Prometheus and Grafana dashboards to guard growth.

Add alerts for:
- API error rate and latency
- Socket disconnect rate
- Redis memory > 80%
- Postgres CPU > 70%, connection saturation
- Queue depth for sandbox and AI jobs

### 9) Load Testing and Capacity Validation

- Use existing load test scripts to validate each phase.
- Define a traffic model: number of rooms, concurrent editors, message rate, and test execution bursts.
- Re-run tests after every infra change.

## Implementation Checklist

Phase 1 (10k-30k users):
- Add ECS/K8s autoscaling policies for app and socket
- Increase RDS and Redis instance sizes
- Confirm metrics endpoints and dashboards
- Apply targeted DB indexes for hot tables

Phase 2 (100k users):
- Add read replicas + connection pooler
- Isolate sandbox execution into worker pool
- Add queue for AI/report generation
- CDN + WAF + rate-limit enforcement
- Raise socket replica limits and enforce per-instance caps

## Risks and Mitigations

- WebSocket fan-out spikes: cap per-node connections and autoscale on connection count
- Postgres connection storms: enforce pooler and connection limits
- Redis memory blow-ups: enforce TTLs and eviction policy
- Sandbox CPU spikes: isolate workers and queue

## References in Repo

- AWS ECS task definition: aws-ecs-task-definition.json
- Kubernetes production stack: k8s/production.yaml
- AWS Terraform stack: terraform/main.tf
- Production Compose: docker-compose.prod.yml
- Monitoring stack: docker-compose.monitoring.yml and monitoring/prometheus.yml
- Production guide: PRODUCTION.md
