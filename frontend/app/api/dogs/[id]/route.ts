import { NextRequest, NextResponse } from 'next/server';

// Backend API base URL - use environment variable or default to deployed backend
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || 'https://dogfinder-web.onrender.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Build the backend URL for the specific dog
    const backendUrl = `${BACKEND_API_BASE}/api/dogs/${id}`;

    console.log('🔄 Proxying dog request to backend:', backendUrl);

    // Forward the request to the backend
    const response = await fetch(backendUrl, {
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
    console.log('✅ Backend API success, returning dog data');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying to backend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dog from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
