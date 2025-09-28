$loginData = @{
    email = "admin@medicare.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Testing login API with PowerShell..."
Write-Host "Sending request to http://localhost:3002/api/auth/login"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 30

    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "Login failed!" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode -ForegroundColor Red
    Write-Host "Error Message:" $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Yellow
    }
}