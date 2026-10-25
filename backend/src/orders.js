import { prisma, HttpError, text, cents, formatPhone, PAYMENT_METHODS } from './util.js';

export const orderInclude = { items: { orderBy: { id: 'asc' } } };

export function serializeOrder(o) {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    phone: formatPhone(o.phoneKey),
    phoneKey: o.phoneKey,
    street: o.street,
    houseNumber: o.houseNumber,
    district: o.district,
    complement: o.complement,
    reference: o.reference,
    latitude: o.latitude,
    longitude: o.longitude,
    totalCents: o.totalCents,
    consultItems: o.consultItems,
    paymentMethod: o.paymentMethod,
    changeForCents: o.changeForCents,
    notes: o.notes,
    status: o.status,
    paid: o.paid,
    cancelReason: o.cancelReason,
    canceledBy: o.canceledBy,
    createdAt: o.createdAt,
    confirmedAt: o.confirmedAt,
    dispatchedAt: o.dispatchedAt,
    deliveredAt: o.deliveredAt,
    canceledAt: o.canceledAt,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      flavorName: i.flavorName,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      totalCents: i.totalCents,
    })),
  };
}

const efetivo = (price, promo) => (price == null ? null : promo != null && promo < price ? promo : price);

/** Endereço/localização validados (também guardados como último endereço do cliente). */
export function parseAddress(b) {
  const address = {
    street: text(b.street, 'Rua', { max: 160 }),
    houseNumber: text(b.houseNumber, 'Número', { max: 20 }),
    district: text(b.district, 'Bairro', { max: 80 }),
    complement: text(b.complement, 'Complemento', { max: 120, required: false }),
    reference: text(b.reference, 'Ponto de referência', { max: 160, required: false }),
    latitude: null,
    longitude: null,
  };
  if (b.latitude !== null && b.latitude !== undefined && b.latitude !== '') {
    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, 'Localização no mapa inválida');
    address.latitude = lat;
    address.longitude = lng;
  }
  return address;
}

/** Pedido com preços e disponibilidade conferidos no servidor (preço do momento fica gravado no item). */
export async function createOrder(customer, body) {
  const name = text(body.customerName ?? customer.name, 'Nome', { max: 80 });
  const address = parseAddress(body);
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) throw new HttpError(400, 'Escolha a forma de pagamento');
  const notes = text(body.notes, 'Observação', { max: 500, required: false });

  const raw = Array.isArray(body.items) ? body.items : [];
  if (!raw.length) throw new HttpError(400, 'Seu carrinho está vazio');
  if (raw.length > 60) throw new HttpError(400, 'Itens demais num pedido');
  const merged = new Map();
  for (const it of raw) {
    const qty = Number(it?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'Quantidade inválida');
    const k = `${it.productId}:${it.flavorId || ''}`;
    merged.set(k, { productId: String(it.productId || ''), flavorId: it.flavorId ? String(it.flavorId) : null, qty: (merged.get(k)?.qty || 0) + qty });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: [...merged.values()].map((m) => m.productId) } },
    include: { brand: { select: { active: true } }, flavors: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = [];
  for (const m of merged.values()) {
    const p = byId.get(m.productId);
    if (!p || !p.active || !p.brand.active) throw new HttpError(409, 'Um produto do carrinho saiu da loja. Atualize o carrinho.');
    let unit;
    let flavorName = '';
    if (p.noFlavor) {
      if (m.flavorId) throw new HttpError(400, `${p.name} não tem sabores`);
      if (!p.inStock) throw new HttpError(409, `${p.name} esgotou. Tire do carrinho para continuar.`);
      unit = efetivo(p.priceCents, p.promoCents);
    } else {
      const f = p.flavors.find((x) => x.id === m.flavorId);
      if (!f) throw new HttpError(400, `Escolha o sabor de ${p.name}`);
      if (!f.available) throw new HttpError(409, `${p.name} — ${f.name} esgotou. Tire do carrinho para continuar.`);
      unit = f.priceCents != null ? efetivo(f.priceCents, f.promoCents) : efetivo(p.priceCents, p.promoCents);
      flavorName = f.name;
    }
    items.push({
      productId: p.id,
      flavorId: m.flavorId,
      name: p.name,
      flavorName,
      unitPriceCents: unit,
      quantity: m.qty,
      totalCents: unit == null ? null : unit * m.qty,
    });
  }
  const totalCents = items.reduce((t, i) => t + (i.totalCents ?? 0), 0);
  const consultItems = items.filter((i) => i.unitPriceCents == null).length;

  let changeForCents = null;
  if (body.paymentMethod === 'dinheiro' && body.changeForCents != null && body.changeForCents !== '') {
    changeForCents = cents(body.changeForCents, 'Troco para');
    if (changeForCents < totalCents) throw new HttpError(400, 'O valor para troco precisa ser maior que o total');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        customerId: customer.id,
        customerName: name,
        phoneKey: customer.phoneKey,
        ...address,
        totalCents,
        consultItems,
        paymentMethod: body.paymentMethod,
        changeForCents,
        notes,
        items: { create: items },
      },
      include: orderInclude,
    });
    await tx.customer.update({ where: { id: customer.id }, data: { name, lastAddress: address } });
    return order;
  });
}
