/**
 * OAuth 2.0 Token Endpoint
 * POST /api/mcp/oauth/token
 * 
 * Exchanges authorization codes for access tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerOAuthToken } from '@/lib/mcp/auth';
import { dynamicClients } from '../register/route';

// In-memory stores (use Redis/DB in production)
const authCodeStore = new Map<string, {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
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

  // Validate client credentials - accept static client or dynamic clients
  const staticClientId = process.env.MCP_OAUTH_CLIENT_ID || 'epictete-mcp-client';
  const staticClientSecret = process.env.MCP_OAUTH_CLIENT_SECRET || process.env.MCP_API_KEY;
  
  const isStaticClient = clientId === staticClientId;
  const isDynamicClient = clientId ? (dynamicClients.has(clientId) || clientId.startsWith('chatgpt_')) : false;
  
  if (!clientId || (!isStaticClient && !isDynamicClient)) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Invalid or missing client_id' },
      { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Only validate secret for static client with secret configured
  if (isStaticClient && staticClientSecret && clientSecret !== staticClientSecret) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Invalid client_secret' },
      { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
  
  // For dynamic clients, validate against stored secret if provided
  if (isDynamicClient && dynamicClients.has(clientId!)) {
    const dynamicClient = dynamicClients.get(clientId!);
    if (dynamicClient?.client_secret && clientSecret !== dynamicClient.client_secret) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client_secret' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }

  if (grantType === 'authorization_code') {
    return await handleAuthorizationCode(params, clientId);
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

async function handleAuthorizationCode(params: URLSearchParams, clientId: string) {
  const code = params.get('code');
  const redirectUri = params.get('redirect_uri');
  const codeVerifier = params.get('code_verifier');

  if (!code) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing authorization code' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const authData = authCodeStore.get(code);
  
  if (!authData) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (authData.expiresAt < Date.now()) {
    authCodeStore.delete(code);
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Authorization code expired' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (authData.clientId !== clientId) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Client mismatch' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (redirectUri && authData.redirectUri !== redirectUri) {
    return NextResponse.json(
      { error: 'invalid_grant', error_description: 'Redirect URI mismatch' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Validate PKCE code_verifier if code_challenge was provided
  if (authData.codeChallenge) {
    if (!codeVerifier) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Missing code_verifier for PKCE' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const isValid = await validatePKCE(
      codeVerifier,
      authData.codeChallenge,
      authData.codeChallengeMethod || 'S256'
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid code_verifier' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
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
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

async function validatePKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: string
): Promise<boolean> {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }
  
  // S256: BASE64URL(SHA256(code_verifier)) == code_challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const base64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  return base64 === codeChallenge;
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Export auth code store for use by authorize endpoint
export { authCodeStore };
