import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorText } from '../../lib/api';
import { ROTULO, SITUACOES, dataHora, enderecoLinha, mapaUrl, numero, type Pedido, type Situacao } from '../../lib/orders';
import { MapaPonto } from '../../components/MapPicker';
import { ChipSituacao, ItensPedido, LinhaDoTempo, PagamentoEndereco } from '../../components/Pedido';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconPino, IconTelefone, IconVoltar, IconWhatsApp } from '../../components/icons';
import { PROXIMO } from './Orders';

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [p, setP] = useState<Pedido | null>(null);
  const [erro, setErro] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  useTitulo(p ? `Pedido ${numero(p.number)} — Painel` : 'Pedido — Painel');

  const carregar = useCallback(async () => {
    try {
      setP(await api<Pedido>(`admin/orders/${id}`));
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar o pedido'));
    }
  }, [id]);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alterar(body: Record<string, unknown>, msg: string) {
    setSalvando(true);
    try {
      setP(await api<Pedido>(`admin/orders/${id}`, { method: 'PATCH', body }));
      toast(msg);
      window.dispatchEvent(new Event('rdp:pedidos'));
      return true;
    } catch (e) {
      toast(errorText(e), true);
      return false;
    } finally {
      setSalvando(false);
    }
  }

  if (erro && !p)
    return (
      <div className="adm-card p-6 text-sm text-red-300">
        {erro}{' '}
        <Link to="/admin" className="underline">
          Voltar
        </Link>
      </div>
    );
  if (!p) return <div className="adm-card h-96 animate-pulse" />;

  const prox = PROXIMO[p.status];
  const wa = `https://wa.me/55${p.phoneKey}?text=${encodeURIComponent(`Olá, ${p.customerName.split(' ')[0]}! Aqui é do Rei do Pod Caf, sobre o seu pedido ${numero(p.number)}.`)}`;
  const temPino = p.latitude != null && p.longitude != null;
  const mapa = temPino
    ? mapaUrl(p.latitude!, p.longitude!)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.street}, ${p.houseNumber}, ${p.district}, Cafelândia - PR`)}`;

  return (
    <div>
      <Link to="/admin" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-texto-2 hover:text-ouro">
        <IconVoltar className="h-4 w-4" />
        Pedidos
      </Link>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase">Pedido {numero(p.number)}</h1>
          <p className="text-sm text-texto-2">{dataHora(p.createdAt)}</p>
        </div>
        <ChipSituacao s={p.status} className="text-xs" />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <section className="adm-card space-y-4 p-4 sm:p-5">
            <LinhaDoTempo p={p} />
            {p.status !== 'cancelado' && (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                {prox ? (
                  <button type="button" disabled={salvando} className="botao-ouro adm-btn px-4 font-bold" onClick={() => alterar({ status: prox[0] }, ROTULO[prox[0]])}>
                    {prox[1]}
                  </button>
                ) : (
                  <p className="flex min-h-11 items-center text-sm text-emerald-300">Pedido entregue.</p>
                )}
                <select
                  className="adm-input px-3 sm:w-52"
                  value={p.status}
                  onChange={(e) => alterar({ status: e.target.value as Situacao }, `Situação: ${ROTULO[e.target.value as Situacao]}`)}
                  aria-label="Mudar situação"
                >
                  {SITUACOES.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="adm-card p-4 sm:p-5">
            <h2 className="mb-2 font-display text-2xl font-extrabold uppercase">Itens</h2>
            <ItensPedido p={p} />
          </section>

          <section className="adm-card space-y-4 p-4 sm:p-5">
            <h2 className="font-display text-2xl font-extrabold uppercase">Entrega</h2>
            <PagamentoEndereco p={p} />
            {temPino && <MapaPonto lat={p.latitude!} lng={p.longitude!} />}
            <a href={mapa} target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-ghost w-full px-4">
              <IconPino className="h-5 w-5" />
              {temPino ? 'Abrir no mapa (ponto marcado)' : 'Procurar endereço no mapa'}
            </a>
            {!temPino && <p className="text-xs text-texto-3">O cliente não marcou o ponto no mapa: {enderecoLinha(p)}</p>}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-8">
          <section className="adm-card space-y-3 p-4 sm:p-5">
            <h2 className="font-display text-2xl font-extrabold uppercase">Cliente</h2>
            <div>
              <p className="break-words font-semibold">{p.customerName}</p>
              <p className="text-sm text-texto-2">{p.phone}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:+55${p.phoneKey}`} className="adm-btn adm-btn-ghost px-3">
                <IconTelefone className="h-4 w-4" />
                Ligar
              </a>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-btn bg-[#25d366] px-3 font-bold text-white">
                <IconWhatsApp className="h-5 w-5" />
                WhatsApp
              </a>
            </div>
            <Link to={`/admin?s=todos&q=${p.phoneKey}`} className="block text-center text-xs text-texto-3 underline-offset-4 hover:underline">
              Ver todos os pedidos deste cliente
            </Link>
          </section>

          <section className="adm-card space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Pago</p>
                <p className="text-xs text-texto-3">Marque quando receber o pagamento.</p>
              </div>
              <Switch checked={p.paid} disabled={salvando} onChange={(v) => alterar({ paid: v }, v ? 'Marcado como pago' : 'Marcado como não pago')} label="Pedido pago" />
            </div>
          </section>

          {p.status !== 'cancelado' && (
            <section className="adm-card space-y-3 p-4 sm:p-5">
              {!cancelando ? (
                <button type="button" className="adm-btn adm-btn-danger w-full px-4" onClick={() => setCancelando(true)}>
                  Cancelar pedido
                </button>
              ) : (
                <>
                  <label className="block space-y-1.5">
                    <span className="adm-label">Motivo do cancelamento</span>
                    <textarea
                      className="adm-input min-h-20 px-3.5 py-2.5"
                      maxLength={300}
                      autoFocus
                      placeholder="Ex.: sabor acabou, cliente desistiu…"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="adm-btn adm-btn-ghost px-3" onClick={() => setCancelando(false)}>
                      Voltar
                    </button>
                    <button
                      type="button"
                      disabled={salvando || !motivo.trim()}
                      className="adm-btn adm-btn-danger px-3"
                      onClick={async () => {
                        if (await alterar({ status: 'cancelado', cancelReason: motivo }, 'Pedido cancelado')) setCancelando(false);
                      }}
                    >
                      Cancelar pedido
                    </button>
                  </div>
                </>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
