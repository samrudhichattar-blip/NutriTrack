$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Write-Host "NutriTrack setup starting..." -ForegroundColor Green

$backend = Join-Path $root 'backend'
$website = Join-Path $root 'website'
$mobile = Join-Path $root 'mobile'

if (-not (Test-Path (Join-Path $backend '.env'))) {
  Copy-Item (Join-Path $backend '.env.example') (Join-Path $backend '.env')
  Write-Host "Created backend/.env from example. Add your PostgreSQL password, JWT secret and optional USDA key, then rerun setup.ps1." -ForegroundColor Yellow
  exit 1
}

Push-Location $backend
try {
  Write-Host "`n[1/4] Installing backend dependencies..." -ForegroundColor Cyan
  npm install
  Write-Host "`n[2/4] Checking backend TypeScript..." -ForegroundColor Cyan
  npm run typecheck
  Write-Host "`n[3/4] Importing original curated Indian grocery catalogue..." -ForegroundColor Cyan
  npm run import:legacy
} finally {
  Pop-Location
}

Push-Location $website
try {
  Write-Host "`n[4/4] Installing website dependencies..." -ForegroundColor Cyan
  npm install
} finally {
  Pop-Location
}

Push-Location $mobile
try {
  Write-Host "`nInstalling mobile dependencies..." -ForegroundColor Cyan
  npm install
} finally {
  Pop-Location
}

Write-Host "`nSetup completed. Start backend, website and mobile in separate terminals. See README.md." -ForegroundColor Green
