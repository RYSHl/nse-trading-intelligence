#!/usr/bin/env bash
set -e

echo "=== NSE Trading Intelligence — Local Setup ==="
echo "Checking system prerequisites..."

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed. Please install Python 3.10+ via brew or python.org"
    exit 1
fi
echo "✓ Python 3 found: $(python3 --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "Error: node is not installed. Please install Node.js 18+ via brew or nodejs.org"
    exit 1
fi
echo "✓ Node.js found: $(node -v)"

# Setup Python Virtual Environment
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment in .venv..."
    python3 -m venv .venv
fi

echo "Activating virtual environment and installing backend dependencies..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt

# Install frontend dependencies
echo "Installing frontend npm dependencies..."
npm install

# Initialize local SQLite database
echo "Initializing local database schema..."
PYTHONPATH=. python3 -c "from backend.app.database.session import Base, engine; Base.metadata.create_all(bind=engine); print('✓ Database initialized successfully.')"

echo ""
echo "=== Setup complete! ==="
echo "Run './scripts/start-dev.sh' to launch the platform."
