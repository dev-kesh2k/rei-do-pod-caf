// Avisos de pedido pela ponte de WhatsApp dos apps do Hub (WHATSAPP_BRIDGE_URL + BRIDGE_SECRET).
// Nada aqui pode derrubar ou atrasar um pedido: quem chama usa notifyOrderLater().
import { prisma, getSettings, formatPhone } from './util.js';

const TZ = process.env.TZ || 'America/Sao_Paulo';
const PAGTO = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };
const SITUACAO = { recebido: 'Recebido', confirmado: 'Confirmado', em_rota: 'Saiu para entrega', entregue: 'Entregue', cancelado: 'Cancelado' };

export const bridgeConfigured = () => !!(process.env.WHATSAPP_BRIDGE_URL?.trim() && process.env.BRIDGE_SECRET?.trim());

/** Número para a ponte: só dígitos, como cadastrado; acrescenta 55 se faltar. */
export function waNumber(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

const brl = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n) => `#${String(n).padStart(4, '0')}`;
const quando = (d) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);

export function orderMessage(o, reenvio = false) {
  const linhas = [
    reenvio ? `🔁 *Pedido ${num(o.number)}* (reenvio)` : `🛒 *Novo pedido ${num(o.number)}*`,
    reenvio ? `${quando(o.createdAt)} · Situação: ${SITUACAO[o.status] || o.status}` : quando(o.createdAt),
    '',
    `👤 *${o.customerName}*`,
    `📱 ${formatPhone(o.phoneKey)} · wa.me/55${o.phoneKey}`,
    '',
    '*Itens*',
    ...o.items.map(
      (i) => `• ${i.quantity}x ${i.name}${i.flavorName ? ` — ${i.flavorName}` : ''} · ${i.totalCents == null ? 'Consultar' : brl(i.totalCents)}`
    ),
    '',
    o.totalCents > 0 || !o.consultItems
      ? `💰 *Total: ${brl(o.totalCents)}*${o.consultItems ? ` + ${o.consultItems} item(ns) a consultar` : ''}`
      : '💰 *Total: a consultar*',
    `💳 ${PAGTO[o.paymentMethod] || o.paymentMethod}${
      o.paymentMethod === 'dinheiro' ? (o.changeForCents ? ` · troco para ${brl(o.changeForCents)}` : ' · sem troco') : ''
    } (na entrega)`,
    '',
    '📍 *Entrega*',
    `${o.street}, ${o.houseNumber}${o.complement ? ` — ${o.complement}` : ''}`,
    `Bairro: ${o.district}`,
  ];
  if (o.reference) linhas.push(`Ref.: ${o.reference}`);
  if (o.latitude != null && o.longitude != null) linhas.push(`🗺️ https://maps.google.com/?q=${o.latitude},${o.longitude}`);
  else linhas.push('(sem ponto no mapa)');
  if (o.notes) linhas.push('', `📝 *Obs.:* ${o.notes}`);
  return linhas.join('\n');
}

export function cancelMessage(o) {
  return [
    `❌ *Pedido ${num(o.number)} cancelado pelo cliente*`,
    `👤 ${o.customerName} · ${formatPhone(o.phoneKey)}`,
    `💰 ${brl(o.totalCents)} · ${o.items.reduce((t, i) => t + i.quantity, 0)} item(ns)`,
    o.cancelReason ? `Motivo: ${o.cancelReason}` : 'Sem motivo informado.',
  ].join('\n');
}

/** Envia um texto e grava no histórico. Nunca lança erro. */
export async function sendAndLog({ to, text, kind, order }) {
  const log = { kind, orderId: order?.id ?? null, orderNumber: order?.number ?? null, to: to || '-', ok: false, error: '', messageId: '' };
  try {
    if (!bridgeConfigured()) throw new Error('WhatsApp não configurado');
    if (!to) throw new Error('Número de avisos não cadastrado em Ajustes');
    const url = `${process.env.WHATSAPP_BRIDGE_URL.trim().replace(/\/+$/, '')}/send/text`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': process.env.BRIDGE_SECRET.trim() },
      body: JSON.stringify({ to, text }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data?.detail;
      throw new Error(`Ponte respondeu ${res.status}${d ? `: ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`);
    }
    log.ok = true;
    log.messageId = String(data?.message_id || '');
  } catch (e) {
    const causa = e?.cause?.code || e?.cause?.message;
    log.error = (
      e?.name === 'TimeoutError'
        ? 'A ponte não respondeu em 20 s'
        : e?.message === 'fetch failed'
          ? `Não foi possível conectar à ponte de WhatsApp${causa ? ` (${causa})` : ''}`
          : e?.message || String(e)
    ).slice(0, 500);
  }
  try {
    await prisma.whatsappLog.create({ data: log });
  } catch (e) {
    console.error('Falha ao gravar histórico do WhatsApp:', e);
  }
  if (!log.ok) console.warn(`[whatsapp] ${kind} ${order ? num(order.number) : ''} → ${log.to}: ${log.error}`);
  return log;
}

/** Aviso de pedido (novo, cancelado ou reenvio) para o número de Ajustes. */
export async function notifyOrder(orderId, kind, { force = false } = {}) {
  const s = await getSettings();
  if (!force && s.notifyEnabled !== '1') return null; // avisos desligados
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { id: 'asc' } } } });
  if (!o) return null;
  const text = kind === 'cancelamento' ? cancelMessage(o) : orderMessage(o, kind === 'reenvio');
  return sendAndLog({ to: waNumber(s.notifyWhatsapp), text, kind, order: o });
}

/** Dispara em segundo plano: a resposta do pedido não espera o WhatsApp. */
export function notifyOrderLater(orderId, kind) {
  setImmediate(() => {
    notifyOrder(orderId, kind).catch((e) => console.error('[whatsapp] aviso falhou:', e));
  });
}
