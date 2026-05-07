param(
    [ValidateSet("postgresql", "sqlite", "h2")]
    [string]$DatabaseProvider = "postgresql",
    [ValidateSet("dev", "demo")]
    [string]$BackendProfile,
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

function Resolve-Java {
    $javaCmd = $null

    $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Process")
    if (-not $javaHome) { $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User") }
    if (-not $javaHome) { $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine") }
    if ($javaHome) {
        $candidate = Join-Path $javaHome "bin\java.exe"
        if (Test-Path $candidate) { $javaCmd = $candidate }
        if (-not $javaCmd) {
            $candidate = Join-Path $javaHome "bin\java"
            if (Test-Path $candidate) { $javaCmd = $candidate }
        }
    }

    if (-not $javaCmd) {
        $jdkHome = [System.Environment]::GetEnvironmentVariable("JDK_HOME", "Process")
        if (-not $jdkHome) { $jdkHome = [System.Environment]::GetEnvironmentVariable("JDK_HOME", "User") }
        if ($jdkHome) {
            $candidate = Join-Path $jdkHome "bin\java.exe"
            if (Test-Path $candidate) { $javaCmd = $candidate }
        }
    }

    if (-not $javaCmd) {
        $fromPath = Get-Command "java.exe" -ErrorAction SilentlyContinue
        if (-not $fromPath) { $fromPath = Get-Command "java" -ErrorAction SilentlyContinue }
        if ($fromPath) { $javaCmd = $fromPath.Source }
    }

    return $javaCmd
}

function Test-JavaVersion {
    param([string]$JavaCmd)

    try {
        $output = & $JavaCmd -version 2>&1 | Out-String
        Write-Output "[OK]   Java: $($output -split "`n" | Select-Object -First 1)"
        if ($output -match 'version "(\d+)') {
            $major = [int]$Matches[1]
            if ($major -lt 17) {
                Write-Warning "[WARN] Java 17+ is recommended. Detected Java $major."
            }
        }
        return $true
    } catch {
        return $false
    }
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

$JavaCmd = Resolve-Java
if (-not $JavaCmd) {
    throw "Java was not found. Set JAVA_HOME, add Java to PATH, or install Java 17+ (https://adoptium.net)."
}
$null = Test-JavaVersion -JavaCmd $JavaCmd

$Maven = $null
$mvnEnvCmd = [System.Environment]::GetEnvironmentVariable("MVN_CMD", "Process")
if (-not $mvnEnvCmd) {
    $mvnEnvCmd = [System.Environment]::GetEnvironmentVariable("MVN_CMD", "User")
}
if ($mvnEnvCmd -and (Test-Path $mvnEnvCmd)) {
    $Maven = $mvnEnvCmd
}

if (-not $Maven) {
    $toolsDir = Join-Path $Root ".tools"
    if (Test-Path $toolsDir) {
        $mavenDirs = Get-ChildItem -Path $toolsDir -Directory -Filter "maven*" -ErrorAction SilentlyContinue
        foreach ($dir in $mavenDirs) {
            $candidate = Join-Path $dir.FullName "bin\mvn.cmd"
            if (Test-Path $candidate) {
                $Maven = $candidate
                break
            }
        }
    }
}

if (-not $Maven) {
    $Maven = Resolve-Command -Names @("mvn.cmd", "mvn")
}

if (-not $Maven) {
    throw "Maven (mvn) was not found. Set MVN_CMD env var, add Maven to PATH, or restore .tools/maven/*."
}

$NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NODE_HOME" -FallbackPaths @()
if (-not $NpmCmd) {
    $NpmCmd = Resolve-Command -Names @("npm.cmd", "npm") -EnvVar "NVM_HOME" -FallbackPaths @()
}
if (-not $NpmCmd) {
    throw "npm was not found. Install Node.js and ensure npm is on PATH, or set NODE_HOME/NVM_HOME."
}

$Profiles = ""
if ($BackendProfile) {
    $Profiles = $BackendProfile
} else {
    switch ($DatabaseProvider) {
        "postgresql" { $Profiles = "dev" }
        "sqlite"     { $Profiles = "sqlite" }
        "h2"         { $Profiles = "demo" }
    }
}

if ($Profiles -eq "dev") {
    if (-not (Test-PortOpen -Port 5432)) {
        throw "PostgreSQL is not listening on localhost:5432. Install/start PostgreSQL, or use -DatabaseProvider sqlite or -DatabaseProvider h2."
    }
} elseif ($Profiles -eq "sqlite") {
    $dataDir = Join-Path $BackendDir "data"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }
}

if ($WithRedis) {
    $Profiles = "$Profiles,redis"
    if (-not (Test-PortOpen -Port 6379)) {
        throw "Redis is not listening on localhost:6379. Start Redis, or omit -WithRedis."
    }
}

if (Test-PortOpen -Port 8080) {
    throw "Port 8080 is already in use. Run .\stop-dev.ps1 or stop the existing backend."
}

if (Test-PortOpen -Port 5173) {
    throw "Port 5173 is already in use. Run .\stop-dev.ps1 or stop the existing frontend."
}

try {
    $nodeVersion = & node --version 2>&1
    $nodeMajor = [int]($nodeVersion -replace "v", "").Split(".")[0]
    if ($nodeMajor -lt 16) {
        Write-Warning "[WARN] Node.js 16+ is recommended. Detected: $nodeVersion"
    }
} catch {
    throw "Node.js was not found on PATH. Install Node.js (https://nodejs.org)."
}

Write-Output "Database provider: $DatabaseProvider -> Spring profile: $Profiles"
Write-Output "Maven: $Maven"
Write-Output "npm: $NpmCmd"

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
