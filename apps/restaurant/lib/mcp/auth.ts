/**
 * MCP Authentication Utilities
 * Supports multiple authentication methods:
 * - Bearer token (MCP_API_KEY)
 * - API key in query parameter (?api_key=...)
 * - OAuth access tokens
 * - No auth (for ChatGPT when MCP_ALLOW_UNAUTHENTICATED=true)
 */

// In-memory token store (shared with OAuth token endpoint)
// In production, use Redis or database
export const oauthAccessTokens = new Map<string, {
  clientId: string;
  scope: string;
  expiresAt: number;
}>();

export interface AuthResult {
  valid: boolean;
  method?: 'bearer' | 'oauth' | 'query' | 'none';
  clientId?: string;
  scope?: string;
  error?: string;
}

export interface AuthOptions {
  authHeader?: string | null;
  queryApiKey?: string | null;
  allowUnauthenticated?: boolean;
}

/**
 * Validate authentication from request
 * Supports:
 * - Bearer token (MCP_API_KEY)
 * - API key in query parameter
 * - OAuth access tokens
 * - Unauthenticated (if allowed)
 */
export function validateAuth(authHeaderOrOptions: string | null | AuthOptions): AuthResult {
  const apiKey = process.env.MCP_API_KEY;
  const allowUnauthenticated = process.env.MCP_ALLOW_UNAUTHENTICATED === 'true';
  
  // Handle both old signature (string) and new signature (options object)
  let authHeader: string | null | undefined;
  let queryApiKey: string | null | undefined;
  
  if (typeof authHeaderOrOptions === 'string' || authHeaderOrOptions === null) {
    authHeader = authHeaderOrOptions;
  } else if (authHeaderOrOptions) {
    authHeader = authHeaderOrOptions.authHeader;
    queryApiKey = authHeaderOrOptions.queryApiKey;
  }
  
  // If no API key configured, allow all requests
  if (!apiKey) {
    return { valid: true, method: 'none' };
  }

  // Check query parameter API key first (for ChatGPT compatibility)
  if (queryApiKey && queryApiKey === apiKey) {
    return { valid: true, method: 'query' };
  }

  // Check Bearer token
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // Check if it's the static API key (Bearer token auth)
    if (token === apiKey) {
      return { valid: true, method: 'bearer' };
    }

    // Check if it's a valid OAuth access token
    const oauthData = oauthAccessTokens.get(token);
    if (oauthData) {
      if (oauthData.expiresAt < Date.now()) {
        oauthAccessTokens.delete(token);
        return { valid: false, error: 'OAuth token expired' };
      }
      return {
        valid: true,
        method: 'oauth',
        clientId: oauthData.clientId,
        scope: oauthData.scope,
      };
    }
  }

  // Allow unauthenticated access if configured (for ChatGPT)
  if (allowUnauthenticated) {
    return { valid: true, method: 'none' };
  }

  return { valid: false, error: 'Invalid or missing authentication' };
}

/**
 * Register an OAuth access token (called by token endpoint)
 */
export function registerOAuthToken(
  token: string,
  data: { clientId: string; scope: string; expiresAt: number }
): void {
  oauthAccessTokens.set(token, data);
  
  // Clean up expired tokens periodically
  for (const [key, value] of oauthAccessTokens.entries()) {
    if (value.expiresAt < Date.now()) {
      oauthAccessTokens.delete(key);
    }
  }
}

/**
 * Revoke an OAuth access token
 */
export function revokeOAuthToken(token: string): boolean {
  return oauthAccessTokens.delete(token);
}
