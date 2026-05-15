param(
    [switch]$Postgres,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root ".env.local"
$Script:BackendProc = $null
$Script:FrontendProc = $null

function Write-Status { param([string]$Msg) Write-Host "[general-portal] $Msg" -ForegroundColor Cyan }
function Write-ErrorMsg { param([string]$Msg) Write-Host "[general-portal] ERROR: $Msg" -ForegroundColor Red }
function Write-Url { param([string]$Label, [string]$Url) Write-Host "  $Label  $Url" -ForegroundColor Green }

function Test-PortOpen {
    param([int]$Port)
    foreach ($line in (netstat -ano | Select-String -Pattern ":$Port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") { return $true }
    }
    return $false
}

function Register-Cleanup {
    $null = Register-ObjectEvent -InputObject ([Console]) -EventName CancelKeyPress -Action {
        Write-Host ""
        Write-Host "[general-portal] Ctrl+C detected — stopping services..." -ForegroundColor Yellow
        if ($Script:BackendProc) {
            & taskkill /T /PID $Script:BackendProc.Id /F 2>$null
            Write-Host "[general-portal] Stopped backend (PID $($Script:BackendProc.Id))" -ForegroundColor Yellow
        }
        if ($Script:FrontendProc) {
            & taskkill /T /PID $Script:FrontendProc.Id /F 2>$null
            Write-Host "[general-portal] Stopped frontend (PID $($Script:FrontendProc.Id))" -ForegroundColor Yellow
        }
    }
}

Write-Status "General Portal Dev Launcher"
Write-Status "====================="

if (Test-Path $EnvFile) {
    foreach ($Line in Get-Content $EnvFile) {
        $TrimmedLine = $Line.Trim()
        if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#") -or -not $TrimmedLine.Contains("=")) { continue }
        $Name, $Value = $TrimmedLine.Split("=", 2)
        [Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
    }
}

$nodeVer = & node -v 2>&1
if (-not $nodeVer) {
    Write-ErrorMsg "Node.js not found. Install Node.js 18+."
    exit 1
}
Write-Status "Node.js $nodeVer"

$npmVer = & npm -v 2>&1
Write-Status "npm v$npmVer"

if ($Postgres) {
    if (Test-PortOpen -Port 5432) {
        Write-Status "PostgreSQL detected on localhost:5432"
    } else {
        Write-ErrorMsg "PostgreSQL not on localhost:5432. Start PostgreSQL or omit -Postgres for SQLite mode."
        exit 1
    }
}

if (Test-PortOpen -Port 3001) { Write-ErrorMsg "Port 3001 in use."; exit 1 }
if (Test-PortOpen -Port 5173) { Write-ErrorMsg "Port 5173 in use."; exit 1 }

Register-Cleanup

Write-Status "Starting Hono backend (port 3001)..."
$backendProc = Start-Process -FilePath "npx.cmd" `
    -ArgumentList @("tsx", "watch", "src/index.ts") `
    -WorkingDirectory (Join-Path $Root "backend") -PassThru -WindowStyle Minimized `
    -NoNewWindow:$false
$Script:BackendProc = $backendProc

Write-Status "Waiting for backend..."
$backendReady = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { $backendReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if (-not $backendReady) {
    Write-ErrorMsg "Backend did not start within 120s."
    exit 1
}
Write-Status "Backend healthy on port 3001."

if (-not $FrontendOnly) {
    Write-Status "Starting Vite frontend (port 5173)..."
    $frontendProc = Start-Process -FilePath "npx.cmd" `
        -ArgumentList @("vite") `
        -WorkingDirectory (Join-Path $Root "frontend") -PassThru -WindowStyle Minimized `
        -NoNewWindow:$false
    $Script:FrontendProc = $frontendProc
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  General Portal is starting up!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Url "Frontend:" "http://localhost:5173"
Write-Url "Backend:" "http://localhost:3001/api/health"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if (-not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
            Write-Host "[general-portal] Backend process exited." -ForegroundColor Yellow
            break
        }
    }
} finally {
    if ($Script:BackendProc) { & taskkill /T /PID $Script:BackendProc.Id /F 2>$null }
    if ($Script:FrontendProc) { & taskkill /T /PID $Script:FrontendProc.Id /F 2>$null }
    Write-Host "[general-portal] All services stopped." -ForegroundColor Yellow
}
