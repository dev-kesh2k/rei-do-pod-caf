import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorText } from '../../lib/api';
import { brl, useCatalog } from '../../lib/catalog';
import { useCart } from '../../lib/cart';
import { clienteApi, useCliente } from '../../lib/customer';
import { inputToCents, limparPreco } from '../../lib/money';
import type { Pedido } from '../../lib/orders';
import { MapPicker, type Pin } from '../../components/MapPicker';
import LoginCliente from '../../components/LoginCliente';
import { FotoProduto, StoreLayout } from '../../components/Store';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';

type Pagamento = 'pix' | 'dinheiro' | 'cartao';
const PAGAMENTOS: [Pagamento, string, string][] = [
  ['pix', 'Pix', 'Na entrega'],
  ['dinheiro', 'Dinheiro', 'Com troco se precisar'],
  ['cartao', 'Cartão', 'Crédito ou débito'],
];

function Bloco({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="loja-card space-y-4 p-4 sm:p-5">
      <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold uppercase">
        <span className="botao-ouro flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-sans text-sm">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Campo({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 space-y-1.5 ${className}`}>
      <span className="adm-label">{label}</span>
      {children}
    </label>
  );
}

export default function Checkout() {
  useTitulo('Finalizar pedido — REI DO POD CAF');
  const nav = useNavigate();
  const toast = useToast();
  const { catalog, reload } = useCatalog();
  const { linhas, total, aConsultar, limpar } = useCart();
  const { cliente, sair } = useCliente();
  const validas = linhas.filter((l) => l.disponivel);

  const [end, setEnd] = useState({ street: '', houseNumber: '', district: '', complement: '', reference: '' });
  const [pin, setPin] = useState<Pin | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | ''>('');
  const [troco, setTroco] = useState('');
  const [obs, setObs] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const preenchido = useRef(false);
  const erroRef = useRef<HTMLDivElement>(null);

  // Reaproveita o último endereço/localização do cliente.
  useEffect(() => {
    if (preenchido.current || !cliente) return;
    preenchido.current = true;
    const a = cliente.lastAddress;
    if (!a) return;
    setEnd({ street: a.street, houseNumber: a.houseNumber, district: a.district, complement: a.complement || '', reference: a.reference || '' });
    if (a.latitude != null && a.longitude != null) setPin({ lat: a.latitude, lng: a.longitude });
  }, [cliente]);

  const set = (k: keyof typeof end, v: string) => setEnd((e) => ({ ...e, [k]: v }));
  // O aviso de pendências some assim que o cliente mexe no formulário (volta ao confirmar de novo).
  useEffect(() => setErros([]), [end, pagamento, troco]);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    const falta: string[] = [];
    if (!end.street.trim()) falta.push('Rua');
    if (!end.houseNumber.trim()) falta.push('Número');
    if (!end.district.trim()) falta.push('Bairro');
    if (!pagamento) falta.push('Forma de pagamento');
    const trocoCents = pagamento === 'dinheiro' ? inputToCents(troco) : null;
    if (Number.isNaN(trocoCents as number)) falta.push('Valor do troco');
    else if (trocoCents != null && trocoCents < total) falta.push(`Troco para (precisa ser maior que ${brl(total)})`);
    setErros(falta);
    if (falta.length) {
      requestAnimationFrame(() => erroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setEnviando(true);
    try {
      const pedido = await clienteApi<Pedido>('orders', {
        method: 'POST',
        body: {
          items: validas.map((l) => ({ productId: l.item.pid, flavorId: l.item.fid, quantity: l.item.qty })),
          ...end,
          latitude: pin?.lat ?? null,
          longitude: pin?.lng ?? null,
          paymentMethod: pagamento,
          changeForCents: trocoCents,
          notes: obs,
        },
      });
      limpar();
      reload();
      nav(`/pedidos/${pedido.id}?novo=1`, { replace: true });
    } catch (err) {
      toast(errorText(err, 'Não foi possível enviar o pedido'), true);
      reload();
    } finally {
      setEnviando(false);
    }
  }

  if (!validas.length)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-2 font-display text-4xl font-extrabold uppercase">Carrinho vazio</h1>
          <p className="mb-6 text-sm text-texto-2">Adicione produtos para finalizar um pedido.</p>
          <Link to="/produtos" className="botao-ouro inline-flex min-h-12 items-center rounded-2xl px-6 font-bold uppercase tracking-wider">
            Ver produtos
          </Link>
        </div>
      </StoreLayout>
    );

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 md:pt-8">
        <h1 className="mb-5 font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-none">
          Finalizar <span className="texto-ouro">pedido</span>
        </h1>

        {!cliente ? (
          <div className="mx-auto max-w-md">
            <LoginCliente titulo="Quem está pedindo?" texto="Entre com seu celular para finalizar. Sem senha: você acompanha o pedido por aqui." />
          </div>
        ) : (
          <form onSubmit={confirmar} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-borda bg-superficie/60 px-4 py-3 text-sm">
                <span className="min-w-0">
                  Pedido de <strong className="text-texto">{cliente.name}</strong> · {cliente.phone}
                </span>
                <button type="button" onClick={sair} className="min-h-11 text-xs font-semibold text-texto-3 underline-offset-4 hover:underline">
                  Não é você? Trocar
                </button>
              </div>

              <Bloco n={1} titulo="Endereço de entrega">
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                  <Campo label="Rua">
                    <input className="adm-input px-3.5" autoComplete="address-line1" maxLength={160} value={end.street} onChange={(e) => set('street', e.target.value)} />
                  </Campo>
                  <Campo label="Número">
                    <input className="adm-input px-3.5" inputMode="numeric" maxLength={20} value={end.houseNumber} onChange={(e) => set('houseNumber', e.target.value)} />
                  </Campo>
                  <Campo label="Bairro" className="sm:col-span-2">
                    <input className="adm-input px-3.5" maxLength={80} value={end.district} onChange={(e) => set('district', e.target.value)} />
                  </Campo>
                  <Campo label="Complemento (opcional)" className="sm:col-span-2">
                    <input className="adm-input px-3.5" maxLength={120} placeholder="Apto, bloco, casa dos fundos…" value={end.complement} onChange={(e) => set('complement', e.target.value)} />
                  </Campo>
                  <Campo label="Referência (opcional)" className="sm:col-span-2">
                    <input className="adm-input px-3.5" maxLength={160} placeholder="Perto de…" value={end.reference} onChange={(e) => set('reference', e.target.value)} />
                  </Campo>
                </div>
              </Bloco>

              <Bloco n={2} titulo="Localização no mapa">
                <p className="-mt-2 text-sm text-texto-2">Opcional, mas ajuda o entregador a chegar certinho.</p>
                <MapPicker value={pin} onChange={setPin} enderecoBusca={[end.street, end.houseNumber, end.district].filter(Boolean).join(', ')} />
              </Bloco>

              <Bloco n={3} titulo="Pagamento na entrega">
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Forma de pagamento">
                  {PAGAMENTOS.map(([k, t, d]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={pagamento === k}
                      onClick={() => setPagamento(k)}
                      className={`min-h-14 rounded-2xl border px-4 py-2 text-left transition-colors ${
                        pagamento === k ? 'border-ouro bg-ouro/10' : 'border-borda bg-fundo/60 hover:border-ouro/40'
                      }`}
                    >
                      <span className={`block font-bold ${pagamento === k ? 'text-ouro' : ''}`}>{t}</span>
                      <span className="block text-xs text-texto-3">{d}</span>
                    </button>
                  ))}
                </div>
                {pagamento === 'dinheiro' && (
                  <Campo label="Troco para quanto? (deixe vazio se não precisar)">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-texto-3">R$</span>
                      <input className="adm-input pl-10 pr-3" inputMode="decimal" placeholder="Ex.: 200,00" value={troco} onChange={(e) => setTroco(limparPreco(e.target.value))} />
                    </div>
                  </Campo>
                )}
                {pagamento === 'pix' && catalog?.settings.pixKey && (
                  <p className="rounded-xl border border-borda bg-fundo/60 p-3 text-sm text-texto-2">
                    Chave Pix da loja: <strong className="break-all text-texto">{catalog.settings.pixKey}</strong>
                  </p>
                )}
                <Campo label="Observação (opcional)">
                  <textarea className="adm-input min-h-20 px-3.5 py-2.5" maxLength={500} placeholder="Ex.: entregar após as 18h" value={obs} onChange={(e) => setObs(e.target.value)} />
                </Campo>
              </Bloco>
            </div>

            <aside className="loja-card space-y-4 p-4 sm:p-5 lg:sticky lg:top-24">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-extrabold uppercase">Seu pedido</h2>
                <Link to="/carrinho" className="min-h-11 text-sm font-semibold text-ouro">
                  Editar
                </Link>
              </div>
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {validas.map((l) => (
                  <li key={l.key} className="flex items-center gap-3 text-sm">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-fundo p-1">{l.produto && <FotoProduto p={l.produto} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {l.item.qty}x {l.produto?.name}
                      </span>
                      {l.sabor && <span className="block truncate text-xs uppercase text-texto-3">{l.sabor.name}</span>}
                    </span>
                    <span className="shrink-0 font-semibold">{l.total == null ? 'Consultar' : brl(l.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-borda pt-3 text-sm">
                <p className="flex justify-between text-texto-2">
                  <span>Entrega</span>
                  <span>Combinada com a loja</span>
                </p>
                <p className="flex items-baseline justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="texto-ouro text-2xl font-bold">{brl(total)}</span>
                </p>
                {aConsultar > 0 && <p className="text-right text-xs text-texto-3">+ {aConsultar} item(ns) com valor a consultar</p>}
              </div>
              {erros.length > 0 && (
                <div ref={erroRef} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <p className="mb-1 font-semibold">Falta preencher:</p>
                  <ul className="list-inside list-disc">
                    {erros.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="submit" disabled={enviando} className="botao-ouro flex min-h-12 w-full items-center justify-center rounded-2xl px-4 font-bold uppercase tracking-wider">
                {enviando ? 'Enviando…' : 'Confirmar pedido'}
              </button>
              <p className="text-center text-xs text-texto-3">Você acompanha a situação em “Pedidos”.</p>
            </aside>
          </form>
        )}
      </div>
    </StoreLayout>
  );
}
