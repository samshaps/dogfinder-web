import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 Test API GET endpoint called');
  
  try {
    const response = {
      status: 'working',
      message: 'Basic API test successful',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
    
    console.log('✅ Test API GET response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Test API GET error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'GET test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('🧪 Test API POST endpoint called');
  
  try {
    const body = await request.json();
    console.log('📝 Test API POST body:', body);
    
    const response = {
      status: 'working',
      message: 'POST test successful',
      receivedData: body,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Test API POST response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Test API POST error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'POST test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
