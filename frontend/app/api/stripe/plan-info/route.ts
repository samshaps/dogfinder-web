import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserPlan } from '@/lib/stripe/plan-utils';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/stripe/plan-info
 * Returns the current authenticated user's plan information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return errJson(ApiErrors.unauthorized('Authentication required'), request);
    }

    const planInfo = await getUserPlan(session.user.email);

    const response = okJson(planInfo, request);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Error fetching plan info:', error);
    const response = errJson(ApiErrors.internalError('Failed to fetch plan information'), request);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}

