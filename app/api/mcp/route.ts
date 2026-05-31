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
  const { searchParams } = new URL(request.url);
  
  // Parse body first to check if it's a discovery method
  let body: MCPRequest;
  try {
    body = await request.json() as MCPRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
  
  // Discovery methods don't require auth (for ChatGPT MCP compatibility with serverless)
  const discoveryMethods = ['initialize', 'initialized', 'tools/list', 'ping', 'notifications/initialized'];
  const isDiscoveryMethod = discoveryMethods.includes(body.method);
  
  // Validate auth only for non-discovery methods
  if (!isDiscoveryMethod) {
    const authResult = validateAuth({
      authHeader: request.headers.get('authorization'),
      queryApiKey: searchParams.get('api_key'),
    });
    if (!authResult.valid) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32001, message: authResult.error || 'Unauthorized' } },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }

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
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const authHeader = request.headers.get('authorization') || undefined;
  const response = await handler.handleRequest(body, authHeader, isDiscoveryMethod);

  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
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
