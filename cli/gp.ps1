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

function Get-ErrorBody($exception) {
    try {
        $r = $exception.Response
        if ($null -eq $r) { return "" }
        if ($r.PSObject.Properties["Content"]) {
            return $r.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        }
        $stream = $r.GetResponseStream()
        if ($null -ne $stream) {
            $reader = [System.IO.StreamReader]::new($stream)
            return $reader.ReadToEnd()
        }
    } catch { return "" }
    return ""
}

try {
    if ($action -eq "list") {
        $result = Invoke-RestMethod -Uri "$base/api/ops" -Headers @{ Authorization = "Bearer $token" }
        $result.data.commands | ForEach-Object { "{0,-24} {1}" -f $_.id, $_.summary }
        exit 0
    }
    if ($action -eq "explain") {
        $body = @{ action = "ops.explain"; params = @{ action = $raw } } | ConvertTo-Json -Depth 12 -Compress
    }
    elseif ($action -eq "run") {
        $body = $raw
    }
    else {
        $params = $raw | ConvertFrom-Json -AsHashtable
        $body = @{ action = $action; params = $params } | ConvertTo-Json -Depth 12 -Compress
    }
    $response = Invoke-RestMethod -Method Post -Uri "$base/api/ops/run" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 40
    if ($response.success -eq $false -and $response.error -eq "Confirmation required") { exit 4 }
    if ($response.success -eq $false) { exit 1 }
    exit 0
}
catch {
    $exception = $_.Exception
    $status = 1
    $bodyText = ""
    if ($exception.Response) {
        $status = [int] $exception.Response.StatusCode
        $bodyText = Get-ErrorBody $exception
    }
    if ($status -eq 409) {
        if ($bodyText) {
            try { ($bodyText | ConvertFrom-Json) | ConvertTo-Json -Depth 40 } catch { Write-Host $bodyText }
        }
        Write-Host "Confirmation required: repeat the POST with confirmationToken, typedValue equal to the target slug or email, and the same idempotencyKey."
        exit 4
    }
    Write-Error ("Operator request failed (HTTP $status): " + $exception.Message)
    if ($bodyText) { Write-Host $bodyText }
    if ($status -eq 401 -or $status -eq 403) { exit 3 }
    exit $status
}
