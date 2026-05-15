param(
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$EnvFile = Join-Path $Root ".env.production"
$BackendOut = Join-Path $BackendDir "backend.log"

Write-Host "[general-portal] Production Launcher" -ForegroundColor Cyan
Write-Host "[general-portal] =====================" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
    Write-Host "[general-portal] ERROR: .env.production not found." -ForegroundColor Red
    exit 1
}

foreach ($Line in Get-Content $EnvFile) {
    $TrimmedLine = $Line.Trim()
    if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#") -or -not $TrimmedLine.Contains("=")) { continue }
    $Name, $Value = $TrimmedLine.Split("=", 2)
    [Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
}

if ($env:DEV_AUTH_PASSWORD) {
    Write-Host "[general-portal] ERROR: DEV_AUTH_PASSWORD is set — dev auth must be disabled in production." -ForegroundColor Red
    exit 1
}

$nodeVer = & node -v 2>&1
if (-not $nodeVer) {
    Write-Host "[general-portal] ERROR: Node.js not found." -ForegroundColor Red
    exit 1
}
Write-Host "[general-portal] Node.js $nodeVer" -ForegroundColor Cyan

Write-Host "[general-portal] Building backend..." -ForegroundColor Cyan
& npx.cmd --yes tsc --project "$BackendDir\tsconfig.json" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[general-portal] ERROR: Backend build failed." -ForegroundColor Red
    exit 1
}

Write-Host "[general-portal] Starting backend on port 3001..." -ForegroundColor Cyan
$proc = Start-Process -FilePath "node" `
    -ArgumentList @("dist/index.js") `
    -WorkingDirectory $BackendDir -PassThru -WindowStyle Minimized `
    -RedirectStandardOutput $BackendOut
Write-Host "[general-portal] Backend PID: $($proc.Id)" -ForegroundColor Green

if (-not $SkipFrontend) {
    Write-Host "[general-portal] Building frontend..." -ForegroundColor Cyan
    Push-Location (Join-Path $Root "frontend")
    & npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[general-portal] ERROR: Frontend build failed." -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "[general-portal] Frontend built to frontend/dist/" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  General Portal PRODUCTION started!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:3001"
Write-Host "  Health:  http://localhost:3001/api/health"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Backend PID: $($proc.Id)"
Write-Host "  Log: $BackendOut"
