# Local Development Setup Guide

This guide will help you set up the Dog Finder app locally for testing.

## Prerequisites

- Python 3.8+ 
- Node.js 18+ and npm
- Petfinder API credentials (get them from https://www.petfinder.com/developers/)

## Backend Setup (Python FastAPI)

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create environment file
Create a `.env` file in the `backend/` directory with the following content:

```env
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
```

### 5. Run the backend server
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: http://localhost:8000

## Frontend Setup (Next.js)

### 1. Navigate to frontend directory
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create environment file
Create a `.env.local` file in the `frontend/` directory with the following content:

```env
# API Configuration
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

### 4. Run the frontend development server
```bash
npm run dev
```

The frontend will be available at: http://localhost:3000

## Testing the Setup

1. **Backend Health Check**: Visit http://localhost:8000/healthz - should return "ok"
2. **Backend API**: Visit http://localhost:8000/api/dogs - should return JSON data
3. **Frontend**: Visit http://localhost:3000 - should show the dog finder interface

## Getting Petfinder API Credentials

1. Go to https://www.petfinder.com/developers/
2. Sign up for a developer account
3. Create a new application
4. Copy your Client ID and Client Secret
5. Add them to your backend `.env` file

## Troubleshooting

### Backend Issues
- Make sure Python virtual environment is activated
- Check that all dependencies are installed: `pip list`
- Verify Petfinder credentials are correct
- Check backend logs for error messages

### Frontend Issues
- Make sure Node.js dependencies are installed: `npm list`
- Check that `NEXT_PUBLIC_API_BASE` points to the correct backend URL
- Verify the backend is running and accessible
- Check browser console for errors

### CORS Issues
- The backend is configured to allow requests from localhost:3000
- If you're using a different port, update the CORS origins in `backend/app.py`

## Development Workflow

1. Start the backend server first: `uvicorn app:app --reload`
2. Start the frontend server: `npm run dev`
3. Make changes to either codebase - they should hot-reload automatically
4. Test your changes in the browser

## Available Scripts

### Backend
- `uvicorn app:app --reload` - Run development server
- `python main.py` - Run the email digest script
- `pytest` - Run tests

### Frontend
- `npm run dev` - Run development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
