/**
 * MCP HTTP Handler
 * Handles HTTP transport for the MCP server (Streamable HTTP)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMCPServer } from './server';

export interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  id?: number | string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface HTTPHandlerConfig {
  accessToken: string;
  apiKey?: string; // For authenticating incoming requests
}

export class MCPHTTPHandler {
  private server: Server;
  private config: HTTPHandlerConfig;

  constructor(config: HTTPHandlerConfig) {
    this.config = config;
    this.server = createMCPServer({ accessToken: config.accessToken });
  }

  async handleRequest(
    request: MCPRequest,
    authHeader?: string,
    skipAuth?: boolean
  ): Promise<MCPResponse> {
    // Discovery methods don't require auth (for ChatGPT MCP compatibility)
    const discoveryMethods = ['initialize', 'initialized', 'tools/list', 'ping', 'notifications/initialized'];
    const isDiscoveryMethod = discoveryMethods.includes(request.method);
    
    // Check if unauthenticated access is allowed (for ChatGPT in serverless)
    const allowUnauthenticated = process.env.MCP_ALLOW_UNAUTHENTICATED === 'true';
    
    // Validate API key if configured (skip for discovery methods, when explicitly skipped, or when unauthenticated allowed)
    if (this.config.apiKey && !isDiscoveryMethod && !skipAuth && !allowUnauthenticated) {
      if (!authHeader) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32001,
            message: 'Authorization required',
          },
        };
      }

      const providedKey = authHeader.replace('Bearer ', '');
      if (providedKey !== this.config.apiKey) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32002,
            message: 'Invalid API key',
          },
        };
      }
    }

    try {
      const { method, params, id } = request;

      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: {
                tools: {
                  listChanged: true,
                },
              },
              serverInfo: {
                name: 'epictete-mcp',
                version: '1.0.0',
              },
            },
          };

        case 'initialized':
        case 'notifications/initialized':
          // Client notification - no response needed but return success
          return {
            jsonrpc: '2.0',
            id,
            result: {},
          };

        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: {},
          };

        case 'tools/list':
          // Get tools from server
          const toolsResult = await this.listTools();
          return {
            jsonrpc: '2.0',
            id,
            result: toolsResult,
          };

        case 'tools/call':
          const callResult = await this.callTool(
            params?.name as string,
            params?.arguments as Record<string, unknown>
          );
          return {
            jsonrpc: '2.0',
            id,
            result: callResult,
          };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  private async listTools(): Promise<{ tools: unknown[] }> {
    // Import tool definitions directly
    const { META_ADS_TOOLS, INSTAGRAM_TOOLS } = await import('./tools');
    return { tools: [...META_ADS_TOOLS, ...INSTAGRAM_TOOLS] };
  }

  private async callTool(
    name: string,
    args?: Record<string, unknown>
  ): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
    const { executeMetaAdsTool, executeInstagramTool } = await import('./tools');
    
    try {
      let result: unknown;

      if (name.startsWith('instagram_')) {
        result = await executeInstagramTool(this.config.accessToken, name, args);
      } else {
        result = await executeMetaAdsTool(this.config.accessToken, name, args);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  }
}
