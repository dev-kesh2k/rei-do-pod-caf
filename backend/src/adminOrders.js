import express from 'express';
import { Prisma } from '@prisma/client';
import { prisma, wrap, HttpError, text, bool, phoneKey, formatPhone, STATUSES } from './util.js';
import { orderInclude, serializeOrder } from './orders.js';
import { bridgeConfigured, notifyOrder, sendAndLog, waNumber } from './whatsapp.js';
import { getSettings } from './util.js';

export const adminOrders = express.Router();
const TZ = process.env.TZ || 'America/Sao_Paulo';
const STAMP = { confirmado: 'confirmedAt', em_rota: 'dispatchedAt', entregue: 'deliveredAt' };

// Painel do dia + contador de pedidos novos do menu.
adminOrders.get(
  '/summary',
  wrap(async (_req, res) => {
    const [counts, [vendas]] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: { _all: true }, where: { status: { in: ['recebido', 'confirmado', 'em_rota'] } } }),
      prisma.$queryRaw(Prisma.sql`
        SELECT
          COALESCE(SUM("totalCents") FILTER (WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date), 0)::int AS "hojeCents",
          COUNT(*) FILTER (WHERE (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ})::date = (now() AT TIME ZONE ${TZ})::date)::int AS "hojePedidos",
          COALESCE(SUM("totalCents") FILTER (WHERE date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) = date_trunc('month', now() AT TIME ZONE ${TZ})), 0)::int AS "mesCents",
          COUNT(*) FILTER (WHERE date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) = date_trunc('month', now() AT TIME ZONE ${TZ}))::int AS "mesPedidos"
        FROM "Order" WHERE status <> 'cancelado'`),
    ]);
    const c = Object.fromEntries(counts.map((x) => [x.status, x._count._all]));
    res.json({ novos: c.recebido || 0, confirmados: c.confirmado || 0, emRota: c.em_rota || 0, ...vendas });
  })
);

adminOrders.get(
  '/orders',
  wrap(async (req, res) => {
    const where = {};
    const status = String(req.query.status || '');
    if (status === 'abertos') where.status = { in: ['recebido', 'confirmado', 'em_rota'] };
    else if (STATUSES.includes(status)) where.status = status;
    const q = String(req.query.q || '').trim();
    if (q) {
      const digits = q.replace(/\D/g, '');
      const or = [{ customerName: { contains: q, mode: 'insensitive' } }, { district: { contains: q, mode: 'insensitive' } }, { street: { contains: q, mode: 'insensitive' } }];
      if (digits.length >= 4) or.push({ phoneKey: { contains: phoneKey(digits) || digits } });
      if (/^#?\d{1,7}$/.test(q)) or.push({ number: Number(q.replace('#', '')) });
      where.OR = or;
    }
    const list = await prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 200 });
    res.json(list.map(serializeOrder));
  })
);

adminOrders.get(
  '/orders/:id',
  wrap(async (req, res) => {
    const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
    if (!o) throw new HttpError(404, 'Pedido não encontrado');
    res.json(serializeOrder(o));
  })
);

adminOrders.patch(
  '/orders/:id',
  wrap(async (req, res) => {
    const o = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!o) throw new HttpError(404, 'Pedido não encontrado');
    const b = req.body || {};
    const data = {};
    if ('paid' in b) data.paid = bool(b.paid);
    if ('status' in b && b.status !== o.status) {
      if (!STATUSES.includes(b.status)) throw new HttpError(400, 'Situação inválida');
      if (o.status === 'cancelado') throw new HttpError(409, 'Pedido cancelado não pode mudar de situação');
      data.status = b.status;
      if (b.status === 'cancelado') {
        data.cancelReason = text(b.cancelReason, 'Motivo do cancelamento', { max: 300 });
        data.canceledBy = 'loja';
        data.canceledAt = new Date();
      } else if (STAMP[b.status] && !o[STAMP[b.status]]) data[STAMP[b.status]] = new Date();
    }
    const u = await prisma.order.update({ where: { id: o.id }, data, include: orderInclude });
    res.json(serializeOrder(u));
  })
);

adminOrders.get(
  '/customers',
  wrap(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const digits = q.replace(/\D/g, '');
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, ...(digits.length >= 3 ? [{ phoneKey: { contains: digits } }] : [])] }
      : {};
    const [customers, stats] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { lastLoginAt: 'desc' }, take: 500 }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: { status: { not: 'cancelado' } },
        _count: { _all: true },
        _sum: { totalCents: true },
        _max: { createdAt: true },
      }),
    ]);
    const byId = new Map(stats.map((s) => [s.customerId, s]));
    res.json(
      customers
        .map((c) => {
          const s = byId.get(c.id);
          return {
            id: c.id,
            name: c.name,
            phone: formatPhone(c.phoneKey),
            phoneKey: c.phoneKey,
            orders: s?._count._all ?? 0,
            spentCents: s?._sum.totalCents ?? 0,
            lastOrderAt: s?._max.createdAt ?? null,
            createdAt: c.createdAt,
          };
        })
        .sort((a, b) => b.spentCents - a.spentCents || b.orders - a.orders)
    );
  })
);

// ---------- WhatsApp (avisos de pedido) ----------
adminOrders.get(
  '/whatsapp',
  wrap(async (req, res) => {
    const s = await getSettings();
    const where = req.query.orderId ? { orderId: String(req.query.orderId) } : {};
    const logs = await prisma.whatsappLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    res.json({ configured: bridgeConfigured(), enabled: s.notifyEnabled === '1', to: waNumber(s.notifyWhatsapp), logs });
  })
);

adminOrders.post(
  '/whatsapp/test',
  wrap(async (_req, res) => {
    const s = await getSettings();
    const when = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }).format(new Date());
    const log = await sendAndLog({
      to: waNumber(s.notifyWhatsapp),
      text: `✅ *Rei do Pod Caf*\nTeste dos avisos de pedido (${when}). Se chegou, os pedidos novos vão aparecer aqui.`,
      kind: 'teste',
    });
    res.json(log);
  })
);

// Reenvio manual (envia mesmo com os avisos desligados).
adminOrders.post(
  '/orders/:id/notify',
  wrap(async (req, res) => {
    const log = await notifyOrder(req.params.id, 'reenvio', { force: true });
    if (!log) throw new HttpError(404, 'Pedido não encontrado');
    res.json(log);
  })
);
