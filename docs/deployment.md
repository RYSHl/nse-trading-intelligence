# Local Development & Deployment Guide

## 1. Prerequisites
- **macOS** or **Linux**
- **Python 3.10+** (tested on 3.10 and 3.11)
- **Node.js 18+** & **npm 9+**

## 2. One-Command Setup
To configure the Python virtual environment, install backend packages, install frontend npm dependencies, and initialize the SQLite database:
```bash
./scripts/setup.sh
```

## 3. Launch Development Workstation
To start both the FastAPI backend and the Vite frontend:
```bash
./scripts/start-dev.sh
```

The script will start the servers and display:
- **Frontend Dashboard:** `http://localhost:5173` (or port 3000 in AI Studio)
- **Backend API:** `http://127.0.0.1:8001`
- **Interactive Swagger Docs:** `http://127.0.0.1:8001/docs`

## 4. Stop Development Servers
To cleanly terminate processes started by the project:
```bash
./scripts/stop-dev.sh
```

## 5. Automated Tests
Run the complete test suite (indicators, strategy, risk engine, backtester, paper broker, and API):
```bash
PYTHONPATH=. pytest backend/tests -v
```

## 6. Production Build
To create a production static build of the frontend:
```bash
npm run build
```
Distributable assets are output to `dist/`.
