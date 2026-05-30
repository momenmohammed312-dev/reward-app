Write-Host "Installing PostgreSQL 18.4.0 and Redis 3.1.0 via Chocolatey..." -ForegroundColor Cyan
choco install postgresql --version 18.4.0 -y --no-progress 2>&1
if ($?) {
    Write-Host "PostgreSQL installed successfully" -ForegroundColor Green
} else {
    Write-Host "PostgreSQL install failed or already installed" -ForegroundColor Yellow
}
choco install redis-64 --version 3.1.0 -y --no-progress 2>&1
if ($?) {
    Write-Host "Redis installed successfully" -ForegroundColor Green
} else {
    Write-Host "Redis install failed or already installed" -ForegroundColor Yellow
}
Write-Host "Done. Press any key to exit..." -ForegroundColor Cyan
$null = Read-Host
