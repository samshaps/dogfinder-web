import { NextRequest, NextResponse } from 'next/server';
import { appConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  const isProduction = process.env.VERCEL_ENV === 'production';
  const cronSecret = isProduction 
    ? appConfig.cronSecretProd 
    : appConfig.cronSecretStaging;

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    isProduction,
    hasCronSecretProd: !!appConfig.cronSecretProd,
    hasCronSecretStaging: !!appConfig.cronSecretStaging,
    hasCronSecret: !!cronSecret,
    authHeaderPresent: !!authHeader,
    cronSecretLength: cronSecret?.length || 0,
    timestamp: new Date().toISOString()
  });
}
