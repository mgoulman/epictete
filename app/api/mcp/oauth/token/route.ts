/**
 * OAuth 2.0 Token Endpoint
 * POST /api/mcp/oauth/token
 * 
 * Exchanges authorization codes for access tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerOAuthToken } from '@/lib/mcp/auth';

// In-memory stores (use Redis/DB in production)
const authCodeStore = new Map<string, {
  clientId: string;
  redirectUri: string;
  scope: string;
  expiresAt: number;
}>();

const refreshTokenStore = new Map<string, {
  clientId: string;
  scope: string;
}>();

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');
  
  let params: URLSearchParams;
  
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const body = await request.text();
    params = new URLSearchParams(body);
  } else if (contentType?.includes('application/json')) {
    const body = await request.json();
    params = new URLSearchParams(body);
  } else {
    const body = await request.text();
    params = new URLSearchParams(body);
  }

  const grantType = params.get('grant_type');
  const clientId = params.get('client_id');
  const clientSecret = params.get('client_secret');

  // Validate client credentials
  const validClientId = process.env.MCP_OAUTH_CLIENT_ID || 'epictete-mcp-client';
  const validClientSecret = process.env.MCP_OAUTH_CLIENT_SECRET || process.env.MCP_API_KEY;

  if (clientId !== validClientId) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Invalid client_id' },
      { status: 401 }
    );
  }

  if (validClientSecret && clientSecret !== validClientSecret) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Invalid client_secret' },
      { status: 401 }
    );
  }

  if (grantType === 'authorization_code') {
    return handleAuthorizationCode(params, clientId);
  } else if (grantType === 'refresh_token') {
    return handleRefreshToken(params, clientId);
  } else if (grantType === 'client_credentials') {
    return handleClientCredentials(clientId);
  }

  return NextResponse.json(
    { error: 'unsupported_grant_type', error_description: 'Grant type not supported' },
    { status: 400 }
  );
}

function handleAuthorizationCode(params: URLSearchParams, clientId: string) {
  const code = params.get('code');
  const redirectUri = params.get('redirect_uri');

  if (!code) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing authorization code' },
      { status: 400 }
    );
  }

  const authData = authCodeStore.get(code);
  
  if (!authData) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
      { status: 400 }
    );
  }

  if (authData.expiresAt < Date.now()) {
    authCodeStore.delete(code);
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Authorization code expired' },
      { status: 400 }
    );
  }

  if (authData.clientId !== clientId) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Client mismatch' },
      { status: 400 }
    );
  }

  if (redirectUri && authData.redirectUri !== redirectUri) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
      { status: 400 }
    );
  }

  // Delete used auth code
  authCodeStore.delete(code);

  // Generate tokens
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const expiresIn = 3600; // 1 hour

  // Store tokens using shared auth module
  registerOAuthToken(accessToken, {
    clientId,
    scope: authData.scope,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  refreshTokenStore.set(refreshToken, {
    clientId,
    scope: authData.scope,
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    refresh_token: refreshToken,
    scope: authData.scope,
  });
}

function handleRefreshToken(params: URLSearchParams, clientId: string) {
  const refreshToken = params.get('refresh_token');

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing refresh token' },
      { status: 400 }
    );
  }

  const tokenData = refreshTokenStore.get(refreshToken);
  
  if (!tokenData || tokenData.clientId !== clientId) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid refresh token' },
      { status: 400 }
    );
  }

  // Generate new access token
  const accessToken = generateToken();
  const expiresIn = 3600;

  registerOAuthToken(accessToken, {
    clientId,
    scope: tokenData.scope,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: tokenData.scope,
  });
}

function handleClientCredentials(clientId: string) {
  // For client_credentials grant, issue token directly
  const accessToken = generateToken();
  const expiresIn = 3600;

  registerOAuthToken(accessToken, {
    clientId,
    scope: 'mcp:access',
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    scope: 'mcp:access',
  });
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Export auth code store for use by authorize endpoint
export { authCodeStore };
