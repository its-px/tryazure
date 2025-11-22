$body = @{
    phoneNumber = "306948809699"
    templateType = "booking_confirmation"
    templateData = @{
        date = "2024-12-25"
        time = "14:00"
        service = "Haircut"
        professional = "John Doe"
        location = "your_place"
        bookingId = "12345"
    }
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhtcWtzZWt4YnRpcGRuZnJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQxMjkyMywiZXhwIjoyMDcxOTg4OTIzfQ.8tN_Tqjht9Egoo5fh7_Pk5rChp5BJCzBg6gRk87gjD8"
}

try {
    $response = Invoke-RestMethod -Uri "https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/send-sms-final" -Method POST -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
