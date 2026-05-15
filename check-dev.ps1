$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  General Portal Health Check" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host ("{0,-20} {1,-16} {2}" -f "Service", "Status", "Details") -ForegroundColor Cyan
Write-Host ("{0,-20} {1,-16} {2}" -f "-------", "------", "-------")

function Write-Row {
    param([string]$Service, [string]$Status, [string]$Details)
    $color = if ($Status -eq "Running") { "Green" } elseif ($Status -eq "Not Running") { "Red" } else { "Yellow" }
    Write-Host ("{0,-20} {1,-16} {2}" -f $Service, $Status, $Details) -ForegroundColor $color
}

try {
    $nodeOut = & node --version 2>&1
    Write-Row -Service "Node.js" -Status "Running" -Details $nodeOut.Trim()
} catch {
    Write-Row -Service "Node.js" -Status "Not Running" -Details "Install Node.js 18+"
}

$pg = Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue
if ($pg.TcpTestSucceeded) {
    Write-Row -Service "PostgreSQL" -Status "Running" -Details "localhost:5432"
} else {
    Write-Row -Service "PostgreSQL" -Status "Not Running" -Details "optional, needed for prod"
}

$redis = Test-NetConnection localhost -Port 6379 -WarningAction SilentlyContinue
if ($redis.TcpTestSucceeded) {
    Write-Row -Service "Redis" -Status "Running" -Details "localhost:6379 (optional)"
} else {
    Write-Row -Service "Redis" -Status "Not Running" -Details "optional"
}

try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 3
    Write-Row -Service "Backend (Hono)" -Status "Running" -Details "HTTP $($backend.StatusCode) :3001"
} catch {
    Write-Row -Service "Backend (Hono)" -Status "Not Running" -Details "http://localhost:3001"
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 3
    Write-Row -Service "Frontend (Vite)" -Status "Running" -Details "HTTP $($frontend.StatusCode) :5173"
} catch {
    Write-Row -Service "Frontend (Vite)" -Status "Not Running" -Details "http://localhost:5173"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
