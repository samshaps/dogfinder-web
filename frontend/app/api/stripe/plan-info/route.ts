import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserPlan } from '@/lib/stripe/plan-utils';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

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

    return okJson(planInfo, request);
  } catch (error) {
    console.error('Error fetching plan info:', error);
    return errJson(ApiErrors.internalError('Failed to fetch plan information'), request);
  }
}


