#!/bin/bash

echo "🚀 Setting up Warm Transfer Demo Application"
echo "============================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Python and Node.js are installed"

# Setup backend
echo "📦 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit backend/.env with your API keys before running the application"
fi

cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd apps/web

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file from template..."
    cp env.local.example .env.local
    echo "⚠️  Please edit apps/web/.env.local with your configuration before running the application"
fi

cd ../..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your API keys:"
echo "   - LiveKit URL, API key, and secret"
echo "   - OpenAI API key"
echo "   - Twilio credentials (optional)"
echo ""
echo "2. Edit apps/web/.env.local with your configuration:"
echo "   - LiveKit URL"
echo "   - Backend URL"
echo ""
echo "3. Run the application:"
echo "   Terminal 1: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "   Terminal 2: cd apps/web && npm run dev"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "For Docker setup, run: docker-compose up"
echo ""
echo "📚 See README.md for detailed instructions and troubleshooting"
