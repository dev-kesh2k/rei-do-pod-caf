import express from 'express';
import { prisma, wrap, HttpError, text, limit, mobile, formatPhone, signCustomerToken, requireCustomer } from './util.js';
import { createOrder, orderInclude, serializeOrder } from './orders.js';
import { notifyOrderLater } from './whatsapp.js';

export const customerApi = express.Router();

const out = (c) => ({ id: c.id, name: c.name, phone: formatPhone(c.phoneKey), phoneKey: c.phoneKey, lastAddress: c.lastAddress ?? null });

// Entrar com o celular. No primeiro acesso pede o nome (needName).
customerApi.post(
  '/customer/login',
  wrap(async (req, res) => {
    limit(req.ip, 'login-cliente', 15);
    const key = mobile(req.body?.phone);
    let c = await prisma.customer.findUnique({ where: { phoneKey: key } });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!c) {
      if (!name) return res.json({ needName: true });
      c = await prisma.customer.create({ data: { phoneKey: key, name: text(name, 'Nome', { max: 80 }) } });
    } else {
      c = await prisma.customer.update({ where: { id: c.id }, data: { lastLoginAt: new Date() } });
    }
    res.json({ token: signCustomerToken(c), customer: out(c) });
  })
);

customerApi.get('/customer/me', requireCustomer, (req, res) => res.json({ customer: out(req.customer) }));

customerApi.put(
  '/customer/me',
  requireCustomer,
  wrap(async (req, res) => {
    const c = await prisma.customer.update({ where: { id: req.customer.id }, data: { name: text(req.body?.name, 'Nome', { max: 80 }) } });
    res.json({ customer: out(c) });
  })
);

customerApi.post(
  '/orders',
  requireCustomer,
  wrap(async (req, res) => {
    limit(req.ip, 'pedido', 20);
    const o = await createOrder(req.customer, req.body || {});
    res.status(201).json(serializeOrder(o));
    notifyOrderLater(o.id, 'pedido');
  })
);

customerApi.get(
  '/orders',
  requireCustomer,
  wrap(async (req, res) => {
    const list = await prisma.order.findMany({ where: { customerId: req.customer.id }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 100 });
    res.set('Cache-Control', 'no-store');
    res.json(list.map(serializeOrder));
  })
);

async function own(req) {
  const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });
  if (!o || o.customerId !== req.customer.id) throw new HttpError(404, 'Pedido não encontrado');
  return o;
}

customerApi.get(
  '/orders/:id',
  requireCustomer,
  wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(serializeOrder(await own(req)));
  })
);

customerApi.post(
  '/orders/:id/cancel',
  requireCustomer,
  wrap(async (req, res) => {
    const o = await own(req);
    if (o.status !== 'recebido') throw new HttpError(409, 'O pedido já foi confirmado pela loja. Fale com a loja para cancelar.');
    // updateMany com a situação na condição: não cancela se a loja confirmou ao mesmo tempo.
    const r = await prisma.order.updateMany({
      where: { id: o.id, status: 'recebido' },
      data: { status: 'cancelado', canceledBy: 'cliente', canceledAt: new Date(), cancelReason: text(req.body?.reason, 'Motivo', { max: 300, required: false }) },
    });
    if (!r.count) throw new HttpError(409, 'O pedido já foi confirmado pela loja. Fale com a loja para cancelar.');
    res.json(serializeOrder(await own(req)));
    notifyOrderLater(o.id, 'cancelamento');
  })
);
