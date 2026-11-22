param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $CliArgs)

$base = $env:GP_URL
$token = $env:GP_TOKEN
if (-not $base -or -not $token) {
    Write-Error "Set GP_URL and GP_TOKEN. Example: `$env:GP_URL='https://portal.example'; `$env:GP_TOKEN='<token>'"
    exit 3
}
if (-not $CliArgs -or $CliArgs.Count -eq 0) {
    Write-Error "Usage: gp <action|list|explain|run> [json]"
    exit 2
}

$action = $CliArgs[0]
$raw = if ($CliArgs.Count -gt 1) { $CliArgs[1] } else { "{}" }

try {
    if ($action -eq "list") {
        $result = Invoke-RestMethod -Uri "$base/api/ops" -Headers @{ Authorization = "Bearer $token" }
        $result.data.commands | ForEach-Object { "{0,-24} {1}" -f $_.id, $_.summary }
        exit 0
    }
    if ($action -eq "explain") {
        $result = Invoke-RestMethod -Uri "$base/api/ops" -Headers @{ Authorization = "Bearer $token" }
        $found = $result.data.commands | Where-Object { $_.id -eq $raw }
        if (-not $found) { Write-Error "Unknown action: $raw"; exit 5 }
        $found | ConvertTo-Json -Depth 20
        exit 0
    }
    if ($action -eq "run") {
        $body = $raw
    }
    else {
        $params = $raw | ConvertFrom-Json -AsHashtable
        $body = @{ action = $action; params = $params } | ConvertTo-Json -Depth 12 -Compress
    }
    $response = Invoke-RestMethod -Method Post -Uri "$base/api/ops/run" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 30
    if ($response.success -eq $false -and $response.error -eq "Confirmation required") { exit 4 }
    if ($response.success -eq $false) { exit 1 }
    exit 0
}
catch {
    $status = 1
    if ($_.Exception.Response) { $status = [int] $_.Exception.Response.StatusCode }
    Write-Error ("Operator request failed (HTTP $status): " + $_.Exception.Message)
    if ($status -eq 401 -or $status -eq 403) { exit 3 }
    exit $status
}
