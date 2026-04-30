param(
    [ValidateSet("dev", "demo")]
    [string]$BackendProfile = "dev",
    [switch]$WithRedis
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$Maven = Join-Path $Root ".tools\apache-maven-3.9.11\bin\mvn.cmd"
$BackendOut = Join-Path $BackendDir "backend.log"
$BackendErr = Join-Path $BackendDir "backend.err"
$FrontendOut = Join-Path $FrontendDir "vite.log"
$FrontendErr = Join-Path $FrontendDir "vite.err"
$EnvFile = Join-Path $Root ".env.local"

function Normalize-PathEnvironment {
    $EnvironmentVariables = [System.Environment]::GetEnvironmentVariables()
    $PathKeys = @()

    foreach ($Key in $EnvironmentVariables.Keys) {
        if ($Key -ieq "Path") {
            $PathKeys += [string]$Key
        }
    }

    if ($PathKeys.Count -le 1) {
        return
    }

    $PathValue = $null
    foreach ($Key in $PathKeys) {
        if ($Key -ceq "Path") {
            $PathValue = [string]$EnvironmentVariables[$Key]
        }
    }

    if (-not $PathValue) {
        $PathValue = [string]$EnvironmentVariables[$PathKeys[0]]
    }

    [System.Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [System.Environment]::SetEnvironmentVariable("Path", $PathValue, "Process")
}

function Test-PortOpen {
    param([int]$Port)

    foreach ($line in (netstat -ano | Select-String -Pattern ":$Port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            return $true
        }
    }

    return $false
}

Normalize-PathEnvironment

if (Test-Path $EnvFile) {
    foreach ($Line in Get-Content $EnvFile) {
        $TrimmedLine = $Line.Trim()
        if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#") -or -not $TrimmedLine.Contains("=")) {
            continue
        }

        $Name, $Value = $TrimmedLine.Split("=", 2)
        [System.Environment]::SetEnvironmentVariable($Name.Trim(), $Value.Trim(), "Process")
    }
}

if (-not (Test-Path $Maven)) {
    throw "Maven was not found at $Maven. Install Maven or restore .tools/apache-maven-3.9.11."
}

$NpmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $NpmCommand) {
    $NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $NpmCommand) {
    throw "npm was not found on PATH. Install Node.js before starting the frontend."
}

if ($BackendProfile -eq "dev" -and -not (Test-PortOpen -Port 5432)) {
    throw "PostgreSQL is not listening on localhost:5432. Install/start PostgreSQL, or run .\start-dev.ps1 -BackendProfile demo for the H2 fallback."
}

if ($WithRedis -and -not (Test-PortOpen -Port 6379)) {
    throw "Redis is not listening on localhost:6379. Start Redis, or omit -WithRedis to use the simple in-memory cache."
}

if (Test-PortOpen -Port 8080) {
    throw "Port 8080 is already in use. Run .\stop-dev.ps1 or stop the existing backend."
}

if (Test-PortOpen -Port 5173) {
    throw "Port 5173 is already in use. Run .\stop-dev.ps1 or stop the existing frontend."
}

$Profiles = $BackendProfile
if ($WithRedis) {
    $Profiles = "$BackendProfile,redis"
}

Start-Process `
    -FilePath $Maven `
    -ArgumentList @("spring-boot:run", "-Dspring-boot.run.profiles=$Profiles") `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendOut `
    -RedirectStandardError $BackendErr `
    -WindowStyle Hidden

Start-Process `
    -FilePath $NpmCommand.Source `
    -ArgumentList @("run", "dev") `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendOut `
    -RedirectStandardError $FrontendErr `
    -WindowStyle Hidden

Write-Output "Started OrgFlow with backend profiles: $Profiles"
Write-Output "Frontend: http://localhost:5173"
Write-Output "Backend health: http://localhost:8080/api/health"
Write-Output "Backend log: $BackendOut"
Write-Output "Frontend log: $FrontendOut"
