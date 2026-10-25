import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { efetivo, normalizar, opcoes, resumoPreco, temEstoque, temPromocao, useCatalog, type PublicProduct } from '../../lib/catalog';
import { GradeEsqueleto, GradeProdutos, StoreLayout } from '../../components/Store';
import { useTitulo } from '../../components/Site';
import { IconBusca } from '../../components/icons';

const ORDENS = [
  ['loja', 'Destaques da loja'],
  ['menor', 'Menor preço'],
  ['maior', 'Maior preço'],
  ['novos', 'Mais novos'],
  ['promocao', 'Promoções primeiro'],
] as const;
type Ordem = (typeof ORDENS)[number][0];

const precoMin = (p: PublicProduct) => {
  const r = resumoPreco(p);
  return r.tipo === 'preco' ? r.valor : null;
};
const precoMax = (p: PublicProduct) => {
  const v = opcoes(p).map(efetivo).filter((x): x is number => x != null);
  return v.length ? Math.max(...v) : null;
};

export default function Produtos() {
  useTitulo('Produtos — REI DO POD CAF');
  const { catalog, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const ordem = (ORDENS.some(([k]) => k === params.get('ordem')) ? params.get('ordem') : 'loja') as Ordem;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('busca')) inputRef.current?.focus();
  }, [params]);

  function set(k: string, v: string) {
    const n = new URLSearchParams(params);
    n.delete('busca');
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  }

  const categorias = catalog?.categories ?? [];
  const catAtiva = categorias.some((c) => c.name === cat) ? cat : '';

  const lista = useMemo(() => {
    const termo = normalizar(q);
    const base = (catalog?.products ?? []).filter(
      (p) =>
        (!catAtiva || p.brand === catAtiva) &&
        (!termo || [p.name, p.brand, p.series, ...p.flavors.filter((f) => f.available).map((f) => f.name)].some((t) => normalizar(t).includes(termo)))
    );
    const idx = new Map(base.map((p, i) => [p.uid, i]));
    const cmpNull = (a: number | null, b: number | null, dir: 1 | -1) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : (a - b) * dir);
    const ord = [...base].sort((a, b) => {
      // Esgotados sempre no fim.
      const e = Number(!temEstoque(a)) - Number(!temEstoque(b));
      if (e) return e;
      let r = 0;
      if (ordem === 'menor') r = cmpNull(precoMin(a), precoMin(b), 1);
      else if (ordem === 'maior') r = cmpNull(precoMax(a), precoMax(b), -1);
      else if (ordem === 'novos') r = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      else if (ordem === 'promocao') r = Number(temPromocao(b)) - Number(temPromocao(a));
      return r || idx.get(a.uid)! - idx.get(b.uid)!;
    });
    return ord;
  }, [catalog, q, catAtiva, ordem]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 pt-5 md:pt-8">
        <h1 className="font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-none">
          {catAtiva ? catAtiva : q ? 'Busca' : <>Todos os <span className="texto-ouro">produtos</span></>}
        </h1>

        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mt-4 space-y-3 border-b border-borda bg-fundo/90 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
          <div className="relative md:hidden">
            <IconBusca className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
            <input
              ref={inputRef}
              type="search"
              className="busca"
              placeholder="Buscar pod, sabor ou acessório…"
              value={q}
              onChange={(e) => set('q', e.target.value)}
              aria-label="Buscar produtos"
              enterKeyHint="search"
            />
          </div>
          <div className="chips" role="group" aria-label="Filtrar por categoria">
            <button type="button" className="chip" aria-pressed={!catAtiva} onClick={() => set('cat', '')}>
              Todas
            </button>
            {categorias.map((c) => (
              <button key={c.name} type="button" className="chip" aria-pressed={c.name === catAtiva} onClick={() => set('cat', c.name)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="my-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-texto-2">
            {catalog ? `${lista.length} ${lista.length === 1 ? 'produto' : 'produtos'}` : 'Carregando…'}
            {q && <> para “<span className="text-texto">{q}</span>”</>}
          </p>
          <label className="flex items-center gap-2 text-sm text-texto-2">
            Ordenar
            <select
              className="min-h-11 rounded-xl border border-borda bg-superficie px-3 text-base text-texto outline-none focus:border-ouro/60 sm:text-sm"
              value={ordem}
              onChange={(e) => set('ordem', e.target.value === 'loja' ? '' : e.target.value)}
            >
              {ORDENS.map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pb-12">
          {!catalog && !error && <GradeEsqueleto />}
          {!catalog && error && <p className="py-10 text-center text-sm text-orange-300">Não foi possível carregar os produtos — tente recarregar a página.</p>}
          {catalog && lista.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-stone-400">
              Nada encontrado para “<span className="text-stone-100">{[q.trim(), catAtiva].filter(Boolean).join(' em ')}</span>”. Tente outro nome de produto ou sabor.
            </div>
          )}
          {lista.length > 0 && <GradeProdutos produtos={lista} />}
        </div>
      </div>
    </StoreLayout>
  );
}
