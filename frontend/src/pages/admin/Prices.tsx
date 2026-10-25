import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText, url } from '../../lib/api';
import { normalizar, useCatalog } from '../../lib/catalog';
import { centsToInput, erroPreco, inputToCents, limparPreco } from '../../lib/money';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconBusca, IconFoto } from '../../components/icons';
import type { Brand, Product } from './types';

type Par = { price: string; promo: string };
const chaveP = (id: string) => `p:${id}`;
const chaveF = (id: string) => `f:${id}`;

function CampoPreco({
  valor,
  onChange,
  placeholder,
  rotulo,
  invalido,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  rotulo: string;
  invalido: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-texto-3">R$</span>
      <input
        className={`adm-input pl-9 pr-2 tabular-nums ${invalido ? '!border-red-400/70' : ''}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(limparPreco(e.target.value))}
        aria-label={rotulo}
        aria-invalid={invalido}
      />
    </div>
  );
}

export default function Prices() {
  useTitulo('Preços — Painel');
  const toast = useToast();
  const { reload } = useCatalog();
  const [list, setList] = useState<Product[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [erro, setErro] = useState('');
  const [edits, setEdits] = useState<Record<string, Par>>({});
  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState('');
  const [verSabores, setVerSabores] = useState(false);
  const [lote, setLote] = useState<Par>({ price: '', promo: '' });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      const [p, b] = await Promise.all([api<Product[]>('admin/products'), api<Brand[]>('admin/brands')]);
      setList(p);
      setBrands(b);
      setEdits({});
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar os produtos'));
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  // Valor original de cada campo (para saber o que mudou).
  const originais = useMemo(() => {
    const m: Record<string, Par & { nome: string }> = {};
    for (const p of list ?? []) {
      m[chaveP(p.id)] = { price: centsToInput(p.priceCents), promo: centsToInput(p.promoCents), nome: p.name };
      for (const f of p.flavors) m[chaveF(f.id)] = { price: centsToInput(f.priceCents), promo: centsToInput(f.promoCents), nome: `${p.name} — ${f.name}` };
    }
    return m;
  }, [list]);

  const valor = (k: string): Par => edits[k] ?? originais[k] ?? { price: '', promo: '' };
  const mudar = (k: string, campo: keyof Par, v: string) => setEdits((e) => ({ ...e, [k]: { ...valor(k), [campo]: v } }));

  const alterados = Object.keys(edits).filter((k) => {
    const o = originais[k];
    const e = edits[k];
    return o && (inputToCents(e.price) !== inputToCents(o.price) || inputToCents(e.promo) !== inputToCents(o.promo) || Number.isNaN(inputToCents(e.price)) || Number.isNaN(inputToCents(e.promo)));
  });
  const erroDe = (k: string) => {
    const v = valor(k);
    return erroPreco(inputToCents(v.price), inputToCents(v.promo));
  };
  const comErro = alterados.filter((k) => erroDe(k));

  const visiveis = useMemo(() => {
    const t = normalizar(busca);
    return (list ?? []).filter(
      (p) => (!marca || p.brandId === marca) && (!t || [p.name, p.brand.name, ...p.flavors.map((f) => f.name)].some((x) => normalizar(x).includes(t)))
    );
  }, [list, busca, marca]);

  function aplicarLote() {
    const price = inputToCents(lote.price);
    const promo = inputToCents(lote.promo);
    const msg = lote.price.trim() ? erroPreco(price, promo) : 'Informe o preço';
    if (msg) return toast(msg, true);
    setEdits((e) => {
      const n = { ...e };
      for (const p of visiveis) n[chaveP(p.id)] = { price: lote.price, promo: lote.promo };
      return n;
    });
    toast(`Preço aplicado em ${visiveis.length} produto(s). Confira e toque em Salvar.`);
  }

  async function salvar() {
    if (comErro.length) return toast(`Corrija ${comErro.length} preço(s) marcado(s) em vermelho`, true);
    const body = { products: [] as unknown[], flavors: [] as unknown[] };
    for (const k of alterados) {
      const v = valor(k);
      const item = { id: k.slice(2), name: originais[k].nome, priceCents: inputToCents(v.price), promoCents: inputToCents(v.promo) };
      (k.startsWith('p:') ? body.products : body.flavors).push(item);
    }
    setSalvando(true);
    try {
      await api('admin/prices', { method: 'PUT', body });
      toast(`${alterados.length} preço(s) salvo(s)`);
      reload();
      await carregar();
    } catch (e) {
      toast(errorText(e, 'Não foi possível salvar'), true);
    } finally {
      setSalvando(false);
    }
  }

  const precoProduto = (p: Product) => {
    const v = valor(chaveP(p.id));
    return v.price ? `${v.price}` : 'do produto';
  };

  return (
    <div className={alterados.length ? 'pb-24 lg:pb-20' : ''}>
      <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Preços</h1>
      <p className="mb-5 text-sm text-texto-2">
        Edite vários e salve de uma vez. Vazio = “Consultar”. Promoção é opcional e precisa ser menor que o preço. Preço de sabor sobrepõe o do
        produto.
      </p>

      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <IconBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
          <input type="search" className="adm-input pl-10 pr-3" placeholder="Buscar produto ou sabor…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
        </div>
        <select className="adm-input px-3 sm:w-52" value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-card mb-4 space-y-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Mostrar sabores</p>
            <p className="text-xs text-texto-3">Para dar preço próprio a um sabor.</p>
          </div>
          <Switch checked={verSabores} onChange={setVerSabores} label="Mostrar sabores" />
        </div>
        <div className="border-t border-borda pt-3">
          <p className="mb-2 text-sm font-semibold">Mesmo preço para os {visiveis.length} produtos listados</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <CampoPreco valor={lote.price} onChange={(v) => setLote((l) => ({ ...l, price: v }))} placeholder="Preço" rotulo="Preço para todos" invalido={false} />
            <CampoPreco valor={lote.promo} onChange={(v) => setLote((l) => ({ ...l, promo: v }))} placeholder="Promoção" rotulo="Promoção para todos" invalido={false} />
            <button type="button" className="adm-btn adm-btn-ghost col-span-2 px-4 sm:col-span-1" disabled={!visiveis.length} onClick={aplicarLote}>
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {erro && <div className="adm-card mb-4 p-4 text-sm text-red-300">{erro}</div>}
      {!list && !erro && <div className="adm-card h-96 animate-pulse" />}
      {list && visiveis.length === 0 && <div className="adm-card p-8 text-center text-sm text-texto-2">Nenhum produto encontrado.</div>}

      {/* Desktop: tabela */}
      {list && visiveis.length > 0 && (
        <div className="adm-card hidden overflow-hidden md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-borda text-left text-xs uppercase tracking-wider text-texto-3">
              <tr>
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="w-44 px-2 py-3 font-semibold">Preço</th>
                <th className="w-44 px-2 py-3 font-semibold">Promoção</th>
                <th className="w-40 px-4 py-3 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => {
                const k = chaveP(p.id);
                const v = valor(k);
                const e = erroDe(k);
                return [
                  <tr key={k} className={`border-b border-borda/60 ${alterados.includes(k) ? 'bg-ouro/[.04]' : ''}`}>
                    <td className="px-4 py-2">
                      <Link to={`/admin/produtos/${p.id}`} className="flex min-w-0 items-center gap-3 hover:text-ouro">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fundo">
                          {p.photoUrl ? <img src={url(p.photoUrl)} alt="" loading="lazy" className="max-h-9 max-w-9 object-contain" /> : <IconFoto className="h-5 w-5 text-texto-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{p.name}</span>
                          <span className="block truncate text-xs text-texto-3">{p.brand.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      <CampoPreco valor={v.price} onChange={(x) => mudar(k, 'price', x)} placeholder="Consultar" rotulo={`Preço de ${p.name}`} invalido={!!e} />
                    </td>
                    <td className="px-2 py-2">
                      <CampoPreco valor={v.promo} onChange={(x) => mudar(k, 'promo', x)} placeholder="—" rotulo={`Promoção de ${p.name}`} invalido={!!e} />
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {e ? <span className="text-red-300">{e}</span> : alterados.includes(k) ? <span className="text-ouro">Alterado</span> : <span className="text-texto-3">{p.active ? 'Na loja' : 'Inativo'}</span>}
                    </td>
                  </tr>,
                  ...(verSabores && !p.noFlavor
                    ? p.flavors.map((f) => {
                        const kf = chaveF(f.id);
                        const vf = valor(kf);
                        const ef = erroDe(kf);
                        return (
                          <tr key={kf} className={`border-b border-borda/40 text-xs ${alterados.includes(kf) ? 'bg-ouro/[.04]' : ''}`}>
                            <td className="py-1.5 pl-[4.25rem] pr-4">
                              <span className={`font-semibold uppercase tracking-wide ${f.available ? 'text-texto-2' : 'text-texto-3 line-through'}`}>{f.name}</span>
                              {!f.available && <span className="ml-2 text-amber-300">esgotado</span>}
                            </td>
                            <td className="px-2 py-1.5">
                              <CampoPreco valor={vf.price} onChange={(x) => mudar(kf, 'price', x)} placeholder={precoProduto(p)} rotulo={`Preço de ${f.name}`} invalido={!!ef} />
                            </td>
                            <td className="px-2 py-1.5">
                              <CampoPreco valor={vf.promo} onChange={(x) => mudar(kf, 'promo', x)} placeholder="—" rotulo={`Promoção de ${f.name}`} invalido={!!ef} />
                            </td>
                            <td className="px-4 py-1.5">{ef ? <span className="text-red-300">{ef}</span> : alterados.includes(kf) ? <span className="text-ouro">Alterado</span> : null}</td>
                          </tr>
                        );
                      })
                    : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Celular: cartões */}
      {list && visiveis.length > 0 && (
        <ul className="space-y-2 md:hidden">
          {visiveis.map((p) => {
            const k = chaveP(p.id);
            const v = valor(k);
            const e = erroDe(k);
            return (
              <li key={k} className={`adm-card p-3 ${alterados.includes(k) ? 'border-ouro/40' : ''}`}>
                <Link to={`/admin/produtos/${p.id}`} className="mb-2 flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-fundo">
                    {p.photoUrl ? <img src={url(p.photoUrl)} alt="" loading="lazy" className="max-h-10 max-w-10 object-contain" /> : <IconFoto className="h-5 w-5 text-texto-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-texto-3">
                      {p.brand.name}
                      {p.active ? '' : ' · inativo'}
                    </span>
                  </span>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <label className="min-w-0 space-y-1">
                    <span className="adm-label text-[11px]">Preço</span>
                    <CampoPreco valor={v.price} onChange={(x) => mudar(k, 'price', x)} placeholder="Consultar" rotulo={`Preço de ${p.name}`} invalido={!!e} />
                  </label>
                  <label className="min-w-0 space-y-1">
                    <span className="adm-label text-[11px]">Promoção</span>
                    <CampoPreco valor={v.promo} onChange={(x) => mudar(k, 'promo', x)} placeholder="—" rotulo={`Promoção de ${p.name}`} invalido={!!e} />
                  </label>
                </div>
                {e && <p className="mt-1 text-xs text-red-300">{e}</p>}
                {verSabores && !p.noFlavor && p.flavors.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-borda pt-3">
                    {p.flavors.map((f) => {
                      const kf = chaveF(f.id);
                      const vf = valor(kf);
                      const ef = erroDe(kf);
                      return (
                        <li key={kf}>
                          <p className={`mb-1 break-words text-xs font-semibold uppercase tracking-wide ${f.available ? 'text-texto-2' : 'text-texto-3 line-through'}`}>
                            {f.name}
                            {!f.available && <span className="ml-1 normal-case text-amber-300 no-underline">(esgotado)</span>}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <CampoPreco valor={vf.price} onChange={(x) => mudar(kf, 'price', x)} placeholder={precoProduto(p)} rotulo={`Preço de ${f.name}`} invalido={!!ef} />
                            <CampoPreco valor={vf.promo} onChange={(x) => mudar(kf, 'promo', x)} placeholder="—" rotulo={`Promoção de ${f.name}`} invalido={!!ef} />
                          </div>
                          {ef && <p className="mt-1 text-xs text-red-300">{ef}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {alterados.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-ouro/30 bg-superficie-2/95 px-4 py-3 backdrop-blur-md lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <p className="min-w-0 text-sm">
              <span className="font-semibold">{alterados.length}</span> {alterados.length === 1 ? 'alteração' : 'alterações'}
              {comErro.length > 0 && <span className="text-red-300"> · {comErro.length} com erro</span>}
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" className="adm-btn adm-btn-ghost px-3" onClick={() => setEdits({})}>
                Desfazer
              </button>
              <button type="button" className="botao-ouro adm-btn px-5 font-bold" disabled={salvando} onClick={salvar}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
