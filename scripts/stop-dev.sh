#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "Stopping NSE Trading Intelligence processes..."

if [ -f .backend.pid ]; then
    PID=$(cat .backend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        echo "✓ Backend process $PID stopped."
    fi
    rm -f .backend.pid
fi

if [ -f .frontend.pid ]; then
    PID=$(cat .frontend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        echo "✓ Frontend process $PID stopped."
    fi
    rm -f .frontend.pid
fi

# Fallback clean-up of port 8000 listeners if owned by current user
pkill -f "uvicorn backend.app.main:app" 2>/dev/null || true

echo "All NSE Trading Intelligence platform services stopped."
