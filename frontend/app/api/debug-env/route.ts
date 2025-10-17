import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    hasCronSecretProd: !!process.env.CRON_SECRET_PROD,
    hasCronSecretStaging: !!process.env.CRON_SECRET_STAGING,
    cronSecretProdLength: process.env.CRON_SECRET_PROD?.length || 0,
    cronSecretStagingLength: process.env.CRON_SECRET_STAGING?.length || 0,
  });
}
