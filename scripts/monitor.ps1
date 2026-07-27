# scripts/monitor.ps1
# Run this in a separate terminal while run-loadtest.bat is running:
#   powershell -ExecutionPolicy Bypass -File scripts/monitor.ps1

param(
  [string]$DbUrl = $env:DATABASE_URL,
  [int]$IntervalSec = 3
)

Write-Host "`n=== CodRoom Load Test Monitor ===" -ForegroundColor Cyan
Write-Host "Refresh every ${IntervalSec}s. Ctrl+C to stop.`n" -ForegroundColor Gray

while ($true) {
  Clear-Host
  $ts = Get-Date -Format "HH:mm:ss"
  Write-Host "[$ts] Live Metrics" -ForegroundColor Cyan
  Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

  # 1. Docker containers (sandbox pile-up check)
  $containers = docker ps --filter "name=codroom_" --format "{{.Names}}" 2>$null
  $containerCount = if ($containers) { ($containers | Measure-Object -Line).Lines } else { 0 }
  $containerColor = if ($containerCount -gt 5) { "Red" } elseif ($containerCount -gt 2) { "Yellow" } else { "Green" }
  Write-Host "Docker sandbox containers : " -NoNewline
  Write-Host $containerCount -ForegroundColor $containerColor
  if ($containerCount -gt 5) { Write-Host "  ⚠ Pile-up detected — concurrency queue needed" -ForegroundColor Red }

  # 2. Health endpoint
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 3 -ErrorAction Stop
    $healthColor = if ($health.status -eq "healthy") { "Green" } else { "Yellow" }
    Write-Host "Health status             : " -NoNewline
    Write-Host $health.status -ForegroundColor $healthColor
    Write-Host "  DB latency              : $($health.services.database.latencyMs)ms"
    Write-Host "  Redis latency           : $($health.services.redis.latencyMs)ms"
    Write-Host "  Socket healthy          : $($health.services.socketServer.healthy)"
    Write-Host "  Docker breaker          : $($health.circuitBreakers.codeExecution.state)"
    Write-Host "  Groq breaker            : $($health.circuitBreakers.groqAi.state)"
  } catch {
    Write-Host "Health endpoint           : " -NoNewline
    Write-Host "UNREACHABLE" -ForegroundColor Red
  }

  # 3. Postgres connection count
  if ($DbUrl) {
    try {
      $pgCount = & psql $DbUrl -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();" 2>$null
      $pgCount = $pgCount.Trim()
      $pgColor = if ([int]$pgCount -gt 80) { "Red" } elseif ([int]$pgCount -gt 40) { "Yellow" } else { "Green" }
      Write-Host "Postgres connections      : " -NoNewline
      Write-Host $pgCount -ForegroundColor $pgColor
      if ([int]$pgCount -gt 80) { Write-Host "  ⚠ Near limit — add PgBouncer" -ForegroundColor Red }
    } catch {
      Write-Host "Postgres connections      : psql not in PATH or DB unreachable" -ForegroundColor Gray
    }
  } else {
    Write-Host "Postgres connections      : set DATABASE_URL env var to enable" -ForegroundColor Gray
  }

  # 4. Node processes (CPU saturation check)
  $nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue
  if ($nodeProcs) {
    Write-Host "Node processes            :"
    foreach ($p in $nodeProcs) {
      $cpuColor = if ($p.CPU -gt 80) { "Red" } elseif ($p.CPU -gt 40) { "Yellow" } else { "Green" }
      Write-Host ("  PID {0,-6} CPU: " -f $p.Id) -NoNewline
      Write-Host ("{0,6:F1}%" -f $p.CPU) -ForegroundColor $cpuColor -NoNewline
      Write-Host ("  RAM: {0,6:F0} MB" -f ($p.WorkingSet64 / 1MB))
    }
  }

  # 5. Socket server
  try {
    $socket = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "Socket server             : " -NoNewline
    Write-Host "UP  uptime=$([math]::Round($socket.uptime))s" -ForegroundColor Green
  } catch {
    Write-Host "Socket server             : " -NoNewline
    Write-Host "DOWN" -ForegroundColor Red
  }

  Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
  Write-Host "Legend: " -NoNewline
  Write-Host "Green=OK  " -ForegroundColor Green -NoNewline
  Write-Host "Yellow=Warning  " -ForegroundColor Yellow -NoNewline
  Write-Host "Red=Action needed" -ForegroundColor Red

  Start-Sleep -Seconds $IntervalSec
}
