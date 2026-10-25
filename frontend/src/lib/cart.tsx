import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { brl, efetivo, useCatalog, type PublicFlavor, type PublicProduct, type Settings } from './catalog';

type Item = { pid: string; fid: string | null; qty: number };
export type Linha = {
  key: string;
  item: Item;
  produto: PublicProduct | null;
  sabor: PublicFlavor | null;
  disponivel: boolean;
  unit: number | null; // null = "Consultar"
  de: number | null;
  total: number | null;
};

const KEY = 'rdp:carrinho';
export const MAX_QTD = 99;
const chave = (pid: string, fid: string | null) => `${pid}:${fid ?? '-'}`;

function ler(): Item[] {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(l) ? l.filter((i) => i && typeof i.pid === 'string' && Number.isInteger(i.qty) && i.qty > 0) : [];
  } catch {
    return [];
  }
}

type Ctx = {
  linhas: Linha[];
  quantidade: number;
  total: number;
  aConsultar: number;
  adicionar: (pid: string, fid: string | null, qty: number) => void;
  alterar: (key: string, qty: number) => void;
  remover: (key: string) => void;
  limpar: () => void;
};
const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { catalog } = useCatalog();
  const [itens, setItens] = useState<Item[]>(ler);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(itens));
    } catch {
      /* sem armazenamento */
    }
  }, [itens]);

  // Outra aba mexeu no carrinho.
  useEffect(() => {
    const on = (e: StorageEvent) => e.key === KEY && setItens(ler());
    window.addEventListener('storage', on);
    return () => window.removeEventListener('storage', on);
  }, []);

  const adicionar = useCallback((pid: string, fid: string | null, qty: number) => {
    setItens((l) => {
      const k = chave(pid, fid);
      const i = l.findIndex((x) => chave(x.pid, x.fid) === k);
      if (i < 0) return [...l, { pid, fid, qty: Math.min(qty, MAX_QTD) }];
      const n = [...l];
      n[i] = { ...n[i], qty: Math.min(n[i].qty + qty, MAX_QTD) };
      return n;
    });
  }, []);
  const alterar = useCallback(
    (key: string, qty: number) => setItens((l) => l.map((x) => (chave(x.pid, x.fid) === key ? { ...x, qty: Math.max(1, Math.min(qty, MAX_QTD)) } : x))),
    []
  );
  const remover = useCallback((key: string) => setItens((l) => l.filter((x) => chave(x.pid, x.fid) !== key)), []);
  const limpar = useCallback(() => setItens([]), []);

  // Preço e disponibilidade sempre do catálogo atual (nada fica "preso" no carrinho).
  const linhas = useMemo<Linha[]>(() => {
    const porId = new Map((catalog?.products ?? []).map((p) => [p.uid, p]));
    return itens.map((item) => {
      const produto = porId.get(item.pid) ?? null;
      const sabor = produto && item.fid ? produto.flavors.find((f) => f.id === item.fid) ?? null : null;
      let disponivel = false;
      let oferta = { price: null as number | null, promo: null as number | null };
      if (produto) {
        if (item.fid) {
          disponivel = !!sabor?.available && !produto.noFlavor;
          if (sabor) oferta = sabor;
        } else {
          disponivel = produto.noFlavor && produto.inStock;
          oferta = produto;
        }
      }
      const unit = disponivel ? efetivo(oferta) : null;
      return {
        key: chave(item.pid, item.fid),
        item,
        produto,
        sabor,
        disponivel,
        unit,
        de: disponivel && oferta.promo != null ? oferta.price : null,
        total: unit == null ? null : unit * item.qty,
      };
    });
  }, [itens, catalog]);

  const validas = linhas.filter((l) => l.disponivel);
  const value: Ctx = {
    linhas,
    quantidade: itens.reduce((s, i) => s + i.qty, 0),
    total: validas.reduce((s, l) => s + (l.total ?? 0), 0),
    aConsultar: validas.filter((l) => l.unit == null).length,
    adicionar,
    alterar,
    remover,
    limpar,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error('CartProvider ausente');
  return c;
}

/** Texto do pedido para o WhatsApp: itens, quantidades, valores e total. */
export function mensagemCarrinho(s: Settings, linhas: Linha[], extra: { nome?: string; obs?: string }) {
  const validas = linhas.filter((l) => l.disponivel && l.produto);
  const itens = validas.map((l, i) => {
    const nome = [l.produto!.name, l.sabor?.name].filter(Boolean).join(' — ');
    const valor = l.total == null ? 'Consultar' : `${brl(l.total)}${l.item.qty > 1 ? ` (${brl(l.unit!)} cada)` : ''}`;
    return `${i + 1}) ${l.item.qty}x ${nome} — ${valor}`;
  });
  const total = validas.reduce((t, l) => t + (l.total ?? 0), 0);
  const consultar = validas.filter((l) => l.total == null).length;
  const linhaTotal =
    total > 0
      ? `*Total: ${brl(total)}*${consultar ? ` + ${consultar} ${consultar === 1 ? 'item' : 'itens'} a consultar` : ''}`
      : '*Total: a consultar*';
  const dados = [extra.nome?.trim() ? `Nome: ${extra.nome.trim()}` : '', extra.obs?.trim() ? `Obs.: ${extra.obs.trim()}` : ''].filter(Boolean);
  return [s.msgCart, itens.join('\n'), [linhaTotal, ...dados].join('\n'), s.msgCartEnd]
    .map((b) => b.trim())
    .filter(Boolean)
    .join('\n\n');
}
