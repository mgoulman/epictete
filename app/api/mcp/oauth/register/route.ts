/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591)
 * POST /api/mcp/oauth/register
 * 
 * Allows ChatGPT to dynamically register as an OAuth client
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory client store (use database in production)
const dynamicClients = new Map<string, {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  client_name?: string;
  token_endpoint_auth_method: string;
  grant_types: string[];
  response_types: string[];
  created_at: number;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      redirect_uris = [],
      client_name,
      token_endpoint_auth_method = 'none',
      grant_types = ['authorization_code', 'refresh_token'],
      response_types = ['code'],
    } = body;

    // Generate client credentials
    const clientId = `chatgpt_${generateRandomString(16)}`;
    const clientSecret = token_endpoint_auth_method !== 'none' 
      ? generateRandomString(32) 
      : undefined;

    const client = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: Array.isArray(redirect_uris) ? redirect_uris : [redirect_uris],
      client_name: client_name || 'ChatGPT MCP Client',
      token_endpoint_auth_method,
      grant_types,
      response_types,
      created_at: Date.now(),
    };

    dynamicClients.set(clientId, client);

    // Return client registration response
    const response: Record<string, unknown> = {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: client.redirect_uris,
      client_name: client.client_name,
      token_endpoint_auth_method,
      grant_types,
      response_types,
    };

    if (clientSecret) {
      response.client_secret = clientSecret;
      response.client_secret_expires_at = 0; // Never expires
    }

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Client registration error:', error);
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'Failed to register client' },
      { status: 400 }
    );
  }
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

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// Export for use by other OAuth endpoints
export { dynamicClients };
