import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../../lib/api';
import { numero } from '../../lib/orders';
import Switch from '../../components/Switch';
import { useToast } from '../../components/Toast';

export type WaLog = { id: string; createdAt: string; kind: string; orderId: string | null; orderNumber: number | null; to: string; ok: boolean; error: string; messageId: string };
export type WaStatus = { configured: boolean; enabled: boolean; to: string; logs: WaLog[] };

const TIPO: Record<string, string> = { pedido: 'Novo pedido', cancelamento: 'Cancelamento', reenvio: 'Reenvio', teste: 'Teste' };
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const fone = (d: string) => (d.length >= 12 ? `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}` : d);

export function Resultado({ log }: { log: WaLog }) {
  return log.ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">✓ Enviado</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">✕ Erro</span>
  );
}

/** Tabela (desktop) / cartões (celular) com os envios. */
export function HistoricoWhats({ logs, mostrarPedido = true }: { logs: WaLog[]; mostrarPedido?: boolean }) {
  if (!logs.length) return <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-texto-3">Nenhum envio ainda.</p>;
  const ped = (l: WaLog) =>
    l.orderNumber == null ? '—' : l.orderId ? <Link to={`/admin/pedidos/${l.orderId}`} className="text-ouro hover:underline">{numero(l.orderNumber)}</Link> : numero(l.orderNumber);
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-borda md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-borda text-left text-xs uppercase tracking-wider text-texto-3">
            <tr>
              <th className="px-3 py-2 font-semibold">Data</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              {mostrarPedido && <th className="px-3 py-2 font-semibold">Pedido</th>}
              <th className="px-3 py-2 font-semibold">Destino</th>
              <th className="px-3 py-2 font-semibold">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-borda/60 align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-2 text-texto-2">{quando(l.createdAt)}</td>
                <td className="px-3 py-2">{TIPO[l.kind] ?? l.kind}</td>
                {mostrarPedido && <td className="px-3 py-2">{ped(l)}</td>}
                <td className="whitespace-nowrap px-3 py-2 text-texto-2">{fone(l.to)}</td>
                <td className="px-3 py-2">
                  <Resultado log={l} />
                  {!l.ok && <p className="mt-1 max-w-xs break-words text-xs text-red-300">{l.error}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {logs.map((l) => (
          <li key={l.id} className="rounded-xl border border-borda bg-fundo/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">
                  {TIPO[l.kind] ?? l.kind}
                  {mostrarPedido && l.orderNumber != null && <> · {ped(l)}</>}
                </p>
                <p className="text-xs text-texto-3">
                  {quando(l.createdAt)} · {fone(l.to)}
                </p>
              </div>
              <Resultado log={l} />
            </div>
            {!l.ok && <p className="mt-1 break-words text-xs text-red-300">{l.error}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Bloco de Ajustes: número, liga/desliga, teste e histórico. */
export default function WhatsappAvisos() {
  const toast = useToast();
  const [st, setSt] = useState<WaStatus | null>(null);
  const [numeroAviso, setNumeroAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<WaLog | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [w, s] = await Promise.all([api<WaStatus>('admin/whatsapp'), api<{ settings: { notifyWhatsapp: string } }>('admin/settings')]);
      setSt(w);
      setNumeroAviso((n) => n || s.settings.notifyWhatsapp || '');
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar os avisos'));
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(body: Record<string, unknown>, msg: string) {
    setSalvando(true);
    try {
      const r = await api<{ settings: { notifyWhatsapp: string } }>('admin/settings', { method: 'PUT', body });
      setNumeroAviso(r.settings.notifyWhatsapp);
      toast(msg);
      await carregar();
      return true;
    } catch (e) {
      toast(errorText(e), true);
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setTeste(null);
    setTestando(true);
    try {
      // Salva o número digitado antes de testar.
      if (!(await salvar({ notifyWhatsapp: numeroAviso }, 'Número salvo'))) return;
      const r = await api<WaLog>('admin/whatsapp/test', { method: 'POST' });
      setTeste(r);
      await carregar();
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setTestando(false);
    }
  }

  if (erro) return <section className="adm-card p-4 text-sm text-red-300">{erro}</section>;
  if (!st) return <section className="adm-card h-64 animate-pulse" />;

  return (
    <section className="adm-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-2xl font-extrabold uppercase">Avisos de pedido no WhatsApp</h2>
        <p className="text-xs text-texto-3">Cada pedido novo (e cada cancelamento feito pelo cliente) chega automaticamente neste número, com itens, cliente e localização.</p>
      </div>

      {!st.configured && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <strong>WhatsApp não configurado.</strong> A loja funciona normalmente; os avisos voltam assim que a ponte de WhatsApp do Hub estiver ligada a este app.
        </p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-borda bg-fundo/60 px-3.5 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Enviar avisos</p>
          <p className="text-xs text-texto-3">{st.enabled ? 'Ligado: os pedidos novos são avisados.' : 'Desligado: nenhum aviso automático.'}</p>
        </div>
        <Switch checked={st.enabled} disabled={salvando} onChange={(v) => salvar({ notifyEnabled: v }, v ? 'Avisos ligados' : 'Avisos desligados')} label="Enviar avisos de pedido" />
      </div>

      <label className="block space-y-1.5">
        <span className="adm-label">WhatsApp para avisos de pedido</span>
        <input
          className="adm-input px-3.5"
          type="tel"
          inputMode="numeric"
          placeholder="Ex.: 554598078084"
          value={numeroAviso}
          onChange={(e) => setNumeroAviso(e.target.value.replace(/[^\d()+ -]/g, ''))}
        />
        <span className="block text-xs text-texto-3">
          Pode ser o mesmo do suporte. Use o número como aparece no WhatsApp; se o teste não chegar, tente sem o 9 depois do DDD.
          {st.to && <> Envio para: <strong className="text-texto-2">{fone(st.to)}</strong></>}
        </span>
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={salvando} className="adm-btn adm-btn-ghost px-4" onClick={() => salvar({ notifyWhatsapp: numeroAviso }, 'Número salvo')}>
          Salvar número
        </button>
        <button type="button" disabled={testando || !numeroAviso.trim()} className="botao-ouro adm-btn px-4 font-bold" onClick={testar}>
          {testando ? 'Enviando…' : 'Enviar mensagem de teste'}
        </button>
      </div>
      {teste && (
        <div className={`rounded-xl border p-3 text-sm ${teste.ok ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-red-400/30 bg-red-500/10 text-red-200'}`} role="status">
          {teste.ok ? `Mensagem de teste enviada para ${fone(teste.to)}. Confira no WhatsApp.` : `Não enviou: ${teste.error}`}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Histórico de envios</h3>
          <button type="button" className="min-h-11 text-xs font-semibold text-ouro" onClick={carregar}>
            Atualizar
          </button>
        </div>
        <HistoricoWhats logs={st.logs} />
      </div>
    </section>
  );
}
