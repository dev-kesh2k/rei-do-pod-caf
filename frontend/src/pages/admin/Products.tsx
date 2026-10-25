import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText, url } from '../../lib/api';
import { brl, normalizar, useCatalog } from '../../lib/catalog';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconBaixo, IconBusca, IconCima, IconFoto, IconMais } from '../../components/icons';
import type { Brand, Product } from './types';

export default function Products() {
  useTitulo('Produtos — Painel');
  const toast = useToast();
  const { reload } = useCatalog();
  const [list, setList] = useState<Product[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState('');

  async function carregar() {
    try {
      const [p, b] = await Promise.all([api<Product[]>('admin/products'), api<Brand[]>('admin/brands')]);
      setList(p);
      setBrands(b);
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar os produtos'));
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  const filtrando = !!busca.trim() || !!marca;
  const visiveis = useMemo(() => {
    const t = normalizar(busca);
    return (list ?? []).filter(
      (p) => (!marca || p.brandId === marca) && (!t || [p.name, p.series, ...p.flavors.map((f) => f.name)].some((x) => normalizar(x).includes(t)))
    );
  }, [list, busca, marca]);

  async function alternarAtivo(p: Product, active: boolean) {
    setList((l) => l?.map((x) => (x.id === p.id ? { ...x, active } : x)) ?? l);
    try {
      await api(`admin/products/${p.id}`, { method: 'PUT', body: { active } });
      toast(active ? `${p.name} aparece no catálogo` : `${p.name} saiu do catálogo`);
      reload();
    } catch (e) {
      setList((l) => l?.map((x) => (x.id === p.id ? { ...x, active: !active } : x)) ?? l);
      toast(errorText(e), true);
    }
  }

  async function mover(i: number, dir: -1 | 1) {
    if (!list) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const nova = [...list];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setList(nova);
    try {
      await api('admin/products/order', { method: 'PUT', body: { ids: nova.map((p) => p.id) } });
      reload();
    } catch (e) {
      toast(errorText(e), true);
      carregar();
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Produtos</h1>
          <p className="text-sm text-texto-2">
            {list ? `${list.length} produtos · ${list.filter((p) => p.active).length} no catálogo` : 'Carregando…'}
          </p>
        </div>
        <Link to="/admin/produtos/novo" className="botao-ouro adm-btn px-4 text-sm font-bold">
          <IconMais className="h-5 w-5" />
          Novo produto
        </Link>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <IconBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
          <input
            type="search"
            className="adm-input pl-10 pr-3"
            placeholder="Buscar produto ou sabor…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Buscar produto ou sabor"
          />
        </div>
        <select className="adm-input px-3 sm:w-48" value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <div className="adm-card mb-4 p-4 text-sm text-red-300">
          {erro}{' '}
          <button className="ml-1 underline" onClick={carregar}>
            Tentar de novo
          </button>
        </div>
      )}

      {!list && !erro && (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="adm-card h-[5.5rem] animate-pulse" />
          ))}
        </div>
      )}

      {list && visiveis.length === 0 && (
        <div className="adm-card p-8 text-center text-sm text-texto-2">
          {list.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado com esse filtro.'}
        </div>
      )}

      <ul className="space-y-2">
        {visiveis.map((p) => {
          const i = list!.indexOf(p);
          const disp = p.flavors.filter((f) => f.available).length;
          const semEstoque = p.noFlavor ? !p.inStock : disp === 0;
          return (
            <li key={p.id} className={`adm-card flex items-center gap-2 p-2 pr-1 sm:gap-3 sm:p-3 ${p.active ? '' : 'opacity-60'}`}>
              <Link to={`/admin/produtos/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-fundo">
                  {p.photoUrl ? (
                    <img src={url(p.photoUrl)} alt="" loading="lazy" className="max-h-14 max-w-14 object-contain" />
                  ) : (
                    <IconFoto className="h-6 w-6 text-texto-3" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-extrabold uppercase leading-tight sm:text-xl">{p.name}</p>
                  <p className="truncate text-xs text-texto-2">
                    {p.brand.name} ·{' '}
                    {p.priceCents == null ? (
                      'Consultar'
                    ) : p.promoCents != null ? (
                      <>
                        <span className="line-through">{brl(p.priceCents)}</span> <span className="font-semibold text-ouro">{brl(p.promoCents)}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-texto">{brl(p.priceCents)}</span>
                    )}
                    {p.featured && ' · ★'}
                  </p>
                  <p className={`truncate text-xs font-medium ${semEstoque ? 'text-amber-300' : 'text-texto-3'}`}>
                    {p.noFlavor
                      ? p.inStock
                        ? 'Sem sabores · em estoque'
                        : 'Sem sabores · esgotado'
                      : `${disp}/${p.flavors.length} sabores disponíveis`}
                    {p.flavors.some((f) => f.priceCents != null) && ' · preço por sabor'}
                    {!p.active && ' · inativo'}
                  </p>
                </div>
              </Link>
              {!filtrando && (
                <div className="hidden flex-col sm:flex">
                  <button className="adm-icon-btn h-9" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${p.name}`}>
                    <IconCima />
                  </button>
                  <button className="adm-icon-btn h-9" onClick={() => mover(i, 1)} disabled={i === list!.length - 1} aria-label={`Descer ${p.name}`}>
                    <IconBaixo />
                  </button>
                </div>
              )}
              <Switch checked={p.active} onChange={(v) => alternarAtivo(p, v)} label={`${p.name} ativo no catálogo`} />
            </li>
          );
        })}
      </ul>
      {list && list.length > 1 && !filtrando && (
        <p className="mt-4 text-center text-xs text-texto-3">
          A ordem desta lista é a ordem “Destaques da loja”. No celular, mude a ordem dentro de cada produto.
        </p>
      )}
    </div>
  );
}
