#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "=== Starting NSE Trading Intelligence Platform ==="

# Check virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Stop any previously running background instances
./scripts/stop-dev.sh > /dev/null 2>&1 || true

PORT=8001
echo "Starting FastAPI Backend on http://127.0.0.1:${PORT} ..."
PYTHONPATH=. nohup python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT > backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait for backend health check
echo "Verifying backend health..."
READY=0
for i in {1..15}; do
    if curl -s http://127.0.0.1:${PORT}/api/health | grep -q "HEALTHY"; then
        READY=1
        break
    fi
    sleep 1
done

if [ $READY -eq 1 ]; then
    echo "✓ Backend is healthy and responding at http://127.0.0.1:${PORT}"
else
    echo "Warning: Backend took longer than expected to initialize. Check backend.log for details."
fi

echo "Starting Frontend Vite Development Server..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > .frontend.pid
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "==========================================================="
echo "   NSE Algorithmic Trading Intelligence Platform Ready     "
echo "==========================================================="
echo "   Frontend Web Terminal:   http://localhost:5173"
echo "   Backend REST API:        http://localhost:${PORT}"
echo "   FastAPI Documentation:   http://localhost:${PORT}/docs"
echo "   ReDoc API Reference:     http://localhost:${PORT}/redoc"
echo "==========================================================="
echo "To stop all services, run: ./scripts/stop-dev.sh"
