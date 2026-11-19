$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "NutriTrack website/backend checks" -ForegroundColor Cyan

$backend = Join-Path $Root 'backend'
$website = Join-Path $Root 'website'

if (-not (Test-Path (Join-Path $backend '.env'))) {
  Write-Warning 'backend/.env is missing. Copy .env.example to .env and fill in your local PostgreSQL settings and JWT_SECRET.'
}

Write-Host "`n[1/4] Backend dependencies and typecheck" -ForegroundColor Yellow
Push-Location $backend
try {
  if (-not (Test-Path 'node_modules')) { npm ci }
  npm run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Backend typecheck failed.' }
  Write-Host 'Backend typecheck passed.' -ForegroundColor Green
  Write-Host "`n[2/4] Backend production build" -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
  Write-Host 'Backend build passed.' -ForegroundColor Green
} finally { Pop-Location }

Write-Host "`n[3/4] Website dependencies and production build" -ForegroundColor Yellow
Push-Location $website
try {
  if (-not (Test-Path 'node_modules')) { npm ci }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }
  Write-Host 'Website build passed.' -ForegroundColor Green
} finally { Pop-Location }

Write-Host "`n[4/4] Backend database health endpoint" -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod 'http://localhost:4000/api/health' -TimeoutSec 5
  if ($health.status -ne 'ok' -or $health.database -ne 'connected') { throw 'API responded but database is not healthy.' }
  Write-Host 'API and PostgreSQL health check passed.' -ForegroundColor Green
} catch {
  Write-Warning 'Could not verify the running API/database. Start the backend and PostgreSQL, then run this script again.'
}

Write-Host "`nBuild checks completed. Live two-account isolation still requires the acceptance test in WEBSITE_AUDIT.md." -ForegroundColor Cyan
