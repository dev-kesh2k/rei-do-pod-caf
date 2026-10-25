import { useEffect, useState, type FormEvent } from 'react';
import { api, errorText } from '../../lib/api';
import { useCatalog } from '../../lib/catalog';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconBaixo, IconCima, IconLapis, IconLixo } from '../../components/icons';
import type { Brand } from './types';

function TipoSelect({ value, onChange }: { value: Brand['kind']; onChange: (k: Brand['kind']) => void }) {
  return (
    <select className="adm-input px-3" value={value} onChange={(e) => onChange(e.target.value as Brand['kind'])} aria-label="Tipo da categoria">
      <option value="pod">Pods (marca)</option>
      <option value="outro">Outros produtos (acessórios, essências…)</option>
    </select>
  );
}

function MarcaItem({
  b,
  primeiro,
  ultimo,
  onChange,
  onDelete,
  onMove,
}: {
  b: Brand;
  primeiro: boolean;
  ultimo: boolean;
  onChange: (data: Partial<Brand>) => Promise<boolean>;
  onDelete: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(b.name);
  const [tipo, setTipo] = useState(b.kind);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    if (await onChange({ name: nome.trim(), kind: tipo })) setEditando(false);
  }

  if (editando)
    return (
      <li className="adm-card border-ouro/40 p-3">
        <form onSubmit={salvar} className="space-y-3">
          <input autoFocus className="adm-input px-3" maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome da categoria" />
          <TipoSelect value={tipo} onChange={setTipo} />
          <div className="flex justify-end gap-2">
            <button type="button" className="adm-btn adm-btn-ghost px-4" onClick={() => setEditando(false)}>
              Cancelar
            </button>
            <button type="submit" className="botao-ouro adm-btn px-5 font-bold">
              Salvar
            </button>
          </div>
        </form>
      </li>
    );

  return (
    <li className={`adm-card flex items-center gap-1 py-1.5 pl-2 pr-1 sm:pl-3 ${b.active ? '' : 'opacity-60'}`}>
      <div className="flex shrink-0 flex-col">
        <button className="adm-icon-btn h-8 w-9" disabled={primeiro} onClick={() => onMove(-1)} aria-label={`Subir ${b.name}`}>
          <IconCima />
        </button>
        <button className="adm-icon-btn h-8 w-9" disabled={ultimo} onClick={() => onMove(1)} aria-label={`Descer ${b.name}`}>
          <IconBaixo />
        </button>
      </div>
        <button
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => {
            setNome(b.name);
            setTipo(b.kind);
            setEditando(true);
          }}
          aria-label={`Editar ${b.name}`}
        >
          <span className="min-w-0">
            <span className="block truncate font-semibold">{b.name}</span>
            <span className="block text-xs text-texto-3">
              {b.kind === 'outro' ? 'Outros produtos' : 'Pods'} · {b.products} produto{b.products === 1 ? '' : 's'}
              {b.active ? '' : ' · oculta'}
            </span>
          </span>
          <IconLapis className="h-3.5 w-3.5 shrink-0 text-texto-3" />
        </button>
      <button className="adm-icon-btn w-10 hover:text-red-300" onClick={onDelete} aria-label={`Excluir ${b.name}`}>
        <IconLixo />
      </button>
      <Switch checked={b.active} onChange={(v) => onChange({ active: v })} label={`${b.name} visível na loja`} />
    </li>
  );
}

export default function Brands() {
  useTitulo('Categorias — Painel');
  const toast = useToast();
  const { reload } = useCatalog();
  const [list, setList] = useState<Brand[] | null>(null);
  const [erro, setErro] = useState('');
  const [nova, setNova] = useState('');
  const [novaTipo, setNovaTipo] = useState<Brand['kind']>('pod');

  async function carregar() {
    try {
      setList(await api<Brand[]>('admin/brands'));
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar as categorias'));
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!nova.trim()) return;
    try {
      const b = await api<Brand>('admin/brands', { method: 'POST', body: { name: nova, kind: novaTipo } });
      setList((l) => [...(l ?? []), b]);
      setNova('');
      toast('Categoria criada');
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  async function alterar(b: Brand, data: Partial<Brand>) {
    try {
      const r = await api<Brand>(`admin/brands/${b.id}`, { method: 'PUT', body: data });
      setList((l) => l?.map((x) => (x.id === b.id ? r : x)) ?? l);
      if ('active' in data) toast(data.active ? `${b.name} aparece na loja` : `${b.name} e seus produtos saíram da loja`);
      reload();
      return true;
    } catch (err) {
      toast(errorText(err), true);
      return false;
    }
  }

  async function excluir(b: Brand) {
    if (b.products > 0) return toast(`${b.name} tem ${b.products} produto(s). Mude a categoria deles ou exclua-os antes.`, true);
    if (!confirm(`Excluir a categoria "${b.name}"?`)) return;
    try {
      await api(`admin/brands/${b.id}`, { method: 'DELETE' });
      setList((l) => l?.filter((x) => x.id !== b.id) ?? l);
      toast('Categoria excluída');
      reload();
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  async function mover(i: number, d: -1 | 1) {
    if (!list) return;
    const l = [...list];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    setList(l);
    try {
      await api('admin/brands/order', { method: 'PUT', body: { ids: l.map((b) => b.id) } });
      reload();
    } catch (err) {
      toast(errorText(err), true);
      carregar();
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Categorias</h1>
      <p className="mb-5 text-sm text-texto-2">
        Pods ficam por marca (Ignite, Life Pod…); acessórios, essências e afins usam “Outros produtos”. A ordem aqui é a da loja. Só aparecem
        categorias com produto ativo; desligar uma esconde os produtos dela.
      </p>

      <form onSubmit={criar} className="adm-card mb-4 grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]">
        <input className="adm-input min-w-0 px-3.5" maxLength={40} placeholder="Nova categoria (ex.: Acessórios)" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nome da nova categoria" />
        <div className="sm:w-56">
          <TipoSelect value={novaTipo} onChange={setNovaTipo} />
        </div>
        <button type="submit" disabled={!nova.trim()} className="botao-ouro adm-btn shrink-0 px-5 font-bold">
          Criar
        </button>
      </form>

      {erro && <div className="adm-card mb-4 p-4 text-sm text-red-300">{erro}</div>}
      {!list && !erro && <div className="adm-card h-64 animate-pulse" />}
      {list && list.length === 0 && <div className="adm-card p-8 text-center text-sm text-texto-2">Nenhuma categoria cadastrada.</div>}
      <ul className="space-y-2">
        {list?.map((b, i) => (
          <MarcaItem
            key={b.id}
            b={b}
            primeiro={i === 0}
            ultimo={i === list.length - 1}
            onChange={(d) => alterar(b, d)}
            onDelete={() => excluir(b)}
            onMove={(d) => mover(i, d)}
          />
        ))}
      </ul>
    </div>
  );
}
