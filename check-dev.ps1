param(
    [ValidateSet("postgresql", "sqlite", "h2", "auto")]
    [string]$DatabaseProvider = "auto"
)

$ErrorActionPreference = "Stop"
$HasFailure = $false

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Test-Port {
    param(
        [string]$Name,
        [int]$Port,
        [bool]$Required = $true
    )

    $result = Test-NetConnection localhost -Port $Port -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Output "[OK]   $Name is listening on port $Port"
        return
    }

    if ($Required) {
        Write-Output "[FAIL] $Name is not listening on port $Port"
        $script:HasFailure = $true
    } else {
        Write-Output "[INFO] $Name is not listening on port $Port"
    }
}

function Test-Http {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        Write-Output "[OK]   $Name responded with HTTP $($response.StatusCode)"
    } catch {
        Write-Output "[FAIL] $Name did not respond at $Url"
        $script:HasFailure = $true
    }
}

function Resolve-JavaCmd {
    $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Process")
    if (-not $javaHome) { $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User") }
    if (-not $javaHome) { $javaHome = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", "Machine") }
    if ($javaHome) {
        $c = Join-Path $javaHome "bin\java.exe"
        if (Test-Path $c) { return $c }
        $c = Join-Path $javaHome "bin\java"
        if (Test-Path $c) { return $c }
    }
    $jdkHome = [System.Environment]::GetEnvironmentVariable("JDK_HOME", "Process")
    if (-not $jdkHome) { $jdkHome = [System.Environment]::GetEnvironmentVariable("JDK_HOME", "User") }
    if ($jdkHome) {
        $c = Join-Path $jdkHome "bin\java.exe"
        if (Test-Path $c) { return $c }
    }
    $c = Get-Command "java.exe" -ErrorAction SilentlyContinue
    if (-not $c) { $c = Get-Command "java" -ErrorAction SilentlyContinue }
    if ($c) { return $c.Source }
    return $null
}

$JavaCmd = Resolve-JavaCmd
if ($JavaCmd) {
    try {
        $javaOut = & $JavaCmd -version 2>&1 | Select-String "version"
        $javaVersion = $javaOut.ToString()
        Write-Output "[OK]   Java found: $javaVersion"
        if ($javaVersion -match 'version "(\d+)') {
            if ([int]$Matches[1] -lt 17) {
                Write-Output "[WARN] Java 17+ is recommended."
            }
        }
    } catch {
        Write-Output "[WARN] Java found but version could not be determined."
    }
} else {
    Write-Output "[FAIL] Java not found on PATH or JAVA_HOME."
    $script:HasFailure = $true
}

$mvnCmd = $null
$mvnEnvCmd = [System.Environment]::GetEnvironmentVariable("MVN_CMD", "Process")
if (-not $mvnEnvCmd) {
    $mvnEnvCmd = [System.Environment]::GetEnvironmentVariable("MVN_CMD", "User")
}
if ($mvnEnvCmd -and (Test-Path $mvnEnvCmd)) {
    $mvnCmd = $mvnEnvCmd
    Write-Output "[OK]   Maven found via MVN_CMD: $mvnCmd"
} else {
    $mvns = Get-Command "mvn.cmd" -ErrorAction SilentlyContinue
    if (-not $mvns) { $mvns = Get-Command "mvn" -ErrorAction SilentlyContinue }
    if ($mvns) {
        $mvnCmd = $mvns.Source
        Write-Output "[OK]   Maven found on PATH: $mvnCmd"
    } else {
        $toolsDir = Join-Path $Root ".tools"
        if (Test-Path $toolsDir) {
            $mavenDirs = Get-ChildItem -Path $toolsDir -Directory -Filter "maven*" -ErrorAction SilentlyContinue
            foreach ($dir in $mavenDirs) {
                $candidate = Join-Path $dir.FullName "bin\mvn.cmd"
                if (Test-Path $candidate) {
                    $mvnCmd = $candidate
                    Write-Output "[OK]   Maven found in tools: $mvnCmd"
                    break
                }
            }
        }
    }
}
if (-not $mvnCmd) {
    Write-Output "[WARN] Maven not found. Set MVN_CMD env var or add to PATH."
}

if ($DatabaseProvider -eq "auto") {
    $pgResult = Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue
    if ($pgResult.TcpTestSucceeded) {
        Write-Output "[INFO] Auto-detected PostgreSQL on port 5432"
        $DatabaseProvider = "postgresql"
    } else {
        Write-Output "[INFO] PostgreSQL not detected. Skipping PostgreSQL check."
        $DatabaseProvider = "sqlite"
    }
}

if ($DatabaseProvider -eq "postgresql") {
    Test-Port -Name "PostgreSQL" -Port 5432
} elseif ($DatabaseProvider -eq "sqlite") {
    Write-Output "[INFO] SQLite mode - skipping PostgreSQL port check."
} elseif ($DatabaseProvider -eq "h2") {
    Write-Output "[INFO] H2 mode - skipping PostgreSQL port check."
}

Test-Port -Name "Redis (optional)" -Port 6379 -Required $false
Test-Http -Name "Backend health" -Url "http://localhost:8080/api/health"
Test-Http -Name "Frontend" -Url "http://localhost:5173"

if ($HasFailure) {
    Write-Output ""
    Write-Output "Some checks failed. Review the [FAIL] items above."
    exit 1
}

Write-Output ""
Write-Output "All checks passed."
