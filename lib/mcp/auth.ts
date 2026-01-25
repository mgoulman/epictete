/**
 * MCP Authentication Utilities
 * Supports both Bearer token and OAuth 2.0 authentication
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
  method?: 'bearer' | 'oauth';
  clientId?: string;
  scope?: string;
  error?: string;
}

/**
 * Validate authentication from request
 * Supports:
 * - Bearer token (MCP_API_KEY)
 * - OAuth access tokens
 */
export function validateAuth(authHeader: string | null): AuthResult {
  const apiKey = process.env.MCP_API_KEY;
  
  // If no API key configured, allow all requests
  if (!apiKey) {
    return { valid: true, method: 'bearer' };
  }

  if (!authHeader) {
    return { valid: false, error: 'Authorization header required' };
  }

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

  return { valid: false, error: 'Invalid token' };
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
