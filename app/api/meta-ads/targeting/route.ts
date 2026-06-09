import { NextRequest, NextResponse } from 'next/server';
import {
  searchInterests,
  searchBehaviors,
  searchDemographics,
  searchGeoLocations,
  getInterestSuggestions,
  estimateAudienceSize,
} from '@/lib/meta-ads/targeting';
import { GraphAPIError } from '@/lib/meta-ads/api';
import { enforce } from '@/lib/auth/supabase-server';

function getAccessToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return process.env.META_ACCESS_TOKEN || '';
}

export async function GET(request: NextRequest) {
  const denied = await enforce('marketing.read'); if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const query = searchParams.get('query') || '';
  const limit = parseInt(searchParams.get('limit') || '25');
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  try {
    switch (type) {
      case 'interests':
        if (!query) {
          return NextResponse.json({ error: 'query is required for interests search' }, { status: 400 });
        }
        const interests = await searchInterests(accessToken, query, limit);
        return NextResponse.json(interests);

      case 'behaviors':
        const behaviors = await searchBehaviors(accessToken, limit);
        return NextResponse.json(behaviors);

      case 'demographics':
        const demographicClass = searchParams.get('class') || 'demographics';
        const demographics = await searchDemographics(accessToken, demographicClass, limit);
        return NextResponse.json(demographics);

      case 'geo':
        if (!query) {
          return NextResponse.json({ error: 'query is required for geo location search' }, { status: 400 });
        }
        const locationTypes = searchParams.get('location_types')?.split(',').filter(Boolean);
        const geoLocations = await searchGeoLocations(accessToken, query, locationTypes, limit);
        return NextResponse.json(geoLocations);

      case 'suggestions':
        const interestList = searchParams.get('interests')?.split(',').filter(Boolean);
        if (!interestList || interestList.length === 0) {
          return NextResponse.json({ error: 'interests parameter is required (comma-separated list)' }, { status: 400 });
        }
        const suggestions = await getInterestSuggestions(accessToken, interestList, limit);
        return NextResponse.json(suggestions);

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: interests, behaviors, demographics, geo, or suggestions' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Targeting search error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await enforce('marketing.write'); if (denied) return denied;
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { account_id, targeting, optimization_goal } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const result = await estimateAudienceSize(accessToken, account_id, {
      targeting,
      optimizationGoal: optimization_goal,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Estimate audience error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
