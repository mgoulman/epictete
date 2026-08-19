// One consistent way to call our JSON APIs: checks res.ok, surfaces the server's
// { error } message, and throws a typed ApiError instead of treating a 500 as success.
//
//   try {
//     const data = await fetchJson<{ id: string }>("/api/x", { method: "POST", json: body });
//     toast.success("Enregistré");
//   } catch (e) {
//     toast.error(e instanceof ApiError ? e.message : "Une erreur est survenue.");
//   }

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export interface FetchJsonInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit | null;
}

export async function fetchJson<T = unknown>(input: RequestInfo | URL, init: FetchJsonInit = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const finalInit: RequestInit = { ...rest };
  if (json !== undefined) {
    finalInit.body = JSON.stringify(json);
    finalInit.headers = { "Content-Type": "application/json", ...(headers as Record<string, string> | undefined) };
  } else if (headers) {
    finalInit.headers = headers;
  }

  let res: Response;
  try {
    res = await fetch(input, finalInit);
  } catch {
    throw new ApiError("Connexion impossible. Vérifiez votre réseau.", 0, null);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : null) || `Erreur ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
