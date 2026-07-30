# StoryOS Developer Environment Bootstrap for PowerShell
$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "           StoryOS Developer Environment Bootstrap               " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Prerequisites Check
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Error "Node.js is required."; exit 1 }
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { Write-Error "pnpm is required."; exit 1 }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Error "Docker is required."; exit 1 }

Write-Host "  - Node.js: $(node -v)"
Write-Host "  - pnpm: $(pnpm -v)"
Write-Host "  - Docker: $(docker -v)"

# 2. Dependencies Installation
Write-Host "[2/5] Installing workspace dependencies..." -ForegroundColor Yellow
pnpm install

# 3. Docker Infrastructure Setup
Write-Host "[3/5] Starting local Docker Compose infrastructure stack..." -ForegroundColor Yellow
pnpm docker:up

# 4. Environment File Validation
Write-Host "[4/5] Setting up environment variables..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
  @'
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=storyos_dev
POSTGRES_USER=storyos_admin
POSTGRES_PASSWORD=storyos_dev_password
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=storyos_dev_password
REDIS_HOST=localhost
REDIS_PORT=6379
MILVUS_ADDRESS=localhost:19530
KAFKA_BROKERS=localhost:9092
'@ | Out-File -FilePath .env -Encoding utf8
}

# 5. Run Verification Test Suite
Write-Host "[5/5] Running verification test suite..." -ForegroundColor Yellow
pnpm test

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "✅ StoryOS Developer Environment Bootstrap Complete!" -ForegroundColor Green
Write-Host "   Start development server: pnpm dev" -ForegroundColor Green
Write-Host "   API Gateway:              http://localhost:3000" -ForegroundColor Green
Write-Host "   Liveness Probe:           http://localhost:3000/health" -ForegroundColor Green
Write-Host "   Readiness Probe:          http://localhost:3000/health/deep" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
