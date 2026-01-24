/**
 * Meta Graph API Core
 * Direct TypeScript implementation of Meta Ads API
 */

const META_GRAPH_API_VERSION = 'v22.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
const USER_AGENT = 'meta-ads-ts/1.0';

export class GraphAPIError extends Error {
  code: number;
  subcode?: number;
  fbtraceId?: string;

  constructor(errorData: Record<string, unknown>) {
    const message = (errorData.message as string) || 'Unknown Graph API error';
    super(message);
    this.name = 'GraphAPIError';
    this.code = (errorData.code as number) || 0;
    this.subcode = errorData.error_subcode as number | undefined;
    this.fbtraceId = errorData.fbtrace_id as string | undefined;
  }

  isAuthError(): boolean {
    return [190, 102, 4, 200, 10].includes(this.code);
  }
}

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

export async function makeAPIRequest<T = Record<string, unknown>>(
  endpoint: string,
  accessToken: string,
  options: APIRequestOptions = {}
): Promise<T> {
  const { method = 'GET', params = {}, body } = options;

  if (!accessToken) {
    throw new GraphAPIError({
      message: 'Authentication Required',
      code: 190,
    });
  }

  const url = new URL(`${META_GRAPH_API_BASE}/${endpoint}`);
  
  // Add access token and params for GET/DELETE
  if (method === 'GET' || method === 'DELETE') {
    url.searchParams.set('access_token', accessToken);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        const stringValue = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
        url.searchParams.set(key, stringValue);
      }
    }
  }

  const headers: HeadersInit = {
    'User-Agent': USER_AGENT,
  };

  let requestBody: string | undefined;

  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const formData = new URLSearchParams();
    formData.set('access_token', accessToken);
    
    const allParams = { ...params, ...body };
    for (const [key, value] of Object.entries(allParams)) {
      if (value !== undefined && value !== null) {
        const stringValue = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
        formData.set(key, stringValue);
      }
    }
    requestBody = formData.toString();
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: requestBody,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new GraphAPIError(data.error || { message: `HTTP ${response.status}`, code: response.status });
    }

    return data as T;
  } catch (error) {
    if (error instanceof GraphAPIError) {
      throw error;
    }
    throw new GraphAPIError({
      message: error instanceof Error ? error.message : 'Network error',
      code: -1,
    });
  }
}

// Utility to ensure account ID has proper format
export function normalizeAccountId(accountId: string): string {
  if (!accountId) return '';
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

// European countries for DSA compliance detection
const EUROPEAN_COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'DK', 'SE', 'FI', 'NO', 'PL', 'PT', 'GR', 'CZ', 'HU', 'RO', 'BG'];

export function isDSARequired(countryCode?: string): boolean {
  return countryCode ? EUROPEAN_COUNTRIES.includes(countryCode) : false;
}
