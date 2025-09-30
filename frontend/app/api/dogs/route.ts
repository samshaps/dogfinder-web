import { NextRequest, NextResponse } from 'next/server';

// Backend API base URL - use environment variable or default to deployed backend
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || 'https://dogfinder-web.onrender.com';

export async function GET(request: NextRequest) {
  try {
    // Get the search params from the request
    const { searchParams } = new URL(request.url);
    
    // Build the backend URL with all query parameters
    const backendUrl = new URL('/api/dogs', BACKEND_API_BASE);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    console.log('🔄 Proxying request to backend:', backendUrl.toString());

    // Forward the request to the backend
    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      console.error('❌ Backend API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Backend API error', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend API success, returning data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dogs from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
