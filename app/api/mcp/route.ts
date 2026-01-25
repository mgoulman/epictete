/**
 * MCP Server Unified Endpoint
 * Supports both HTTP JSON-RPC and SSE transports
 * 
 * Endpoints:
 * - POST /api/mcp - HTTP JSON-RPC (Claude Desktop)
 * - GET /api/mcp - Server info / SSE discovery
 * - GET /api/mcp/sse - SSE transport (Windsurf)
 * - POST /api/mcp/sse - SSE message endpoint
 * 
 * Authentication: Bearer token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { MCPHTTPHandler, MCPRequest } from '@/lib/mcp/http-handler';
import { validateAuth } from '@/lib/mcp/auth';

// Initialize handler with environment tokens
function getHandler(): MCPHTTPHandler | null {
  const metaToken = process.env.META_ACCESS_TOKEN;
  if (!metaToken) return null;

  const apiKey = process.env.MCP_API_KEY;
  return new MCPHTTPHandler({
    accessToken: metaToken,
    apiKey,
  });
}

export async function POST(request: NextRequest) {
  // Validate auth (supports both Bearer token and OAuth)
  const authResult = validateAuth(request.headers.get('authorization'));
  if (!authResult.valid) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32001, message: authResult.error || 'Unauthorized' } },
      { status: 401 }
    );
  }

  try {
    const handler = getHandler();
    
    if (!handler) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Server not configured. Set META_ACCESS_TOKEN environment variable.',
          },
        },
        { status: 500 }
      );
    }

    const body = await request.json() as MCPRequest;
    const authHeader = request.headers.get('authorization') || undefined;

    const response = await handler.handleRequest(body, authHeader);

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('MCP endpoint error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Server info endpoint
  if (action === 'info') {
    return NextResponse.json({
      name: 'epictete-mcp',
      version: '1.0.0',
      description: 'Meta Ads & Instagram MCP Server for Epictete Restaurant',
      transports: {
        http: '/api/mcp',
        sse: '/api/mcp/sse',
      },
      authentication: {
        methods: ['bearer', 'oauth2'],
        bearer: 'Authorization: Bearer <MCP_API_KEY>',
        oauth2: {
          authorization_endpoint: '/api/mcp/oauth/authorize',
          token_endpoint: '/api/mcp/oauth/token',
          grant_types: ['authorization_code', 'client_credentials', 'refresh_token'],
        },
      },
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
      availableServers: [
        { name: 'meta-ads', path: '/api/mcp', description: 'Meta Ads & Instagram API' },
      ],
    });
  }

  // MCP protocol discovery
  return NextResponse.json({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'epictete-mcp',
        version: '1.0.0',
      },
      transports: ['http', 'sse'],
      endpoints: {
        http: '/api/mcp',
        sse: '/api/mcp/sse',
      },
    },
  });
}
