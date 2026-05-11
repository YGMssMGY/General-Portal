param(
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$EnvFile = Join-Path $Root ".env.production"
$BackendOut = Join-Path $BackendDir "backend.log"
$BackendErr = Join-Path $BackendDir "backend.err"

Write-Host "[general-portal] Production Launcher" -ForegroundColor Cyan
Write-Host "[general-portal] =====================" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
    Write-Host "[general-portal] ERROR: .env.production not found. Copy .env.example and fill in production values." -ForegroundColor Red
    exit 1
}

foreach ($Line in Get-Content $EnvFile) {
    $TrimmedLine = $Line.Trim()
    if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#") -or -not $TrimmedLine.Contains("=")) { continue }
    $Name, $Value = $TrimmedLine.Split("=", 2)
    [Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
}

if ($env:GENERAL_PORTAL_DEMO_MODE -eq "true") {
    Write-Host "[general-portal] ERROR: GENERAL_PORTAL_DEMO_MODE=true is not allowed in production." -ForegroundColor Red
    exit 1
}

if ($env:MICROSOFT_CLIENT_ID -eq "demo-client-id" -or [string]::IsNullOrEmpty($env:MICROSOFT_CLIENT_ID)) {
    Write-Host "[general-portal] ERROR: MICROSOFT_CLIENT_ID is not configured for production." -ForegroundColor Red
    exit 1
}

if ($env:DEV_AUTH_PASSWORD) {
    Write-Host "[general-portal] ERROR: DEV_AUTH_PASSWORD is set — dev auth must be disabled in production." -ForegroundColor Red
    exit 1
}

$javaCmd = Get-Command "java" -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    Write-Host "[general-portal] ERROR: Java not found on PATH." -ForegroundColor Red
    exit 1
}
Write-Host "[general-portal] Java: $($javaCmd.Source)" -ForegroundColor Cyan

$mvnCmd = $null
$mvnEnv = [Environment]::GetEnvironmentVariable("MVN_CMD", "Process")
if (-not $mvnEnv) { $mvnEnv = [Environment]::GetEnvironmentVariable("MVN_CMD", "User") }
if ($mvnEnv -and (Test-Path $mvnEnv)) { $mvnCmd = $mvnEnv }
if (-not $mvnCmd) {
    $mvnCmd = Get-Command "mvn.cmd" -ErrorAction SilentlyContinue
    if (-not $mvnCmd) { $mvnCmd = Get-Command "mvn" -ErrorAction SilentlyContinue }
}
if (-not $mvnCmd) {
    $toolsDir = Join-Path $Root ".tools"
    if (Test-Path $toolsDir) {
        $mavenDirs = Get-ChildItem -Path $toolsDir -Directory -Filter "maven*" -ErrorAction SilentlyContinue
        foreach ($dir in $mavenDirs) {
            $c = Join-Path $dir.FullName "bin\mvn.cmd"
            if (Test-Path $c) { $mvnCmd = $c; break }
        }
    }
}
if (-not $mvnCmd) {
    Write-Host "[general-portal] ERROR: Maven not found." -ForegroundColor Red
    exit 1
}
Write-Host "[general-portal] Maven: $mvnCmd" -ForegroundColor Cyan

Write-Host "[general-portal] Building backend JAR..." -ForegroundColor Cyan
& $mvnCmd package -DskipTests -q -f "$BackendDir\pom.xml"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[general-portal] ERROR: Backend build failed." -ForegroundColor Red
    exit 1
}

$jar = Get-ChildItem "$BackendDir\target\*.jar" | Where-Object { $_.Name -notmatch "sources|javadoc" } | Select-Object -First 1
if (-not $jar) {
    Write-Host "[general-portal] ERROR: No JAR found in target/." -ForegroundColor Red
    exit 1
}
Write-Host "[general-portal] JAR: $($jar.Name)" -ForegroundColor Cyan

Write-Host "[general-portal] Starting backend (prod profile) on port 8080..." -ForegroundColor Cyan
$proc = Start-Process -FilePath "java" `
    -ArgumentList @("-jar", $jar.FullName, "--spring.profiles.active=default") `
    -WorkingDirectory $BackendDir -PassThru -WindowStyle Minimized
Write-Host "[general-portal] Backend PID: $($proc.Id)" -ForegroundColor Green

if (-not $SkipFrontend) {
    Write-Host "[general-portal] Building frontend..." -ForegroundColor Cyan
    $npmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
    if (-not $npmCmd) { $npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue }
    if (-not $npmCmd) {
        Write-Host "[general-portal] ERROR: npm not found." -ForegroundColor Red
        exit 1
    }

    Push-Location $FrontendDir
    & $npmCmd run build 2>&1 | Out-Null
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
Write-Host "  Backend: http://localhost:8080"
Write-Host "  Health:  http://localhost:8080/api/health"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Backend PID: $($proc.Id)"
Write-Host "  Log: $BackendOut"
