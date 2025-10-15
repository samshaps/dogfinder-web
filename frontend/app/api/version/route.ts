import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown';
  const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || 'unknown';
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || '';
  return NextResponse.json({
    sha,
    branch,
    message,
    deployedAt: new Date().toISOString(),
  });
}


