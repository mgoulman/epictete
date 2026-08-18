// ───────────────────────────────────────────────────────────────────────────
// Client fetch helper. One consistent way to call our JSON APIs so every call
// site checks res.ok, surfaces the server's { error } message, and throws a
// typed ApiError instead of silently treating an HTTP 500 as success.
//
//   import { fetchJson, ApiError } from '@/lib/api/fetch-json';
//   try {
//     const data = await fetchJson<{ id: string }>('/api/x', { method: 'POST', json: body });
//     toast.success('Enregistré');
//   } catch (e) {
//     toast.error(e instanceof ApiError ? e.message : 'Une erreur est survenue');
//   }
//
// `json` option JSON-encodes the body and sets the Content-Type header for you.
// ───────────────────────────────────────────────────────────────────────────

import { reportError } from '@/lib/observability/report';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface FetchJsonInit extends Omit<RequestInit, 'body'> {
  /** Convenience: value is JSON.stringify'd and Content-Type set to application/json. */
  json?: unknown;
  body?: BodyInit | null;
}

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init: FetchJsonInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const finalInit: RequestInit = { ...rest };

  if (json !== undefined) {
    finalInit.body = JSON.stringify(json);
    finalInit.headers = { 'Content-Type': 'application/json', ...(headers as Record<string, string> | undefined) };
  } else if (headers) {
    finalInit.headers = headers;
  }

  let res: Response;
  try {
    res = await fetch(input, finalInit);
  } catch (networkErr) {
    // Offline / DNS / aborted — surface as an ApiError with status 0.
    reportError(networkErr, { where: 'fetchJson:network', extra: { url: String(input) } });
    throw new ApiError('Connexion impossible. Vérifiez votre réseau.', 0, null);
  }

  // Parse body once; tolerate empty/non-JSON responses (e.g. 204).
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : null) || `Erreur ${res.status}`;
    const err = new ApiError(message, res.status, data);
    reportError(err, { where: 'fetchJson:http', extra: { url: String(input), status: res.status } });
    throw err;
  }

  return data as T;
}
