import { NextRequest, NextResponse } from 'next/server';
import { getAdAccounts, getAccountInfo, getAccountPages, getUserPages } from '@/lib/meta-ads/accounts';
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
  const action = searchParams.get('action');
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Access token is required. Set META_ACCESS_TOKEN env or provide Authorization header.' },
      { status: 401 }
    );
  }

  try {
    switch (action) {
      case 'accounts':
        const limit = parseInt(searchParams.get('limit') || '200');
        const accounts = await getAdAccounts(accessToken, 'me', limit);
        return NextResponse.json(accounts);

      case 'account':
        const accountId = searchParams.get('account_id');
        if (!accountId) {
          return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
        }
        const accountInfo = await getAccountInfo(accessToken, accountId);
        return NextResponse.json(accountInfo);

      case 'pages':
        const pageAccountId = searchParams.get('account_id');
        if (pageAccountId) {
          const accountPages = await getAccountPages(accessToken, pageAccountId);
          return NextResponse.json(accountPages);
        } else {
          const userPages = await getUserPages(accessToken);
          return NextResponse.json(userPages);
        }

      case 'health':
        // Simple health check - try to get accounts
        try {
          await getAdAccounts(accessToken, 'me', 1);
          return NextResponse.json({ status: 'ok', message: 'Meta Ads API is accessible' });
        } catch {
          return NextResponse.json({ status: 'error', message: 'Cannot connect to Meta Ads API' });
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: accounts, account, pages, or health' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Meta Ads API error:', error);
    if (error instanceof GraphAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.isAuthError() ? 401 : 500 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
