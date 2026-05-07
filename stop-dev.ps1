param(
    [switch]$Force,
    [switch]$CleanLogs
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

function Get-ListeningProcessIds {
    param([int[]]$Ports)

    $pattern = ":($($Ports -join '|'))\s"
    $processIds = @()

    foreach ($line in (netstat -ano | Select-String -Pattern $pattern)) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            $processIds += [int]$parts[4]
        }
    }

    return $processIds | Select-Object -Unique
}

$TargetProcessIds = Get-ListeningProcessIds -Ports @(5173, 8080)

if ($TargetProcessIds.Count -eq 0) {
    Write-Output "No OrgFlow frontend/backend listeners found on ports 5173 or 8080."
} else {
    foreach ($TargetProcessId in $TargetProcessIds) {
        Stop-Process -Id $TargetProcessId -Force -ErrorAction SilentlyContinue
        Write-Output "Stopped process $TargetProcessId"
    }

    if ($Force) {
        $javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "spring-boot" }
        foreach ($proc in $javaProcs) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Output "Force-stopped Java process $($proc.Id)"
        }
        $nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "vite" }
        foreach ($proc in $nodeProcs) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Output "Force-stopped Node process $($proc.Id)"
        }
    }

    Start-Sleep -Seconds 2

    $Remaining = Get-ListeningProcessIds -Ports @(5173, 8080)
    if ($Remaining.Count -gt 0) {
        Write-Warning "Some listeners are still present: $($Remaining -join ', ')"
        if (-not $Force) {
            Write-Output "Use -Force to kill child processes."
        }
        exit 1
    }
}

if ($CleanLogs) {
    @(
        (Join-Path $BackendDir "backend.log"),
        (Join-Path $BackendDir "backend.err"),
        (Join-Path $FrontendDir "vite.log"),
        (Join-Path $FrontendDir "vite.err")
    ) | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item $_ -Force -ErrorAction SilentlyContinue
            Write-Output "Removed log: $_"
        }
    }
}

Write-Output "OrgFlow frontend/backend ports are stopped."
