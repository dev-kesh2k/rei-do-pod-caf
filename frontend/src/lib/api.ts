export const BASE = import.meta.env.BASE_URL; // termina com "/"

/** Caminho relativo ao app ("api/..." → "/<slug>/api/..."). */
export const url = (path: string) => (/^(https?:|data:|blob:)/.test(path) ? path : BASE + path.replace(/^\/+/, ''));

const TOKEN_KEY = 'rdp:token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url(`api/${path.replace(/^\/+/, '')}`), {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão. Verifique a internet e tente de novo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false && token) {
      setToken(null);
      window.dispatchEvent(new Event('rdp:logout'));
    }
    throw new ApiError(res.status, (data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data as T;
}

export const errorText = (e: unknown, fallback = 'Algo deu errado') => (e instanceof Error && e.message ? e.message : fallback);
