import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getCampaignDetails, createCampaign, updateCampaign, CampaignStatus, CampaignObjective } from '@/lib/meta-ads/campaigns';
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
  const accountId = searchParams.get('account_id');
  const campaignId = searchParams.get('campaign_id');
  const limit = parseInt(searchParams.get('limit') || '10');
  const statusFilter = searchParams.get('status') as CampaignStatus | undefined;
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  try {
    // Get single campaign details
    if (campaignId) {
      const campaign = await getCampaignDetails(accessToken, campaignId);
      return NextResponse.json(campaign);
    }

    // Get campaigns list
    if (!accountId) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    const campaigns = await getCampaigns(accessToken, accountId, {
      limit,
      statusFilter: statusFilter || undefined,
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { account_id, name, objective, status, daily_budget, special_ad_categories } = body;

    if (!account_id || !name || !objective) {
      return NextResponse.json({ error: 'account_id, name, and objective are required' }, { status: 400 });
    }

    const result = await createCampaign(accessToken, account_id, {
      name,
      objective: objective as CampaignObjective,
      status: status || 'PAUSED',
      dailyBudget: daily_budget,
      specialAdCategories: special_ad_categories,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create campaign error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { campaign_id, name, status, daily_budget, lifetime_budget, bid_strategy } = body;

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const result = await updateCampaign(accessToken, campaign_id, {
      name,
      status,
      dailyBudget: daily_budget,
      lifetimeBudget: lifetime_budget,
      bidStrategy: bid_strategy,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update campaign error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.isAuthError() ? 401 : 500 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
