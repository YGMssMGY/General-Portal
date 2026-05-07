param([switch]$Force)

$ErrorActionPreference = "Stop"
$found = $false

Write-Host "[orgflow] Stopping production services..." -ForegroundColor Cyan

$javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "orgflow|PortalApplication|portal.*\.jar"
}
foreach ($p in $javaProcs) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Stopped backend PID $($p.Id)" -ForegroundColor Yellow
    $found = $true
}

$portProcs = @()
foreach ($line in (netstat -ano | Select-String -Pattern ":8080\s")) {
    $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
        $procId = [int]$parts[4]
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped process PID $procId on port 8080" -ForegroundColor Yellow
        $found = $true
    }
}

if ($Force) {
    Get-Process -Name "java" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Force-stopped PID $($_.Id)" -ForegroundColor Red
        $found = $true
    }
}

Start-Sleep -Seconds 2

if (-not $found) {
    Write-Host "Nothing to stop. No production processes found." -ForegroundColor Green
} else {
    Write-Host "[orgflow] Production services stopped." -ForegroundColor Green
}
