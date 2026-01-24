/**
 * MCP Server HTTP Endpoint
 * Provides Streamable HTTP transport for MCP clients like Claude Desktop
 * 
 * Endpoint: POST /api/mcp
 * Authentication: Bearer token in Authorization header
 */

import { NextRequest, NextResponse } from 'next/server';
import { MCPHTTPHandler, MCPRequest } from '@/lib/mcp/http-handler';

// Initialize handler with environment tokens
function getHandler(): MCPHTTPHandler | null {
  // Get Meta access token from env
  const metaToken = process.env.META_ACCESS_TOKEN;
  
  if (!metaToken) {
    return null;
  }

  // API key for authenticating incoming MCP requests
  const apiKey = process.env.MCP_API_KEY;

  return new MCPHTTPHandler({
    accessToken: metaToken,
    apiKey,
  });
}

export async function POST(request: NextRequest) {
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

  if (action === 'info') {
    return NextResponse.json({
      name: 'epictete-meta-ads',
      version: '1.0.0',
      description: 'Meta Ads & Instagram MCP Server for Epictete Restaurant',
      transport: 'streamable-http',
      endpoint: '/api/mcp',
      authentication: 'Bearer token required (MCP_API_KEY)',
      capabilities: {
        tools: true,
        resources: false,
        prompts: false,
      },
    });
  }

  // Return MCP server info for discovery
  return NextResponse.json({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: {
        name: 'epictete-meta-ads',
        version: '1.0.0',
      },
    },
  });
}
