/**
 * OAuth 2.0 Authorization Endpoint with PKCE Support
 * GET /api/mcp/oauth/authorize
 * 
 * Handles OAuth authorization requests from ChatGPT and other OAuth clients
 * Supports OAuth 2.1 with PKCE (RFC 7636)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authCodeStore } from '../token/route';
import { dynamicClients } from '../register/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256';
  const resource = searchParams.get('resource');

  // Validate required parameters
  if (!clientId || !redirectUri || !responseType) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters: client_id, redirect_uri, response_type' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  if (responseType !== 'code') {
    return NextResponse.json(
      { error: 'unsupported_response_type', error_description: 'Only code response type is supported' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Check if client is registered (static or dynamic)
  const staticClientId = process.env.MCP_OAUTH_CLIENT_ID || 'epictete-mcp-client';
  const isDynamicClient = dynamicClients.has(clientId);
  const isStaticClient = clientId === staticClientId || clientId.startsWith('chatgpt_');
  
  if (!isDynamicClient && !isStaticClient) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Unknown client_id. Register first at /api/mcp/oauth/register' },
      { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  // Generate authorization code
  const authCode = generateAuthCode();
  
  // Store the auth code with PKCE data (expires in 10 minutes)
  authCodeStore.set(authCode, {
    clientId,
    redirectUri,
    scope: scope || 'mcp:access',
    codeChallenge: codeChallenge || undefined,
    codeChallengeMethod: codeChallenge ? codeChallengeMethod : undefined,
    resource: resource || undefined,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Clean up expired codes
  for (const [key, value] of authCodeStore.entries()) {
    if (value.expiresAt < Date.now()) {
      authCodeStore.delete(key);
    }
  }

  // Redirect back with authorization code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function generateAuthCode(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
