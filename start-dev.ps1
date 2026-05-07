param(
    [ValidateSet("postgres", "sqlite")]
    [string]$DatabaseProvider = "postgres",
    [ValidateSet("dev", "demo")]
    [string]$BackendProfile,
    [switch]$WithRedis,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$EnvFile = Join-Path $Root ".env.local"

$Script:BackendPid = $null
$Script:FrontendPid = $null

function Write-Status { param([string]$Msg) Write-Host "[orgflow] $Msg" -ForegroundColor Cyan }
function Write-ErrorMsg { param([string]$Msg) Write-Host "[orgflow] ERROR: $Msg" -ForegroundColor Red }
function Write-Url { param([string]$Label, [string]$Url) Write-Host "  $Label  $Url" -ForegroundColor Green }

function Resolve-Command {
    param([string[]]$Names, [string]$EnvVar, [string[]]$FallbackPaths)
    foreach ($Name in $Names) {
        $cmd = Get-Command $Name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    if ($EnvVar) {
        $homePath = [Environment]::GetEnvironmentVariable($EnvVar, "Process")
        if (-not $homePath) { $homePath = [Environment]::GetEnvironmentVariable($EnvVar, "User") }
        if (-not $homePath) { $homePath = [Environment]::GetEnvironmentVariable($EnvVar, "Machine") }
        if ($homePath) {
            foreach ($Name in $Names) {
                $candidate = Join-Path $homePath "bin\$Name"
                if (Test-Path $candidate) { return $candidate }
            }
        }
    }
    foreach ($FallbackPath in $FallbackPaths) {
        foreach ($Name in $Names) {
            $candidate = Join-Path $Root "$FallbackPath\bin\$Name"
            if (Test-Path $candidate) { return $candidate }
        }
    }
    return $null
}

function Test-PortOpen {
    param([int]$Port)
    foreach ($line in (netstat -ano | Select-String -Pattern ":$Port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") { return $true }
    }
    return $false
}

function Register-Cleanup {
    Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
        if ($Script:BackendPid) {
            Stop-Process -Id $Script:BackendPid -Force -ErrorAction SilentlyContinue
            Write-Host "[orgflow] Stopped backend (PID $Script:BackendPid)" -ForegroundColor Yellow
        }
        if ($Script:FrontendPid) {
            Stop-Process -Id $Script:FrontendPid -Force -ErrorAction SilentlyContinue
            Write-Host "[orgflow] Stopped frontend (PID $Script:FrontendPid)" -ForegroundColor Yellow
        }
    } | Out-Null
}

Write-Status "OrgFlow Dev Launcher"
Write-Status "====================="

if (Test-Path $EnvFile) {
    foreach ($Line in Get-Content $EnvFile) {
        $TrimmedLine = $Line.Trim()
        if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#") -or -not $TrimmedLine.Contains("=")) { continue }
        $Name, $Value = $TrimmedLine.Split("=", 2)
        [Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
    }
}

$JavaCmd = $null
$javaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Process")
if (-not $javaHome) { $javaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "User") }
if (-not $javaHome) { $javaHome = [Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine") }
if ($javaHome) {
    $c = Join-Path $javaHome "bin\java.exe"
    if (Test-Path $c) { $JavaCmd = $c }
    if (-not $JavaCmd) { $c = Join-Path $javaHome "bin\java"; if (Test-Path $c) { $JavaCmd = $c } }
}
if (-not $JavaCmd) {
    $c = Get-Command "java.exe" -ErrorAction SilentlyContinue
    if (-not $c) { $c = Get-Command "java" -ErrorAction SilentlyContinue }
    if ($c) { $JavaCmd = $c.Source }
}
if (-not $JavaCmd) {
    Write-ErrorMsg "Java not found. Set JAVA_HOME or add Java to PATH."
    exit 1
}
try {
    $v = & $JavaCmd -version 2>&1 | Out-String
    if ($v -match 'version "(\d+)') { Write-Status "Java $($Matches[1]) detected" }
} catch { Write-Status "Java detected (version unknown)" }

$Maven = $null
$mvnEnv = [Environment]::GetEnvironmentVariable("MVN_CMD", "Process")
if (-not $mvnEnv) { $mvnEnv = [Environment]::GetEnvironmentVariable("MVN_CMD", "User") }
if ($mvnEnv -and (Test-Path $mvnEnv)) { $Maven = $mvnEnv }
if (-not $Maven) {
    $toolsDir = Join-Path $Root ".tools"
    if (Test-Path $toolsDir) {
        $mavenDirs = Get-ChildItem -Path $toolsDir -Directory -Filter "maven*" -ErrorAction SilentlyContinue
        foreach ($dir in $mavenDirs) {
            $c = Join-Path $dir.FullName "bin\mvn.cmd"
            if (Test-Path $c) { $Maven = $c; break }
        }
    }
}
if (-not $Maven) { $Maven = Resolve-Command -Names @("mvn.cmd", "mvn") }
if (-not $Maven) {
    Write-ErrorMsg "Maven not found. Set MVN_CMD, add to PATH, or restore .tools/maven/*."
    exit 1
}
Write-Status "Maven: $Maven"

if (-not $FrontendOnly) {
    $NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NODE_HOME"
    if (-not $NpmCmd) { $NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NVM_HOME" }
    if (-not $NpmCmd) {
        Write-ErrorMsg "npm not found. Install Node.js or set NODE_HOME."
        exit 1
    }
    Write-Status "npm: $NpmCmd"
}

$Profiles = ""
if ($BackendProfile) {
    $Profiles = $BackendProfile
} else {
    switch ($DatabaseProvider) {
        "postgres" { $Profiles = "dev" }
        "sqlite"   { $Profiles = "sqlite" }
    }
}

if ($Profiles -eq "dev") {
    if (-not (Test-PortOpen -Port 5432)) {
        Write-ErrorMsg "PostgreSQL not on localhost:5432. Start PostgreSQL or use -DatabaseProvider sqlite."
        exit 1
    }
} elseif ($Profiles -eq "sqlite") {
    $dataDir = Join-Path $Root "data"
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    $dbFile = Join-Path $dataDir "orgflow.db"
    $dbRelPath = Resolve-Path $dbFile -ErrorAction SilentlyContinue
    if ($dbRelPath) { Write-Status "SQLite database: $dbRelPath" }
}

if ($WithRedis) {
    $Profiles = "$Profiles,redis"
    if (-not (Test-PortOpen -Port 6379)) {
        Write-ErrorMsg "Redis not on localhost:6379. Start Redis or omit -WithRedis."
        exit 1
    }
}

if (Test-PortOpen -Port 8080) { Write-ErrorMsg "Port 8080 in use. Run .\stop-dev.ps1 first."; exit 1 }
if (Test-PortOpen -Port 5173) { Write-ErrorMsg "Port 5173 in use. Run .\stop-dev.ps1 first."; exit 1 }

$env:SPRING_PROFILES_ACTIVE = $Profiles
Write-Status "Spring profiles: $Profiles"

Register-Cleanup

Write-Status "Starting backend on port 8080..."
$backendProc = Start-Process -FilePath $Maven `
    -ArgumentList @("spring-boot:run", "-Dspring-boot.run.profiles=$Profiles") `
    -WorkingDirectory $BackendDir -PassThru -WindowStyle Minimized
$Script:BackendPid = $backendProc.Id
Write-Status "Backend PID: $Script:BackendPid"

if (-not $FrontendOnly) {
    Write-Status "Starting frontend on port 5173..."
    $frontendProc = Start-Process -FilePath $NpmCmd `
        -ArgumentList @("run", "dev") `
        -WorkingDirectory $FrontendDir -PassThru -WindowStyle Minimized
    $Script:FrontendPid = $frontendProc.Id
    Write-Status "Frontend PID: $Script:FrontendPid"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  OrgFlow is starting up!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Url "Frontend:" "http://localhost:5173"
Write-Url "Backend:" "http://localhost:8080/api/health"
Write-Url "API Docs:" "http://localhost:8080/api-docs"
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if (-not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
            Write-Host "[orgflow] Backend process exited." -ForegroundColor Yellow
            break
        }
    }
} finally {
    if ($Script:BackendPid) { Stop-Process -Id $Script:BackendPid -Force -ErrorAction SilentlyContinue }
    if ($Script:FrontendPid) { Stop-Process -Id $Script:FrontendPid -Force -ErrorAction SilentlyContinue }
    Write-Host "[orgflow] All services stopped." -ForegroundColor Yellow
}
