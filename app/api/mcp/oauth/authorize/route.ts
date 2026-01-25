/**
 * OAuth 2.0 Authorization Endpoint
 * GET /api/mcp/oauth/authorize
 * 
 * Handles OAuth authorization requests from ChatGPT and other OAuth clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { authCodeStore } from '../token/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope');

  // Validate required parameters
  if (!clientId || !redirectUri || !responseType) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing required parameters' },
      { status: 400 }
    );
  }

  // Validate client_id matches our configured client
  const validClientId = process.env.MCP_OAUTH_CLIENT_ID || 'epictete-mcp-client';
  if (clientId !== validClientId) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Unknown client_id' },
      { status: 401 }
    );
  }

  // For simplicity, we auto-approve and generate an authorization code
  // In production, this would show a consent screen
  const authCode = generateAuthCode();
  
  // Store the auth code temporarily (expires in 10 minutes)
  await storeAuthCode(authCode, {
    clientId,
    redirectUri,
    scope: scope || 'mcp:access',
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  // Redirect back with authorization code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return NextResponse.redirect(redirectUrl.toString());
}

// Simple auth code generator
function generateAuthCode(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function storeAuthCode(code: string, data: {
  clientId: string;
  redirectUri: string;
  scope: string;
  expiresAt: number;
}): Promise<void> {
  authCodeStore.set(code, data);
  
  // Clean up expired codes
  for (const [key, value] of authCodeStore.entries()) {
    if (value.expiresAt < Date.now()) {
      authCodeStore.delete(key);
    }
  }
}
