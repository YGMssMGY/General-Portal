param([switch]$Force)

$ErrorActionPreference = "Stop"

Write-Host "[orgflow] Stopping services..." -ForegroundColor Cyan

$found = $false

$javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "spring-boot|PortalApplication|orgflow"
}
foreach ($p in $javaProcs) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Stopped Java process PID $($p.Id)" -ForegroundColor Yellow
    $found = $true
}

$nodeProcs = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -match "vite|react"
}
foreach ($p in $nodeProcs) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Stopped Node process PID $($p.Id)" -ForegroundColor Yellow
    $found = $true
}

$ports = @(5173, 8080)
foreach ($port in $ports) {
    foreach ($line in (netstat -ano | Select-String -Pattern ":$port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            $procId = [int]$parts[4]
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped process PID $procId on port $port" -ForegroundColor Yellow
            $found = $true
        }
    }
}

if ($Force) {
    $allJava = Get-Process -Name "java" -ErrorAction SilentlyContinue
    foreach ($p in $allJava) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Force-stopped Java process PID $($p.Id)" -ForegroundColor Red
        $found = $true
    }
}

Start-Sleep -Seconds 2

$remaining = @()
foreach ($port in @(5173, 8080)) {
    foreach ($line in (netstat -ano | Select-String -Pattern ":$port\s")) {
        $parts = ($line.Line -split "\s+") | Where-Object { $_ -ne "" }
        if ($parts.Count -ge 5 -and $parts[3] -eq "LISTENING") {
            $remaining += "port $port (PID $($parts[4]))"
        }
    }
}

if ($remaining.Count -gt 0) {
    Write-Host "[WARN] Ports still occupied: $($remaining -join ', ')" -ForegroundColor Yellow
    Write-Host "Use -Force to kill all Java processes." -ForegroundColor Yellow
    exit 1
}

if (-not $found) {
    Write-Host "Nothing to stop. No OrgFlow processes found." -ForegroundColor Green
} else {
    Write-Host "[orgflow] All services stopped." -ForegroundColor Green
}
