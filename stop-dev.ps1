param([switch]$Force)

$ErrorActionPreference = "Stop"

Write-Host "[general-portal] Stopping services..." -ForegroundColor Cyan

$found = $false

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

$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "tsx|vite|hono"
}
foreach ($p in $nodeProcs) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Stopped Node PID $($p.Id)" -ForegroundColor Yellow
    $found = $true
}

Start-Sleep -Seconds 2

$remaining = @()
foreach ($port in @(3001, 5173)) {
    foreach ($line in (netstat -ano | Select-String -Pattern ":$port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            $remaining += "port $port (PID $($parts[4]))"
        }
    }
}

if ($remaining.Count -gt 0) {
    Write-Host "[WARN] Ports still occupied: $($remaining -join ', ')" -ForegroundColor Yellow
    exit 1
}

if (-not $found) {
    Write-Host "Nothing to stop. No General Portal processes found." -ForegroundColor Green
} else {
    Write-Host "[general-portal] All services stopped." -ForegroundColor Green
}
