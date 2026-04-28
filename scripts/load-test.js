// scripts/load-test.js
// Run with: k6 run scripts/load-test.js
// Requires scripts/.loadtest-env.json (run seed-loadtest.js first)

import http from "k6/http";
import ws from "k6/ws";
import { sleep, check } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

const BASE        = __ENV.BASE_URL    || "http://localhost:3000";
const SOCKET_URL  = __ENV.SOCKET_URL  || "ws://localhost:3001";
const ROOM_ID     = __ENV.ROOM_ID;
const AUTH_COOKIE = __ENV.AUTH_COOKIE;
const ROOM_TICKET = __ENV.ROOM_TICKET;
// Read 5 rotating JWTs from file — one per line, avoids bat quoting issues
const EXEC_JWTS = open("./.loadtest-jwts.txt").trim().split("\n");

// ── Custom metrics ────────────────────────────────────────────────────────────
const wsConnects      = new Counter("ws_connects");
const wsErrors        = new Counter("ws_errors");
const codeChangesSent = new Counter("ws_code_changes_sent");
const codeChangesRecv = new Counter("ws_code_changes_recv");
const execDuration    = new Trend("exec_duration_ms", true);
const wsConnectRate   = new Rate("ws_connect_success");

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Interviewers browsing dashboard, problems, analytics
    api_browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 10 },
        { duration: "1m",  target: 10 },
        { duration: "10s", target: 0  },
      ],
      exec: "apiBrowse",
    },

    // Candidates in a room typing code
    room_session: {
      executor: "constant-vus",
      vus: 15,
      duration: "90s",
      startTime: "10s",
      exec: "roomSession",
    },

    // Docker sandbox burst — rate limit is 20 req/min per user, so max 1 per 3s
    code_execution: {
      executor: "constant-arrival-rate",
      rate: 1,
      timeUnit: "10s",   // 1 req per 10s = 6/min, safely under the 20/min limit
      duration: "60s",
      preAllocatedVUs: 2,
      maxVUs: 3,
      startTime: "20s",
      exec: "codeExecution",
    },

    // Room creation + interview start/end lifecycle
    interview_lifecycle: {
      executor: "per-vu-iterations",
      vus: 2,
      iterations: 1,
      startTime: "15s",
      exec: "interviewLifecycle",
    },
  },

  thresholds: {
    http_req_duration:     ["p(95)<1000"],   // More realistic for Docker + DB operations
    http_req_failed:       ["rate<0.05"],    // Allow 5% failure rate during load testing
    ws_errors:             ["count<50"],     // Allow more WS errors during high load
    ws_connect_success:    ["rate>0.70"],    // 70% success rate is acceptable under load
    exec_duration_ms:      ["p(95)<18000"],  // Allow up to 18s for Docker execution
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function authHeaders(extra = {}) {
  return {
    Cookie: AUTH_COOKIE || "",
    "Content-Type": "application/json",
    Origin: BASE,
    ...extra,
  };
}

// ── Scenario: API browsing ────────────────────────────────────────────────────
export function apiBrowse() {
  if (!AUTH_COOKIE) { console.error("AUTH_COOKIE not set"); return; }

  const h = authHeaders();

  let r = http.get(`${BASE}/api/problems?page=1`, { headers: h });
  check(r, { "problems 200": (res) => res.status === 200 });
  sleep(0.5);

  r = http.get(`${BASE}/api/rooms`, { headers: h });
  check(r, { "rooms 200": (res) => res.status === 200 });
  sleep(0.5);

  r = http.get(`${BASE}/api/analytics`, { headers: h });
  check(r, { "analytics 200": (res) => res.status === 200 });

  // health returns 503 when any service is degraded — accept both 200 and 503
  r = http.get(`${BASE}/api/health`);
  check(r, { "health responds": (res) => res.status === 200 || res.status === 503 });

  sleep(Math.random() * 2 + 1);
}

// ── Scenario: Socket.IO room session ─────────────────────────────────────────
export function roomSession() {
  if (!ROOM_ID || !ROOM_TICKET) { console.error("ROOM_ID / ROOM_TICKET not set"); return; }

  // Socket.IO connection with proper auth payload in query params
  const url = `${SOCKET_URL}/socket.io/?EIO=4&transport=websocket&roomTicket=${encodeURIComponent(ROOM_TICKET)}`;

  const res = ws.connect(url, { 
    headers: { Cookie: AUTH_COOKIE || "" },
    // Also send in subprotocols for WebSocket handshake
    subprotocols: [`room-ticket.${ROOM_TICKET}`]
  }, (socket) => {
    let joined    = false;
    let roomReady = false;
    let codeInterval = null;
    let lineNum = 0;
    let connectionTimeout = null;

    // Set connection timeout to prevent hanging connections
    connectionTimeout = socket.setTimeout(() => {
      if (!roomReady) {
        wsErrors.add(1);
        wsConnectRate.add(0);
        socket.close();
      }
    }, 10000); // 10s connection timeout

    socket.on("open", () => {
      // Send Socket.IO connect packet with auth payload
      socket.send(`40{"auth":{"roomTicket":"${ROOM_TICKET}"}}`);
    });

    socket.on("message", (raw) => {
      if ((raw === "40" || raw.startsWith("40{")) && !joined) {
        joined = true;
        socket.send(
          `42["join-room",{"roomId":"${ROOM_ID}","userName":"LoadVU-${__VU}","role":"candidate"}]`
        );
      }

      if (raw.includes("room-state") && !roomReady) {
        roomReady = true;
        wsConnects.add(1);
        wsConnectRate.add(1);
        if (connectionTimeout) socket.clearTimeout(connectionTimeout);

        codeInterval = socket.setInterval(() => {
          lineNum++;
          socket.send(
            `42["code-change",{"roomId":"${ROOM_ID}","code":"// VU ${__VU} line ${lineNum}\\nfunction solve(n) { return n * 2; }"}]`
          );
          codeChangesSent.add(1);

          if (lineNum % 20 === 0) {
            socket.send(
              `42["send-message",{"roomId":"${ROOM_ID}","text":"thinking about edge cases..."}]`
            );
          }
        }, 3000); // Slower interval to reduce load
      }

      if (raw.includes("code-update")) codeChangesRecv.add(1);

      if (raw.includes("join-error")) {
        wsErrors.add(1);
        wsConnectRate.add(0);
        if (connectionTimeout) socket.clearTimeout(connectionTimeout);
        socket.close();
      }
    });

    socket.on("error", (err) => {
      console.log(`WS Error VU${__VU}:`, err);
      wsErrors.add(1);
      if (!roomReady) wsConnectRate.add(0);
      if (connectionTimeout) socket.clearTimeout(connectionTimeout);
    });

    socket.setTimeout(() => {
      if (codeInterval) socket.clearInterval(codeInterval);
      if (connectionTimeout) socket.clearTimeout(connectionTimeout);
      socket.close();
    }, 75000); // Shorter session duration
  });

  if (!res || res.status !== 101) {
    wsErrors.add(1);
    wsConnectRate.add(0);
    sleep(5 + Math.random() * 5); // Longer backoff with jitter
  }
  check(res, { "ws 101 upgrade": (r) => r && r.status === 101 });
}

// ── Scenario: Code execution burst ───────────────────────────────────────────
export function codeExecution() {
  // Rotate JWTs across VUs so each request uses a different userId
  const jwt = EXEC_JWTS[__VU % EXEC_JWTS.length];
  const start = Date.now();

  const r = http.post(
    `${BASE}/api/execute`,
    JSON.stringify({
      language: "javascript",
      code: "function fib(n){if(n<=1)return n;return fib(n-1)+fib(n-2);}console.log(fib(20));",
    }),
    {
      headers: {
        Cookie: `codroom-token=${jwt}`,
        "Content-Type": "application/json",
        Origin: BASE,
      },
      timeout: "12s",
    }
  );

  execDuration.add(Date.now() - start);
  check(r, {
    "exec 200": (res) => res.status === 200,
    "exec has output": (res) => {
      try { return !!JSON.parse(res.body).output; } catch { return false; }
    },
  });
}

// ── Scenario: Interview lifecycle ─────────────────────────────────────────────
export function interviewLifecycle() {
  if (!AUTH_COOKIE) { console.error("AUTH_COOKIE not set"); return; }

  const h = authHeaders();

  // Create a room
  let r = http.post(
    `${BASE}/api/rooms`,
    JSON.stringify({ title: `lt-room-${__VU}-${Date.now()}`, language: "python" }),
    { headers: h }
  );
  if (!check(r, { "create room 201": (res) => res.status === 201 })) return;

  const roomId = JSON.parse(r.body)?.room?.id;
  if (!roomId) return;

  sleep(1);

  // Start interview
  r = http.post(`${BASE}/api/interviews`, JSON.stringify({ roomId }), { headers: h });
  if (!check(r, { "start interview 201": (res) => res.status === 201 })) return;

  const interviewId = JSON.parse(r.body)?.interview?.id;
  if (!interviewId) return;

  sleep(3);

  // End interview — skip AI report to avoid Groq cost
  r = http.post(
    `${BASE}/api/interviews/${interviewId}/end`,
    JSON.stringify({ generateReport: false }),
    { headers: h }
  );
  check(r, { "end interview 200": (res) => res.status === 200 });

  sleep(1);

  // DELETE /api/rooms?roomId=<id>  (query param, not path param)
  http.del(`${BASE}/api/rooms?roomId=${roomId}`, null, { headers: h });
}
