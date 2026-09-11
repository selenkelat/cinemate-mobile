import { API_BASE_URL } from '@/config';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface AuthHandlers {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
}

// AuthContext registers itself here once, on mount. client.ts can't import AuthContext directly
// — AuthContext already imports this module to make its own requests, and that would be a
// circular dependency — so the wiring runs the other way: this module stays passive until told
// how to find a token and how to refresh one.
let authHandlers: AuthHandlers | null = null;

export function setAuthHandlers(handlers: AuthHandlers) {
  authHandlers = handlers;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  // Attaches the current access token and, on a 401, retries once after a refresh. Omit for
  // the auth endpoints themselves (register/login/refresh), which take no token.
  auth?: boolean;
}

async function rawRequest(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  // A FormData body (multipart upload) must NOT get a manual Content-Type: fetch computes its
  // own `multipart/form-data; boundary=...` from the FormData instance, and overriding it here
  // would produce a header with no boundary the server can't parse.
  const isFormData = options.body instanceof FormData;

  return fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.auth ? (authHandlers?.getAccessToken() ?? null) : null;
  let response = await rawRequest(path, options, token);

  // Exactly one refresh-and-retry, not a loop: the backend's own refresh rotation
  // (AuthService.RefreshAsync) treats a second reuse of the same refresh token as theft and
  // revokes every session, so retrying more than once here would just turn that into a hang.
  if (response.status === 401 && options.auth && authHandlers) {
    const newToken = await authHandlers.refreshAccessToken();
    if (newToken) {
      response = await rawRequest(path, options, newToken);
    }
  }

  if (!response.ok) {
    const text = await response.text();
    // ASP.NET's BadRequest(string)/NotFound(string) serialize the message as a bare JSON
    // string (e.g. `"Empty file."`, quotes included) — unwrap it so callers get the plain
    // message the backend actually wrote, not a raw JSON-encoded string.
    let message = text || response.statusText;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') message = parsed;
    } catch {
      // Not JSON (e.g. an empty 401 body) — use the raw text as-is.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
