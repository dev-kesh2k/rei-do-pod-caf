import { brl } from '../lib/catalog';
import { COR, PAGAMENTO, ROTULO, SITUACOES, dataHora, enderecoLinha, type Pedido, type Situacao } from '../lib/orders';
import { IconCheck } from './icons';

export function ChipSituacao({ s, className = '' }: { s: Situacao; className?: string }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${COR[s]} ${className}`}>{ROTULO[s]}</span>;
}

/** Recebido → confirmado → saiu para entrega → entregue. */
export function LinhaDoTempo({ p }: { p: Pedido }) {
  const atual = SITUACOES.indexOf(p.status);
  const quando = [p.createdAt, p.confirmedAt, p.dispatchedAt, p.deliveredAt];
  if (p.status === 'cancelado')
    return (
      <div className="rounded-xl border border-zinc-500/30 bg-zinc-500/10 p-3 text-sm">
        <p className="font-semibold">Pedido cancelado {p.canceledBy === 'cliente' ? 'por você' : 'pela loja'}</p>
        {p.cancelReason && <p className="text-texto-2">Motivo: {p.cancelReason}</p>}
        {p.canceledAt && <p className="text-xs text-texto-3">{dataHora(p.canceledAt)}</p>}
      </div>
    );
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Situação do pedido">
      {SITUACOES.map((s, i) => {
        const feito = i <= atual;
        return (
          <li key={s} className="flex min-w-0 flex-col items-center text-center" aria-current={i === atual ? 'step' : undefined}>
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : feito ? 'bg-ouro' : 'bg-white/10'}`} />
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  feito ? 'botao-ouro' : 'border border-white/15 bg-fundo text-texto-3'
                } ${i === atual ? 'ring-4 ring-ouro/20' : ''}`}
              >
                {i < atual ? <IconCheck className="h-4 w-4" /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === SITUACOES.length - 1 ? 'opacity-0' : i < atual ? 'bg-ouro' : 'bg-white/10'}`} />
            </div>
            <span className={`mt-1.5 text-[10.5px] font-semibold leading-tight sm:text-xs ${feito ? 'text-texto' : 'text-texto-3'}`}>{ROTULO[s]}</span>
            {feito && quando[i] && <span className="text-[10px] text-texto-3">{dataHora(quando[i]!).split(' ')[1]}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function ItensPedido({ p }: { p: Pedido }) {
  return (
    <div>
      <ul className="divide-y divide-borda">
        {p.items.map((i) => (
          <li key={i.id} className="flex items-start justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block font-semibold">
                {i.quantity}x {i.name}
              </span>
              {i.flavorName && <span className="block break-words text-xs uppercase tracking-wide text-texto-3">{i.flavorName}</span>}
              {i.unitPriceCents != null && i.quantity > 1 && <span className="block text-xs text-texto-3">{brl(i.unitPriceCents)} cada</span>}
            </span>
            <span className="shrink-0 font-semibold">{i.totalCents == null ? 'Consultar' : brl(i.totalCents)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-borda pt-3">
        <span className="font-semibold">Total</span>
        <span className="texto-ouro text-2xl font-bold">{brl(p.totalCents)}</span>
      </div>
      {p.consultItems > 0 && <p className="text-right text-xs text-texto-3">+ {p.consultItems} item(ns) com valor a combinar</p>}
    </div>
  );
}

export function PagamentoEndereco({ p }: { p: Pedido }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-texto-3">Entrega</dt>
        <dd className="break-words">{enderecoLinha(p)}</dd>
        {p.reference && <dd className="break-words text-texto-2">Ref.: {p.reference}</dd>}
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-texto-3">Pagamento na entrega</dt>
        <dd>
          {PAGAMENTO[p.paymentMethod]}
          {p.paymentMethod === 'dinheiro' && (p.changeForCents ? ` · troco para ${brl(p.changeForCents)}` : ' · sem troco')}
          {p.paid && <span className="ml-2 rounded bg-emerald-500/15 px-1.5 text-xs font-semibold text-emerald-300">Pago</span>}
        </dd>
      </div>
      {p.notes && (
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wider text-texto-3">Observação</dt>
          <dd className="whitespace-pre-line break-words">{p.notes}</dd>
        </div>
      )}
    </dl>
  );
}
