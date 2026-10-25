import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, url } from './api';

export type Settings = { whatsapp: string; msgFlavor: string; msgProduct: string; msgHelp: string };
export type PublicProduct = {
  id: string;
  name: string;
  brand: string;
  puffs: number | null;
  series: string;
  photo: string;
  createdAt: string;
  noFlavor: boolean;
  inStock: boolean;
  flavors: string[];
};
export type Catalog = { settings: Settings; logoVersion: number; brands: string[]; products: PublicProduct[] };

export const DEFAULT_SETTINGS: Settings = {
  whatsapp: '5545998078084',
  msgFlavor: 'Olá! Gostaria de {produto} sabor {sabor}. Está disponível?',
  msgProduct: 'Olá! Gostaria de {produto}. Está disponível?',
  msgHelp: 'Olá! Vim pelo site e queria tirar uma dúvida.',
};

/** Minúsculas, sem acento e sem espaços nas pontas ("Maçã " == "maca"). */
export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** 40000 → "40.000 Puffs" */
export const formatarPuffs = (p: number) => `${Number(p).toLocaleString('pt-BR')} Puffs`;

export const waLink = (numero: string, msg: string) => `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

export function mensagemPedido(s: Settings, produto: string, sabor?: string) {
  const tpl = sabor ? s.msgFlavor : s.msgProduct;
  return tpl.replace(/\{produto\}/g, produto).replace(/\{sabor\}/g, sabor ?? '');
}

export const logoUrl = (v: number) => url(`api/logo${v ? `?v=${v}` : ''}`);

// Último catálogo guardado no navegador: na próxima visita aparece na hora e a versão nova
// substitui assim que chega.
const CACHE_KEY = 'reidopod:catalogo:v2';
function lerCache(): Catalog | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return c && Array.isArray(c.products) ? c : null;
  } catch {
    return null;
  }
}

type Ctx = { catalog: Catalog | null; error: boolean; reload: () => void };
const CatalogContext = createContext<Ctx>({ catalog: null, error: false, reload: () => {} });

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(lerCache);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const fresh = await api<Catalog>('catalog', { auth: false });
      setError(false);
      setCatalog((old) => (JSON.stringify(old) === JSON.stringify(fresh) ? old : fresh));
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch {
        /* sem cache */
      }
    } catch (e) {
      console.error('[REI DO POD] Falha ao carregar o catálogo:', e);
      setError(true);
    }
  }, []);

  useEffect(() => {
    reload();
    // Volta para a aba/app → busca de novo (o que foi esgotado no painel some).
    const onVisible = () => document.visibilityState === 'visible' && reload();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  return <CatalogContext.Provider value={{ catalog, error, reload }}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
