#!/bin/bash

# Dog Finder App Local Setup Script
echo "🐕 Setting up Dog Finder App locally..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Backend .env file not found. Creating template..."
    cat > .env << EOF
# Petfinder API Configuration
PETFINDER_CLIENT_ID=your_petfinder_client_id_here
PETFINDER_CLIENT_SECRET=your_petfinder_client_secret_here

# Email Configuration (optional - for digest functionality)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SENDER_EMAIL=your_email@gmail.com
SENDER_NAME=Dog Digest
RECIPIENTS=your_email@gmail.com

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Search Configuration
ZIP_CODES=08401,11211,19003
DISTANCE_MILES=100
EOF
    echo "📝 Please edit backend/.env with your Petfinder API credentials"
fi

cd ..

# Frontend setup
echo "🔧 Setting up frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Check if .env.local file exists
if [ ! -f ".env.local" ]; then
    echo "Creating frontend environment file..."
    cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_BASE=http://localhost:8000
EOF
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your Petfinder API credentials"
echo "2. Start the backend: cd backend && source venv/bin/activate && uvicorn app:app --reload"
echo "3. Start the frontend: cd frontend && npm run dev"
echo "4. Visit http://localhost:3000 to see the app"
echo ""
echo "For detailed instructions, see setup-local.md"
