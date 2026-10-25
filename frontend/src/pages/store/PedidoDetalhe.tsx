import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { errorText } from '../../lib/api';
import { clienteApi, useCliente } from '../../lib/customer';
import { dataHora, numero, type Pedido } from '../../lib/orders';
import LoginCliente from '../../components/LoginCliente';
import { MapaPonto } from '../../components/MapPicker';
import { ChipSituacao, ItensPedido, LinhaDoTempo, PagamentoEndereco } from '../../components/Pedido';
import { Logo, StoreLayout, SuporteWhats } from '../../components/Store';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconCheck, IconVoltar } from '../../components/icons';

export default function PedidoDetalhe() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const novo = params.get('novo') === '1';
  const { cliente } = useCliente();
  const toast = useToast();
  const [p, setP] = useState<Pedido | null>(null);
  const [erro, setErro] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  useTitulo(p ? `Pedido ${numero(p.number)} — REI DO POD CAF` : 'Pedido — REI DO POD CAF');

  const carregar = useCallback(async () => {
    try {
      setP(await clienteApi<Pedido>(`orders/${id}`));
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar o pedido'));
    }
  }, [id]);

  useEffect(() => {
    if (!cliente) return;
    carregar();
    // Acompanha a situação enquanto a página estiver aberta.
    const t = setInterval(carregar, 20000);
    return () => clearInterval(t);
  }, [cliente, carregar]);

  async function cancelar() {
    setEnviando(true);
    try {
      setP(await clienteApi<Pedido>(`orders/${id}/cancel`, { method: 'POST', body: { reason: motivo } }));
      setCancelando(false);
      toast('Pedido cancelado');
    } catch (e) {
      toast(errorText(e), true);
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-4 md:pt-6">
        <Link to="/pedidos" className="no-print mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-texto-2 hover:text-ouro">
          <IconVoltar className="h-4 w-4" />
          Meus pedidos
        </Link>

        {!cliente && <LoginCliente texto="Entre com o celular usado no pedido para ver os detalhes." />}
        {cliente && erro && !p && <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{erro}</p>}
        {cliente && !p && !erro && <div className="loja-card h-96 animate-pulse" />}

        {p && (
          <div className="space-y-4">
            {novo && p.status === 'recebido' && (
              <div className="entrada flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <IconCheck className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold">Pedido enviado para a loja!</p>
                  <p className="text-sm text-texto-2">Acompanhe aqui: a situação muda quando a loja confirmar e sair para entrega.</p>
                </div>
              </div>
            )}

            {/* Ticket */}
            <article className="loja-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-dashed border-white/15 bg-fundo/40 p-4 sm:p-5">
                <div className="min-w-0">
                  <Logo />
                </div>
                <ChipSituacao s={p.status} />
              </div>
              <div className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.2em] text-texto-3">Pedido</p>
                    <p className="font-display text-4xl font-extrabold leading-none">{numero(p.number)}</p>
                  </div>
                  <p className="text-sm text-texto-2">{dataHora(p.createdAt)}</p>
                </div>
                <LinhaDoTempo p={p} />
                <ItensPedido p={p} />
                <div className="border-t border-dashed border-white/15 pt-4">
                  <PagamentoEndereco p={p} />
                </div>
                {p.latitude != null && p.longitude != null && <MapaPonto lat={p.latitude} lng={p.longitude} className="h-44" />}
                <p className="text-xs text-texto-3">
                  {p.customerName} · {p.phone}
                </p>
              </div>
            </article>

            <div className="no-print grid gap-2 sm:grid-cols-2">
              <SuporteWhats className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25d366] px-4 font-bold text-white">
                Falar com a loja
              </SuporteWhats>
              <button type="button" className="adm-btn adm-btn-ghost min-h-12 rounded-2xl px-4" onClick={() => window.print()}>
                Imprimir / salvar ticket
              </button>
            </div>

            {p.status === 'recebido' && (
              <div className="no-print loja-card p-4">
                {!cancelando ? (
                  <button type="button" className="adm-btn adm-btn-danger w-full px-4" onClick={() => setCancelando(true)}>
                    Cancelar pedido
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Cancelar o pedido {numero(p.number)}?</p>
                    <textarea
                      className="adm-input min-h-20 px-3.5 py-2.5"
                      maxLength={300}
                      placeholder="Motivo (opcional)"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="adm-btn adm-btn-ghost px-3" onClick={() => setCancelando(false)}>
                        Voltar
                      </button>
                      <button type="button" disabled={enviando} className="adm-btn adm-btn-danger px-3" onClick={cancelar}>
                        {enviando ? 'Cancelando…' : 'Sim, cancelar'}
                      </button>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-center text-xs text-texto-3">Dá para cancelar até a loja confirmar o pedido.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
