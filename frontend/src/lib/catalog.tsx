import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, url } from './api';

export type Settings = { whatsapp: string; msgCart: string; msgCartEnd: string; msgHelp: string; bannerTitle: string; bannerText: string };
export type PublicFlavor = { id: string; name: string; available: boolean; price: number | null; promo: number | null };
export type PublicProduct = {
  uid: string;
  id: string; // slug (link)
  name: string;
  brand: string;
  kind: 'pod' | 'outro';
  puffs: number | null;
  series: string;
  description: string;
  photo: string;
  createdAt: string;
  featured: boolean;
  noFlavor: boolean;
  inStock: boolean;
  price: number | null;
  promo: number | null;
  flavors: PublicFlavor[];
};
export type Category = { name: string; kind: 'pod' | 'outro'; count: number };
export type Catalog = { settings: Settings; logoVersion: number; categories: Category[]; products: PublicProduct[] };

export const DEFAULT_SETTINGS: Settings = {
  whatsapp: '5545998078084',
  msgCart: 'Olá! Vim pelo site e quero fazer este pedido:',
  msgCartEnd: 'Está disponível?',
  msgHelp: 'Olá! Vim pelo site e queria tirar uma dúvida.',
  bannerTitle: 'O melhor pod do Paraná',
  bannerText: 'Produtos 100% originais com a entrega mais rápida de Cafelândia e região.',
};

/** 8990 → "R$ 89,90" */
export const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Valor cobrado de uma opção (promoção vence). */
export const efetivo = (o: { price: number | null; promo: number | null }) => (o.price == null ? null : o.promo ?? o.price);

export type Oferta = { price: number | null; promo: number | null };
/** Opções que podem ser compradas agora (sabores disponíveis, ou o próprio produto sem sabores). */
export function opcoes(p: PublicProduct): Oferta[] {
  if (p.noFlavor) return p.inStock ? [{ price: p.price, promo: p.promo }] : [];
  return p.flavors.filter((f) => f.available);
}

export type Resumo =
  | { tipo: 'esgotado' }
  | { tipo: 'consultar' }
  | { tipo: 'preco'; valor: number; de: number | null; aPartir: boolean; desconto: number };

/** Preço que a vitrine mostra: menor valor entre as opções disponíveis. */
export function resumoPreco(p: PublicProduct): Resumo {
  const ops = opcoes(p);
  if (!ops.length) return { tipo: 'esgotado' };
  const com = ops.filter((o) => o.price != null);
  if (!com.length) return { tipo: 'consultar' };
  const menor = com.reduce((a, b) => (efetivo(b)! < efetivo(a)! ? b : a));
  const valores = new Set(ops.map((o) => efetivo(o)));
  const de = menor.promo != null ? menor.price : null;
  return { tipo: 'preco', valor: efetivo(menor)!, de, aPartir: valores.size > 1, desconto: de ? Math.round((1 - efetivo(menor)! / de) * 100) : 0 };
}

export const temPromocao = (p: PublicProduct) => opcoes(p).some((o) => o.promo != null);
export const temEstoque = (p: PublicProduct) => opcoes(p).length > 0;
const DIAS_NOVO = 7;
export const ehNovo = (p: PublicProduct) => Date.now() - Date.parse(p.createdAt) < DIAS_NOVO * 24 * 60 * 60 * 1000;

/** Minúsculas, sem acento e sem espaços nas pontas ("Maçã " == "maca"). */
export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** 40000 → "40.000 Puffs" */
export const formatarPuffs = (p: number) => `${Number(p).toLocaleString('pt-BR')} Puffs`;

export const waLink = (numero: string, msg: string) => `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

export const logoUrl = (v: number) => url(`api/logo${v ? `?v=${v}` : ''}`);

// Último catálogo guardado no navegador: na próxima visita aparece na hora e a versão nova
// substitui assim que chega.
const CACHE_KEY = 'reidopod:catalogo:v3';
function lerCache(): Catalog | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    return c && Array.isArray(c.products) && Array.isArray(c.categories) ? c : null;
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
