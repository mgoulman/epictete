/**
 * MCP SSE Transport Endpoint
 * Provides Server-Sent Events transport for MCP clients like Windsurf
 * 
 * Endpoint: GET /api/mcp/sse (SSE stream)
 * Endpoint: POST /api/mcp/sse (send message)
 */

import { NextRequest, NextResponse } from 'next/server';
import { MCPHTTPHandler, MCPRequest } from '@/lib/mcp/http-handler';
import { validateAuth } from '@/lib/mcp/auth';
import { META_ADS_TOOLS, INSTAGRAM_TOOLS } from '@/lib/mcp/tools';

// Store active SSE connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController;
  handler: MCPHTTPHandler;
}>();

function getHandler(): MCPHTTPHandler | null {
  const metaToken = process.env.META_ACCESS_TOKEN;
  if (!metaToken) return null;
  
  const apiKey = process.env.MCP_API_KEY;
  return new MCPHTTPHandler({
    accessToken: metaToken,
    apiKey,
  });
}

// SSE endpoint - establishes connection
// Allow unauthenticated GET for initial connection (ChatGPT OAuth flow)
// Auth is validated on POST requests (tool calls)
export async function GET(request: NextRequest) {
  const handler = getHandler();
  if (!handler) {
    return NextResponse.json(
      { error: 'Server not configured. Set META_ACCESS_TOKEN.' },
      { status: 500 }
    );
  }

  const connectionId = crypto.randomUUID();
  
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(connectionId, { controller, handler });
      
      // Send initial connection message
      const initMessage = JSON.stringify({
        jsonrpc: '2.0',
        method: 'connection/init',
        params: {
          connectionId,
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'epictete-meta-ads',
            version: '1.0.0',
          },
        },
      });
      
      controller.enqueue(`data: ${initMessage}\n\n`);
      
      // Send endpoint info for message posting
      const endpointMessage = JSON.stringify({
        jsonrpc: '2.0',
        method: 'connection/ready',
        params: {
          messageEndpoint: `/api/mcp/sse?connectionId=${connectionId}`,
        },
      });
      
      controller.enqueue(`data: ${endpointMessage}\n\n`);
      
      // Send available tools list
      const allTools = [...META_ADS_TOOLS, ...INSTAGRAM_TOOLS];
      const toolsMessage = JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed',
        params: {
          tools: allTools,
        },
      });
      controller.enqueue(`data: ${toolsMessage}\n\n`);
      
      // Keepalive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`: ping\n\n`);
        } catch {
          clearInterval(pingInterval);
          connections.delete(connectionId);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        connections.delete(connectionId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Connection-Id': connectionId,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// POST endpoint - receive messages for SSE connection
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  
  // Parse request body first to check method
  let body: MCPRequest;
  try {
    body = await request.json() as MCPRequest;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    );
  }
  
  // Allow unauthenticated access for discovery methods (serverless can't persist OAuth tokens)
  // ChatGPT already authenticated via OAuth at the app level
  const discoveryMethods = ['initialize', 'initialized', 'tools/list', 'ping', 'notifications/initialized'];
  const isDiscoveryMethod = discoveryMethods.includes(body.method);
  
  if (!isDiscoveryMethod) {
    // Validate auth for tool calls and other methods
    const authResult = validateAuth({
      authHeader: request.headers.get('authorization'),
      queryApiKey: searchParams.get('api_key'),
      allowUnauthenticated: true, // Allow for now since ChatGPT OAuth protects the app
    });
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 401 });
    }
  }
  
  // If no connectionId, handle as regular HTTP request
  if (!connectionId) {
    const handler = getHandler();
    if (!handler) {
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32001, message: 'Server not configured' } },
        { status: 500 }
      );
    }
    
    const authHeader = request.headers.get('authorization') || undefined;
    const response = await handler.handleRequest(body, authHeader);
    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  // Handle SSE message
  const connection = connections.get(connectionId);
  if (!connection) {
    return NextResponse.json(
      { error: 'Connection not found' },
      { status: 404 }
    );
  }

  try {
    const authHeader = request.headers.get('authorization') || undefined;
    
    // Process the request
    const response = await connection.handler.handleRequest(body, authHeader);
    
    // Send response through SSE stream
    const responseMessage = JSON.stringify({
      ...response,
      id: body.id,
    });
    
    connection.controller.enqueue(`data: ${responseMessage}\n\n`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SSE message error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
