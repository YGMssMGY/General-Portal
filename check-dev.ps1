$ErrorActionPreference = "Stop"
$HasFailure = $false

function Test-Port {
    param(
        [string]$Name,
        [int]$Port,
        [bool]$Required = $true
    )

    $result = Test-NetConnection localhost -Port $Port -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
        Write-Output "OK   $Name is listening on port $Port"
        return
    }

    if ($Required) {
        Write-Output "FAIL $Name is not listening on port $Port"
        $script:HasFailure = $true
    } else {
        Write-Output "INFO $Name is not listening on port $Port"
    }
}

function Test-Http {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        Write-Output "OK   $Name responded with HTTP $($response.StatusCode)"
    } catch {
        Write-Output "FAIL $Name did not respond at $Url"
        $script:HasFailure = $true
    }
}

Test-Port -Name "PostgreSQL" -Port 5432
Test-Port -Name "Redis (optional)" -Port 6379 -Required $false
Test-Http -Name "Backend health" -Url "http://localhost:8080/api/health"
Test-Http -Name "Frontend" -Url "http://localhost:5173"

if ($HasFailure) {
    exit 1
}
