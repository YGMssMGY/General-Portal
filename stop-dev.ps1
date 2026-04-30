$ErrorActionPreference = "Stop"

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
    exit 0
}

foreach ($TargetProcessId in $TargetProcessIds) {
    Stop-Process -Id $TargetProcessId -Force -ErrorAction SilentlyContinue
    Write-Output "Stopped process $TargetProcessId"
}

Start-Sleep -Seconds 2

$Remaining = Get-ListeningProcessIds -Ports @(5173, 8080)
if ($Remaining.Count -gt 0) {
    Write-Warning "Some listeners are still present: $($Remaining -join ', ')"
    exit 1
}

Write-Output "OrgFlow frontend/backend ports are stopped."
