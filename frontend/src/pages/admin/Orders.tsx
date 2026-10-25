import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorText } from '../../lib/api';
import { brl } from '../../lib/catalog';
import { ROTULO, dataHora, numero, type Pedido, type Situacao } from '../../lib/orders';
import { ChipSituacao } from '../../components/Pedido';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconBusca } from '../../components/icons';

type Resumo = { novos: number; confirmados: number; emRota: number; hojeCents: number; hojePedidos: number; mesCents: number; mesPedidos: number };

const FILTROS: [string, string][] = [
  ['abertos', 'Em aberto'],
  ['recebido', 'Novos'],
  ['confirmado', 'Confirmados'],
  ['em_rota', 'Em rota'],
  ['entregue', 'Entregues'],
  ['cancelado', 'Cancelados'],
  ['todos', 'Todos'],
];

export const PROXIMO: Partial<Record<Situacao, [Situacao, string]>> = {
  recebido: ['confirmado', 'Confirmar'],
  confirmado: ['em_rota', 'Saiu para entrega'],
  em_rota: ['entregue', 'Entregue'],
};

function Card({ titulo, valor, sub, destaque }: { titulo: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`adm-card min-w-0 p-3 sm:p-4 ${destaque ? 'border-ouro/40 bg-ouro/[.06]' : ''}`}>
      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-texto-3">{titulo}</p>
      <p className={`truncate font-display text-2xl font-extrabold sm:text-3xl ${destaque ? 'text-ouro' : ''}`}>{valor}</p>
      {sub && <p className="truncate text-xs text-texto-3">{sub}</p>}
    </div>
  );
}

export default function Orders() {
  useTitulo('Pedidos — Painel');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const filtro = params.get('s') || 'abertos';
  const [busca, setBusca] = useState(params.get('q') || '');
  const q = params.get('q') || '';
  const [lista, setLista] = useState<Pedido[] | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (filtro !== 'todos') qs.set('status', filtro);
      if (q) qs.set('q', q);
      const [l, r] = await Promise.all([api<Pedido[]>(`admin/orders?${qs}`), api<Resumo>('admin/summary')]);
      setLista(l);
      setResumo(r);
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar os pedidos'));
    }
  }, [filtro, q]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 20000);
    return () => clearInterval(t);
  }, [carregar]);

  // Busca ao parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => {
      if (busca.trim() === q) return;
      const n = new URLSearchParams(params);
      if (busca.trim()) n.set('q', busca.trim());
      else n.delete('q');
      setParams(n, { replace: true });
    }, 350);
    return () => clearTimeout(t);
  }, [busca, q, params, setParams]);

  function setFiltro(s: string) {
    const n = new URLSearchParams(params);
    if (s === 'abertos') n.delete('s');
    else n.set('s', s);
    setParams(n, { replace: true });
  }

  async function avancar(p: Pedido) {
    const prox = PROXIMO[p.status];
    if (!prox) return;
    try {
      await api(`admin/orders/${p.id}`, { method: 'PATCH', body: { status: prox[0] } });
      toast(`Pedido ${numero(p.number)}: ${ROTULO[prox[0]]}`);
      window.dispatchEvent(new Event('rdp:pedidos'));
      carregar();
    } catch (e) {
      toast(errorText(e), true);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Pedidos</h1>
      <p className="mb-4 text-sm text-texto-2">Painel do dia · atualiza sozinho</p>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <Card titulo="Novos" valor={String(resumo?.novos ?? '–')} sub="aguardando confirmar" destaque={!!resumo?.novos} />
        <Card titulo="Confirmados" valor={String(resumo?.confirmados ?? '–')} sub="separar e sair" />
        <Card titulo="Em rota" valor={String(resumo?.emRota ?? '–')} sub="saíram para entrega" />
        <Card titulo="Vendido hoje" valor={resumo ? brl(resumo.hojeCents) : '–'} sub={resumo ? `${resumo.hojePedidos} pedido(s)` : ''} />
        <Card titulo="Vendido no mês" valor={resumo ? brl(resumo.mesCents) : '–'} sub={resumo ? `${resumo.mesPedidos} pedido(s)` : ''} />
      </div>

      <div className="mb-3 relative">
        <IconBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
        <input
          type="search"
          className="adm-input pl-10 pr-3"
          placeholder="Buscar por nº, cliente, celular ou bairro…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar pedidos"
        />
      </div>
      <div className="chips mb-4" role="group" aria-label="Filtrar por situação">
        {FILTROS.map(([k, t]) => (
          <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>
            {t}
            {k === 'recebido' && resumo?.novos ? <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[11px] text-white">{resumo.novos}</span> : null}
          </button>
        ))}
      </div>

      {erro && <div className="adm-card mb-4 p-4 text-sm text-red-300">{erro}</div>}
      {!lista && !erro && (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="adm-card h-24 animate-pulse" />
          ))}
        </div>
      )}
      {lista && lista.length === 0 && (
        <div className="adm-card p-8 text-center text-sm text-texto-2">{q ? `Nenhum pedido encontrado para “${q}”.` : 'Nenhum pedido nesta situação.'}</div>
      )}

      <ul className="grid gap-2 xl:grid-cols-2">
        {lista?.map((p) => {
          const prox = PROXIMO[p.status];
          const qtd = p.items.reduce((t, i) => t + i.quantity, 0);
          return (
            <li key={p.id} className={`adm-card flex flex-col gap-3 p-3 sm:p-4 ${p.status === 'recebido' ? 'border-sky-400/40' : ''}`}>
              <Link to={`/admin/pedidos/${p.id}`} className="block min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-xl font-extrabold">
                      {numero(p.number)} <span className="font-sans text-xs font-normal text-texto-3">{dataHora(p.createdAt)}</span>
                    </p>
                    <p className="truncate font-semibold">{p.customerName}</p>
                    <p className="truncate text-xs text-texto-3">
                      {p.district} · {qtd} {qtd === 1 ? 'item' : 'itens'}
                      {p.latitude != null && ' · 📍'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ChipSituacao s={p.status} />
                    <span className="font-bold">{brl(p.totalCents)}</span>
                    {p.paid && <span className="rounded bg-emerald-500/15 px-1.5 text-[11px] font-semibold text-emerald-300">Pago</span>}
                  </div>
                </div>
              </Link>
              {prox && (
                <button type="button" className="botao-ouro adm-btn w-full px-4 text-sm font-bold" onClick={() => avancar(p)}>
                  {prox[1]}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
