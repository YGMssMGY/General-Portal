param(
    [ValidateSet("dev", "demo")]
    [string]$BackendProfile = "dev",
    [switch]$WithRedis
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$BackendOut = Join-Path $BackendDir "backend.log"
$BackendErr = Join-Path $BackendDir "backend.err"
$FrontendOut = Join-Path $FrontendDir "vite.log"
$FrontendErr = Join-Path $FrontendDir "vite.err"
$EnvFile = Join-Path $Root ".env.local"

function Resolve-Command {
    param(
        [string[]]$Names,
        [string]$EnvVar,
        [string[]]$FallbackPaths
    )

    foreach ($Name in $Names) {
        $cmd = Get-Command $Name -ErrorAction SilentlyContinue
        if ($cmd) {
            return $cmd.Source
        }
    }

    if ($EnvVar) {
        $homePath = [System.Environment]::GetEnvironmentVariable($EnvVar, "Process")
        if (-not $homePath) {
            $homePath = [System.Environment]::GetEnvironmentVariable($EnvVar, "User")
        }
        if (-not $homePath) {
            $homePath = [System.Environment]::GetEnvironmentVariable($EnvVar, "Machine")
        }
        if ($homePath) {
            foreach ($Name in $Names) {
                $candidate = Join-Path $homePath "bin\$Name"
                if (Test-Path $candidate) {
                    return $candidate
                }
            }
        }
    }

    foreach ($FallbackPath in $FallbackPaths) {
        foreach ($Name in $Names) {
            $candidate = Join-Path $Root "$FallbackPath\bin\$Name"
            if (Test-Path $candidate) {
                return $candidate
            }
        }
    }

    return $null
}

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

$Maven = Resolve-Command -Names @("mvn.cmd", "mvn") -EnvVar "MAVEN_HOME" -FallbackPaths @(".tools\apache-maven-3.9.11")
if (-not $Maven) {
    throw "Maven (mvn) was not found. Set MAVEN_HOME, add Maven to PATH, or restore .tools/apache-maven-3.9.11."
}

$NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NODE_HOME" -FallbackPaths @()
if (-not $NpmCmd) {
    $NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NVM_HOME" -FallbackPaths @()
}
if (-not $NpmCmd) {
    throw "npm was not found. Install Node.js and ensure npm is on PATH, or set NODE_HOME/NVM_HOME."
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
    -FilePath $NpmCmd `
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
