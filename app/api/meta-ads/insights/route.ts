import { NextRequest, NextResponse } from 'next/server';
import { getInsights, TimeRange, InsightLevel, Breakdown } from '@/lib/meta-ads/insights';
import { GraphAPIError } from '@/lib/meta-ads/api';

function getAccessToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return process.env.META_ACCESS_TOKEN || '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const objectId = searchParams.get('object_id');
  const timeRange = (searchParams.get('time_range') || 'last_30d') as TimeRange;
  const level = (searchParams.get('level') || 'campaign') as InsightLevel;
  const breakdown = searchParams.get('breakdown') as Breakdown | undefined;
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  if (!objectId) {
    return NextResponse.json(
      { error: 'object_id is required (campaign_id, adset_id, ad_id, or account_id)' },
      { status: 400 }
    );
  }

  try {
    const result = await getInsights(accessToken, objectId, {
      timeRange,
      level,
      breakdown: breakdown || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get insights error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
