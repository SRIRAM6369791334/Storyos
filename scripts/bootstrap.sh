#!/usr/bin/env bash
set -e

echo "================================================================="
echo "           StoryOS Developer Environment Bootstrap               "
echo "================================================================="

# 1. Prerequisites Check
echo "[1/5] Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required but not installed. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }

NODE_VERSION=$(node -v)
echo "  - Node.js: $NODE_VERSION"
echo "  - pnpm: $(pnpm -v)"
echo "  - Docker: $(docker -v)"

# 2. Dependencies Installation
echo "[2/5] Installing workspace dependencies..."
pnpm install

# 3. Docker Infrastructure Setup
echo "[3/5] Starting local Docker Compose infrastructure stack..."
pnpm docker:up

# 4. Environment File Validation
echo "[4/5] Setting up environment variables..."
if [ ! -f .env ]; then
  echo "Creating .env from defaults..."
  cat <<EOF > .env
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
EOF
fi

# 5. Run Verification Test Suite
echo "[5/5] Running verification test suite..."
pnpm test

echo ""
echo "================================================================="
echo "✅ StoryOS Developer Environment Bootstrap Complete!"
echo "   Start development server: pnpm dev"
echo "   API Gateway:              http://localhost:3000"
echo "   Liveness Probe:           http://localhost:3000/health"
echo "   Readiness Probe:          http://localhost:3000/health/deep"
echo "================================================================="
