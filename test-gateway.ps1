$body = @{test='test'} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhtcWtzZWt4YnRpcGRuZnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQxMjkyMywiZXhwIjoyMDcxOTg4OTIzfQ.8tN_Tqjht9Egoo5fh7_Pk5rChp5BJCzBg6gRk87gjD8"
}

try {
    $response = Invoke-RestMethod -Uri "https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/gateway-test" -Method POST -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
