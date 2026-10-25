import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorText, url } from '../../lib/api';
import { useCatalog } from '../../lib/catalog';
import { resizeImage } from '../../lib/image';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconBaixo, IconCima, IconFoto, IconLapis, IconLixo, IconVoltar } from '../../components/icons';
import type { Brand, Flavor, Product } from './types';

type Form = {
  name: string;
  brandId: string;
  puffs: string;
  series: string;
  slug: string;
  sortOrder: string;
  active: boolean;
  noFlavor: boolean;
  inStock: boolean;
};

const vazio: Form = { name: '', brandId: '', puffs: '', series: '', slug: '', sortOrder: '', active: true, noFlavor: false, inStock: true };

function toForm(p: Product): Form {
  return {
    name: p.name,
    brandId: p.brandId,
    puffs: p.puffs == null ? '' : String(p.puffs),
    series: p.series,
    slug: p.slug,
    sortOrder: String(p.sortOrder),
    active: p.active,
    noFlavor: p.noFlavor,
    inStock: p.inStock,
  };
}

function Campo({ label, children, dica }: { label: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="adm-label">{label}</span>
      {children}
      {dica && <span className="block text-xs text-texto-3">{dica}</span>}
    </label>
  );
}

function LinhaSwitch({ titulo, texto, checked, onChange }: { titulo: string; texto: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-borda bg-fundo/60 px-3.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs text-texto-3">{texto}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={titulo} />
    </div>
  );
}

function SaborItem({
  f,
  primeiro,
  ultimo,
  onToggle,
  onRename,
  onDelete,
  onMove,
  ordenando,
}: {
  ordenando: boolean;
  f: Flavor;
  primeiro: boolean;
  ultimo: boolean;
  onToggle: (v: boolean) => void;
  onRename: (nome: string) => Promise<boolean>;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(f.name);
  useEffect(() => setNome(f.name), [f.name]);

  async function salvar(e?: FormEvent) {
    e?.preventDefault();
    if (!nome.trim() || nome.trim() === f.name) {
      setNome(f.name);
      setEditando(false);
      return;
    }
    if (await onRename(nome.trim())) setEditando(false);
  }

  return (
    <li className="flex items-center gap-1 rounded-xl border border-borda bg-fundo/60 py-1 pl-3 pr-1">
      {editando ? (
        <form onSubmit={salvar} className="flex min-w-0 flex-1 items-center gap-2 py-1">
          <input
            autoFocus
            className="adm-input px-3"
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => salvar()}
            aria-label="Nome do sabor"
          />
        </form>
      ) : (
        <button type="button" onClick={() => setEditando(true)} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left" aria-label={`Renomear ${f.name}`}>
          <span className="min-w-0">
            <span className={`block break-words text-sm font-semibold uppercase tracking-wide ${f.available ? '' : 'text-texto-3 line-through'}`}>{f.name}</span>
            <span className={`block text-[11px] font-semibold ${f.available ? 'text-[#34c759]' : 'text-amber-300'}`}>
              {f.available ? 'Disponível' : 'Esgotado'}
            </span>
          </span>
          <IconLapis className="h-3.5 w-3.5 shrink-0 text-texto-3" />
        </button>
      )}
      <div className="flex shrink-0 items-center">
        {ordenando ? (
          <>
            <button type="button" className="adm-icon-btn" disabled={primeiro} onClick={() => onMove(-1)} aria-label="Subir sabor">
              <IconCima />
            </button>
            <button type="button" className="adm-icon-btn" disabled={ultimo} onClick={() => onMove(1)} aria-label="Descer sabor">
              <IconBaixo />
            </button>
          </>
        ) : (
          <>
            <button type="button" className="adm-icon-btn w-10 hover:text-red-300" onClick={onDelete} aria-label={`Excluir ${f.name}`}>
              <IconLixo />
            </button>
            <Switch checked={f.available} onChange={onToggle} label={`${f.name} disponível`} />
          </>
        )}
      </div>
    </li>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const novo = id === 'novo';
  useTitulo(novo ? 'Novo produto — Painel' : 'Editar produto — Painel');
  const nav = useNavigate();
  const toast = useToast();
  const { reload } = useCatalog();
  const fileRef = useRef<HTMLInputElement>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [produto, setProduto] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [fotoNova, setFotoNova] = useState('');
  const [saboresNovo, setSaboresNovo] = useState('');
  const [novoSabor, setNovoSabor] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [ordenando, setOrdenando] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const b = await api<Brand[]>('admin/brands');
        if (!vivo) return;
        setBrands(b);
        if (novo) setForm({ ...vazio, brandId: b[0]?.id ?? '' });
        else {
          const p = await api<Product>(`admin/products/${id}`);
          if (!vivo) return;
          setProduto(p);
          setForm(toForm(p));
        }
      } catch (e) {
        setErro(errorText(e, 'Não foi possível carregar'));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id, novo]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function escolherFoto(file?: File) {
    if (!file) return;
    try {
      const data = await resizeImage(file, 800);
      if (novo) {
        setFotoNova(data);
        return;
      }
      setEnviandoFoto(true);
      const p = await api<Product>(`admin/products/${id}/photo`, { method: 'PUT', body: { photo: data } });
      setProduto(p);
      toast('Foto atualizada');
      reload();
    } catch (e) {
      toast(errorText(e, 'Não foi possível enviar a foto'), true);
    } finally {
      setEnviandoFoto(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.brandId) return toast('Cadastre uma marca antes (menu Marcas)', true);
    setSalvando(true);
    const body: Record<string, unknown> = {
      name: form.name,
      brandId: form.brandId,
      puffs: form.puffs.trim() === '' ? null : Number(form.puffs.replace(/\D/g, '')),
      series: form.series,
      active: form.active,
      noFlavor: form.noFlavor,
      inStock: form.inStock,
    };
    if (form.slug.trim()) body.slug = form.slug;
    if (form.sortOrder.trim() !== '') body.sortOrder = Number(form.sortOrder);
    try {
      if (novo) {
        if (fotoNova) body.photo = fotoNova;
        body.flavors = saboresNovo.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const p = await api<Product>('admin/products', { method: 'POST', body });
        toast('Produto criado');
        reload();
        nav(`/admin/produtos/${p.id}`, { replace: true });
      } else {
        const p = await api<Product>(`admin/products/${id}`, { method: 'PUT', body });
        setProduto(p);
        setForm(toForm(p));
        toast('Alterações salvas');
        reload();
      }
    } catch (err) {
      toast(errorText(err, 'Não foi possível salvar'), true);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!produto || !confirm(`Excluir "${produto.name}" e todos os sabores? Não dá para desfazer.`)) return;
    try {
      await api(`admin/products/${produto.id}`, { method: 'DELETE' });
      toast('Produto excluído');
      reload();
      nav('/admin', { replace: true });
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  // ---------- Sabores ----------
  const atualizarSabores = (fn: (l: Flavor[]) => Flavor[]) => setProduto((p) => (p ? { ...p, flavors: fn(p.flavors) } : p));

  async function adicionarSabores(e: FormEvent) {
    e.preventDefault();
    if (!produto || !novoSabor.trim()) return;
    try {
      const p = await api<Product>(`admin/products/${produto.id}/flavors`, { method: 'POST', body: { name: novoSabor } });
      setProduto(p);
      setNovoSabor('');
      toast('Sabor adicionado');
      reload();
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  async function alternarSabor(f: Flavor, available: boolean) {
    atualizarSabores((l) => l.map((x) => (x.id === f.id ? { ...x, available } : x)));
    try {
      await api(`admin/flavors/${f.id}`, { method: 'PATCH', body: { available } });
      reload();
    } catch (err) {
      atualizarSabores((l) => l.map((x) => (x.id === f.id ? { ...x, available: !available } : x)));
      toast(errorText(err), true);
    }
  }

  async function renomearSabor(f: Flavor, name: string) {
    try {
      const r = await api<Flavor>(`admin/flavors/${f.id}`, { method: 'PATCH', body: { name } });
      atualizarSabores((l) => l.map((x) => (x.id === f.id ? { ...x, name: r.name } : x)));
      reload();
      return true;
    } catch (err) {
      toast(errorText(err), true);
      return false;
    }
  }

  async function excluirSabor(f: Flavor) {
    if (!confirm(`Excluir o sabor "${f.name}"?`)) return;
    try {
      await api(`admin/flavors/${f.id}`, { method: 'DELETE' });
      atualizarSabores((l) => l.filter((x) => x.id !== f.id));
      reload();
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  async function moverSabor(i: number, dir: -1 | 1) {
    if (!produto) return;
    const l = [...produto.flavors];
    const j = i + dir;
    [l[i], l[j]] = [l[j], l[i]];
    atualizarSabores(() => l);
    try {
      await api(`admin/products/${produto.id}/flavors/order`, { method: 'PUT', body: { ids: l.map((f) => f.id) } });
      reload();
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  async function todosSabores(available: boolean) {
    if (!produto) return;
    const alvo = produto.flavors.filter((f) => f.available !== available);
    if (!alvo.length) return;
    atualizarSabores((l) => l.map((x) => ({ ...x, available })));
    try {
      await Promise.all(alvo.map((f) => api(`admin/flavors/${f.id}`, { method: 'PATCH', body: { available } })));
      toast(available ? 'Todos os sabores disponíveis' : 'Todos os sabores esgotados');
      reload();
    } catch (err) {
      toast(errorText(err), true);
      setProduto(await api<Product>(`admin/products/${produto.id}`));
    }
  }

  if (carregando) return <div className="adm-card h-96 animate-pulse" />;
  if (erro)
    return (
      <div className="adm-card p-6 text-sm text-red-300">
        {erro}{' '}
        <Link to="/admin" className="underline">
          Voltar
        </Link>
      </div>
    );

  const foto = fotoNova || (produto?.photoUrl ? url(produto.photoUrl) : '');
  const disp = produto?.flavors.filter((f) => f.available).length ?? 0;
  const linkProduto = `${location.origin}${import.meta.env.BASE_URL}sabores#${form.slug || 'link'}`;

  return (
    <div>
      <Link to="/admin" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-texto-2 hover:text-ouro">
        <IconVoltar className="h-4 w-4" />
        Produtos
      </Link>
      <h1 className="mb-5 break-words font-display text-3xl font-extrabold uppercase sm:text-4xl">{novo ? 'Novo produto' : produto?.name}</h1>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={salvar} className="adm-card space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-borda bg-fundo sm:h-32 sm:w-32">
              {foto ? (
                <img src={foto} alt="" className="max-h-[90%] max-w-[90%] object-contain" />
              ) : (
                <IconFoto className="h-8 w-8 text-texto-3" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
              <button type="button" className="adm-btn adm-btn-ghost px-4" disabled={enviandoFoto} onClick={() => fileRef.current?.click()}>
                {enviandoFoto ? 'Enviando…' : foto ? 'Trocar foto' : 'Escolher foto'}
              </button>
              <p className="text-xs text-texto-3">PNG com fundo transparente fica igual ao site. A foto é reduzida antes de enviar.</p>
            </div>
          </div>

          <Campo label="Nome">
            <input className="adm-input px-3.5" required maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Marca (filtro)">
              <select className="adm-input px-3" required value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
                {brands.length === 0 && <option value="">Cadastre uma marca</option>}
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.active ? '' : ' (oculta)'}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Puffs" dica="Vazio = sem selo de puffs">
              <input
                className="adm-input px-3.5"
                inputMode="numeric"
                placeholder="Ex.: 40000"
                value={form.puffs}
                onChange={(e) => set('puffs', e.target.value.replace(/\D/g, ''))}
              />
            </Campo>
            <Campo label="Série (selo)">
              <input className="adm-input px-3.5" maxLength={40} placeholder="Ex.: Slim Design" value={form.series} onChange={(e) => set('series', e.target.value)} />
            </Campo>
            <Campo label="Ordem" dica="Menor aparece primeiro">
              <input
                className="adm-input px-3.5"
                inputMode="numeric"
                placeholder="Automática"
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value.replace(/[^\d-]/g, ''))}
              />
            </Campo>
          </div>
          <Campo label="Link do produto" dica={linkProduto}>
            <input
              className="adm-input px-3.5"
              maxLength={60}
              placeholder="Gerado pelo nome"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            />
          </Campo>

          <LinhaSwitch titulo="Ativo" texto="Desligado, o produto some do catálogo." checked={form.active} onChange={(v) => set('active', v)} />
          <LinhaSwitch
            titulo="Produto sem sabores"
            texto="Mostra um botão “Fazer pedido” em vez dos sabores."
            checked={form.noFlavor}
            onChange={(v) => set('noFlavor', v)}
          />
          {form.noFlavor && (
            <LinhaSwitch titulo="Em estoque" texto="Desligado, aparece “Indisponível no momento”." checked={form.inStock} onChange={(v) => set('inStock', v)} />
          )}

          {novo && !form.noFlavor && (
            <Campo label="Sabores (um por linha)">
              <textarea
                className="adm-input min-h-32 px-3.5 py-2.5"
                placeholder={'MORANGO ICE\nUVA ICE'}
                value={saboresNovo}
                onChange={(e) => setSaboresNovo(e.target.value)}
              />
            </Campo>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
            {!novo ? (
              <button type="button" className="adm-btn adm-btn-danger px-4" onClick={excluir}>
                <IconLixo className="h-4 w-4" />
                Excluir produto
              </button>
            ) : (
              <span />
            )}
            <button type="submit" disabled={salvando} className="botao-ouro adm-btn px-6 font-bold">
              {salvando ? 'Salvando…' : novo ? 'Criar produto' : 'Salvar alterações'}
            </button>
          </div>
        </form>

        {!novo && produto && !form.noFlavor && (
          <section className="adm-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl font-extrabold uppercase">Sabores</h2>
              <p className="text-xs text-texto-2">
                {disp} disponíveis · {produto.flavors.length - disp} esgotados
              </p>
            </div>
            <p className="mb-3 text-xs text-texto-3">A chave verde mostra o sabor no catálogo; desligada, ele some na hora (esgotado). Toque no nome para renomear.</p>

            {produto.flavors.length > 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button type="button" className="adm-btn adm-btn-ghost px-3 text-xs" onClick={() => todosSabores(true)}>
                  Todos disponíveis
                </button>
                <button type="button" className="adm-btn adm-btn-ghost px-3 text-xs" onClick={() => todosSabores(false)}>
                  Todos esgotados
                </button>
                <button
                  type="button"
                  className={`adm-btn px-3 text-xs ${ordenando ? 'botao-ouro' : 'adm-btn-ghost'}`}
                  onClick={() => setOrdenando((o) => !o)}
                >
                  {ordenando ? 'Pronto' : 'Ordenar'}
                </button>
              </div>
            )}

            {produto.flavors.length === 0 && (
              <p className="mb-3 rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-texto-3">
                Nenhum sabor ainda: o card aparece como “Indisponível no momento”.
              </p>
            )}
            <ul className="mb-4 space-y-1.5">
              {produto.flavors.map((f, i) => (
                <SaborItem
                  key={f.id}
                  f={f}
                  primeiro={i === 0}
                  ultimo={i === produto.flavors.length - 1}
                  onToggle={(v) => alternarSabor(f, v)}
                  onRename={(n) => renomearSabor(f, n)}
                  onDelete={() => excluirSabor(f)}
                  onMove={(d) => moverSabor(i, d)}
                  ordenando={ordenando}
                />
              ))}
            </ul>

            <form onSubmit={adicionarSabores} className="space-y-2">
              <Campo label="Adicionar sabor" dica="Pode colar vários, um por linha.">
                <textarea
                  className="adm-input min-h-[2.75rem] px-3.5 py-2.5"
                  rows={2}
                  placeholder="Ex.: MORANGO ICE"
                  value={novoSabor}
                  onChange={(e) => setNovoSabor(e.target.value)}
                />
              </Campo>
              <button type="submit" disabled={!novoSabor.trim()} className="adm-btn adm-btn-ghost w-full px-4">
                Adicionar
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
