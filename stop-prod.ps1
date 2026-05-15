param([switch]$Force)

$ErrorActionPreference = "Stop"
$found = $false

Write-Host "[general-portal] Stopping production services..." -ForegroundColor Cyan

$ports = @(3001, 5173)
foreach ($port in $ports) {
    foreach ($line in (netstat -ano | Select-String -Pattern ":$port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            $procId = [int]$parts[4]
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped PID $procId on port $port" -ForegroundColor Yellow
            $found = $true
        }
    }
}

Start-Sleep -Seconds 2

if (-not $found) {
    Write-Host "Nothing to stop. No production processes found." -ForegroundColor Green
} else {
    Write-Host "[general-portal] Production services stopped." -ForegroundColor Green
}
