import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, url } from './api';

export type Endereco = {
  street: string;
  houseNumber: string;
  district: string;
  complement: string;
  reference: string;
  latitude: number | null;
  longitude: number | null;
};
export type Cliente = { id: string; name: string; phone: string; phoneKey: string; lastAddress: Endereco | null };

const TOKEN = 'rdp:cliente:token';
const DADOS = 'rdp:cliente';

/** Só dígitos, sem o 55 (DDD + número). */
export function phoneDigits(v: string) {
  let d = v.replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}
/** "45999990001" → "(45) 99999-0001" enquanto digita. */
export function maskPhone(v: string) {
  const d = phoneDigits(v);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Chamada da API com o token do cliente. */
export async function clienteApi<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN);
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(url(`api/${path}`), { method: opts.method || 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
  } catch {
    throw new ApiError(0, 'Sem conexão. Verifique a internet e tente de novo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem(TOKEN);
      localStorage.removeItem(DADOS);
      window.dispatchEvent(new Event('rdp:cliente-saiu'));
    }
    throw new ApiError(res.status, (data as { error?: string }).error || `Erro ${res.status}`);
  }
  return data as T;
}

type Ctx = {
  cliente: Cliente | null;
  entrar: (phone: string, name?: string) => Promise<'ok' | 'precisa-nome'>;
  sair: () => void;
  atualizar: (c: Cliente) => void;
};
const C = createContext<Ctx | null>(null);

function lerDados(): Cliente | null {
  if (!localStorage.getItem(TOKEN)) return null;
  try {
    return JSON.parse(localStorage.getItem(DADOS) || 'null');
  } catch {
    return null;
  }
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(lerDados);

  const atualizar = useCallback((c: Cliente) => {
    setCliente(c);
    localStorage.setItem(DADOS, JSON.stringify(c));
  }, []);

  useEffect(() => {
    const saiu = () => setCliente(null);
    window.addEventListener('rdp:cliente-saiu', saiu);
    // Confere o login lembrado e traz o último endereço atualizado.
    if (localStorage.getItem(TOKEN)) clienteApi<{ customer: Cliente }>('customer/me').then((r) => atualizar(r.customer)).catch(() => {});
    return () => window.removeEventListener('rdp:cliente-saiu', saiu);
  }, [atualizar]);

  const entrar = useCallback(
    async (phone: string, name?: string) => {
      const r = await clienteApi<{ needName?: boolean; token?: string; customer?: Cliente }>('customer/login', { method: 'POST', body: { phone, name } });
      if (r.needName) return 'precisa-nome' as const;
      localStorage.setItem(TOKEN, r.token!);
      atualizar(r.customer!);
      return 'ok' as const;
    },
    [atualizar]
  );

  const sair = useCallback(() => {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(DADOS);
    setCliente(null);
  }, []);

  return <C.Provider value={{ cliente, entrar, sair, atualizar }}>{children}</C.Provider>;
}

export function useCliente() {
  const c = useContext(C);
  if (!c) throw new Error('CustomerProvider ausente');
  return c;
}
