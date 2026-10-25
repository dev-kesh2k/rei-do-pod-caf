import express from 'express';
import { prisma, wrap, HttpError, text, intOrNull, bool, slugify, parseImage, getSettings, DEFAULT_SETTINGS, cents, pricePair, KINDS } from './util.js';

export const admin = express.Router();

const productInclude = {
  brand: { select: { id: true, name: true } },
  flavors: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
};

function out(p) {
  return {
    ...p,
    photoUrl: p.photoVersion ? `api/products/${p.id}/photo?v=${p.photoVersion}` : '',
  };
}

async function uniqueSlug(base, exceptId) {
  const root = slugify(base) || 'produto';
  let slug = root;
  for (let i = 2; ; i++) {
    const hit = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${root}-${i}`;
  }
}

async function productData(body, current) {
  const data = {};
  if (!current || 'name' in body) data.name = text(body.name, 'Nome', { max: 80 });
  if (!current || 'brandId' in body) {
    const brandId = text(body.brandId, 'Categoria', { max: 40 });
    if (!(await prisma.brand.findUnique({ where: { id: brandId } }))) throw new HttpError(400, 'Categoria não encontrada');
    data.brandId = brandId;
  }
  if ('puffs' in body) data.puffs = intOrNull(body.puffs, 'Puffs', { max: 1_000_000 });
  if ('series' in body) data.series = text(body.series, 'Série', { max: 40, required: false });
  if ('description' in body) data.description = text(body.description, 'Descrição', { max: 2000, required: false });
  if ('featured' in body) data.featured = bool(body.featured);
  if ('priceCents' in body) data.priceCents = cents(body.priceCents, 'Preço');
  if ('promoCents' in body) data.promoCents = cents(body.promoCents, 'Preço promocional');
  if ('priceCents' in body || 'promoCents' in body) {
    const price = 'priceCents' in data ? data.priceCents : current?.priceCents ?? null;
    const promo = 'promoCents' in data ? data.promoCents : current?.promoCents ?? null;
    pricePair(price, promo, 'Produto');
  }
  if ('active' in body) data.active = bool(body.active);
  if ('noFlavor' in body) data.noFlavor = bool(body.noFlavor);
  if ('inStock' in body) data.inStock = bool(body.inStock);
  if ('sortOrder' in body) data.sortOrder = intOrNull(body.sortOrder, 'Ordem', { min: -100000, max: 100000 }) ?? 0;
  if ('slug' in body && String(body.slug || '').trim()) {
    const s = slugify(body.slug);
    if (!s) throw new HttpError(400, 'Link inválido');
    const hit = await prisma.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (hit && hit.id !== current?.id) throw new HttpError(409, 'Já existe outro produto com esse link');
    data.slug = s;
  }
  return data;
}

// ---------- Produtos ----------
admin.get(
  '/products',
  wrap(async (_req, res) => {
    const list = await prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: productInclude });
    res.json(list.map(out));
  })
);

admin.get(
  '/products/:id',
  wrap(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
    if (!p) throw new HttpError(404, 'Produto não encontrado');
    res.json(out(p));
  })
);

admin.post(
  '/products',
  wrap(async (req, res) => {
    const body = req.body || {};
    const data = await productData(body, null);
    if (!data.slug) data.slug = await uniqueSlug(data.name);
    if (!('sortOrder' in body)) {
      const last = await prisma.product.aggregate({ _max: { sortOrder: true } });
      data.sortOrder = (last._max.sortOrder ?? 0) + 10;
    }
    const names = Array.isArray(body.flavors) ? body.flavors.map((f) => text(f, 'Sabor', { max: 80 })).filter(Boolean) : [];
    if (body.photo) {
      const img = parseImage(body.photo);
      Object.assign(data, { photo: img.data, photoMime: img.mime, photoVersion: 1 });
    }
    const p = await prisma.product.create({
      data: { ...data, flavors: { create: names.map((name, i) => ({ name, sortOrder: (i + 1) * 10 })) } },
      include: productInclude,
    });
    res.status(201).json(out(p));
  })
);

admin.put(
  '/products/order',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
    if (!ids?.length) throw new HttpError(400, 'Lista de produtos vazia');
    await prisma.$transaction(ids.map((id, i) => prisma.product.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
    res.json({ ok: true });
  })
);

admin.put(
  '/products/:id',
  wrap(async (req, res) => {
    const current = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Produto não encontrado');
    const data = await productData(req.body || {}, current);
    const p = await prisma.product.update({ where: { id: current.id }, data, include: productInclude });
    res.json(out(p));
  })
);

admin.put(
  '/products/:id/photo',
  wrap(async (req, res) => {
    const img = parseImage(req.body?.photo);
    const p = await prisma.product.update({
      where: { id: req.params.id },
      data: { photo: img.data, photoMime: img.mime, photoVersion: { increment: 1 } },
      include: productInclude,
    });
    res.json(out(p));
  })
);

admin.delete(
  '/products/:id',
  wrap(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// Edição rápida de preços: vários produtos/sabores de uma vez (tudo ou nada).
admin.put(
  '/prices',
  wrap(async (req, res) => {
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    const flavors = Array.isArray(req.body?.flavors) ? req.body.flavors : [];
    if (!products.length && !flavors.length) throw new HttpError(400, 'Nada para salvar');
    if (products.length + flavors.length > 2000) throw new HttpError(400, 'Itens demais de uma vez');
    const ops = [];
    for (const it of products) {
      const priceCents = cents(it?.priceCents, 'Preço');
      const promoCents = cents(it?.promoCents, 'Preço promocional');
      pricePair(priceCents, promoCents, String(it?.name || 'Produto'));
      ops.push(prisma.product.update({ where: { id: String(it.id) }, data: { priceCents, promoCents } }));
    }
    for (const it of flavors) {
      const priceCents = cents(it?.priceCents, 'Preço do sabor');
      const promoCents = cents(it?.promoCents, 'Promoção do sabor');
      pricePair(priceCents, promoCents, String(it?.name || 'Sabor'));
      ops.push(prisma.flavor.update({ where: { id: String(it.id) }, data: { priceCents, promoCents } }));
    }
    await prisma.$transaction(ops);
    res.json({ ok: true, updated: ops.length });
  })
);

// ---------- Sabores ----------
admin.post(
  '/products/:id/flavors',
  wrap(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!product) throw new HttpError(404, 'Produto não encontrado');
    // Aceita um nome ou vários (um por linha).
    const names = String(req.body?.name ?? '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) throw new HttpError(400, 'Informe o nome do sabor');
    if (names.length > 100) throw new HttpError(400, 'Máximo de 100 sabores por vez');
    names.forEach((n) => text(n, 'Sabor', { max: 80 }));
    const last = await prisma.flavor.aggregate({ where: { productId: product.id }, _max: { sortOrder: true } });
    const base = last._max.sortOrder ?? 0;
    await prisma.flavor.createMany({
      data: names.map((name, i) => ({ productId: product.id, name, sortOrder: base + (i + 1) * 10 })),
    });
    const p = await prisma.product.findUnique({ where: { id: product.id }, include: productInclude });
    res.status(201).json(out(p));
  })
);

admin.put(
  '/products/:id/flavors/order',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
    if (!ids?.length) throw new HttpError(400, 'Lista de sabores vazia');
    await prisma.$transaction(
      ids.map((id, i) => prisma.flavor.update({ where: { id, productId: req.params.id }, data: { sortOrder: (i + 1) * 10 } }))
    );
    res.json({ ok: true });
  })
);

admin.patch(
  '/flavors/:id',
  wrap(async (req, res) => {
    const data = {};
    if ('name' in (req.body || {})) data.name = text(req.body.name, 'Sabor', { max: 80 });
    if ('available' in (req.body || {})) data.available = bool(req.body.available);
    if ('priceCents' in (req.body || {}) || 'promoCents' in (req.body || {})) {
      const cur = await prisma.flavor.findUnique({ where: { id: req.params.id } });
      if (!cur) throw new HttpError(404, 'Sabor não encontrado');
      data.priceCents = 'priceCents' in req.body ? cents(req.body.priceCents, 'Preço do sabor') : cur.priceCents;
      data.promoCents = 'promoCents' in req.body ? cents(req.body.promoCents, 'Promoção do sabor') : cur.promoCents;
      pricePair(data.priceCents, data.promoCents, `Sabor ${cur.name}`);
    }
    const f = await prisma.flavor.update({ where: { id: req.params.id }, data });
    res.json(f);
  })
);

admin.delete(
  '/flavors/:id',
  wrap(async (req, res) => {
    await prisma.flavor.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------- Marcas ----------
admin.get(
  '/brands',
  wrap(async (_req, res) => {
    const list = await prisma.brand.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    res.json(list.map(({ _count, ...b }) => ({ ...b, products: _count.products })));
  })
);

admin.post(
  '/brands',
  wrap(async (req, res) => {
    const name = text(req.body?.name, 'Nome da categoria', { max: 40 });
    const kind = KINDS.includes(req.body?.kind) ? req.body.kind : 'pod';
    const last = await prisma.brand.aggregate({ _max: { sortOrder: true } });
    const b = await prisma.brand.create({ data: { name, kind, sortOrder: (last._max.sortOrder ?? 0) + 10 } });
    res.status(201).json({ ...b, products: 0 });
  })
);

admin.put(
  '/brands/order',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
    if (!ids?.length) throw new HttpError(400, 'Lista de categorias vazia');
    await prisma.$transaction(ids.map((id, i) => prisma.brand.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
    res.json({ ok: true });
  })
);

admin.put(
  '/brands/:id',
  wrap(async (req, res) => {
    const data = {};
    if ('name' in (req.body || {})) data.name = text(req.body.name, 'Nome da categoria', { max: 40 });
    if ('active' in (req.body || {})) data.active = bool(req.body.active);
    if ('kind' in (req.body || {})) {
      if (!KINDS.includes(req.body.kind)) throw new HttpError(400, 'Tipo de categoria inválido');
      data.kind = req.body.kind;
    }
    const b = await prisma.brand.update({ where: { id: req.params.id }, data, include: { _count: { select: { products: true } } } });
    const { _count, ...rest } = b;
    res.json({ ...rest, products: _count.products });
  })
);

admin.delete(
  '/brands/:id',
  wrap(async (req, res) => {
    const count = await prisma.product.count({ where: { brandId: req.params.id } });
    if (count) throw new HttpError(409, `Essa categoria tem ${count} produto(s). Mude a categoria deles ou exclua-os antes.`);
    await prisma.brand.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ---------- Configurações ----------
admin.get(
  '/settings',
  wrap(async (_req, res) => {
    const logo = await prisma.asset.findUnique({ where: { key: 'logo' }, select: { version: true } });
    res.json({ settings: await getSettings(), logoVersion: logo?.version ?? 0 });
  })
);

admin.put(
  '/settings',
  wrap(async (req, res) => {
    const body = req.body || {};
    const updates = {};
    if ('whatsapp' in body) {
      const digits = String(body.whatsapp || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) throw new HttpError(400, 'WhatsApp inválido: use DDI + DDD + número (ex.: 5545998078084)');
      updates.whatsapp = digits;
    }
    const limits = { msgCart: 300, msgCartEnd: 300, msgHelp: 500, bannerTitle: 60, bannerText: 200 };
    const labels = {
      msgCart: 'Início da mensagem do pedido',
      msgCartEnd: 'Final da mensagem do pedido',
      msgHelp: 'Mensagem do botão flutuante',
      bannerTitle: 'Título do banner',
      bannerText: 'Texto do banner',
    };
    for (const [k, max] of Object.entries(limits)) {
      if (k in body) updates[k] = text(body[k], labels[k], { max, required: k !== 'msgCartEnd' });
    }
    await prisma.$transaction(
      Object.entries(updates)
        .filter(([k]) => k in DEFAULT_SETTINGS)
        .map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }))
    );
    res.json({ settings: await getSettings() });
  })
);

admin.put(
  '/logo',
  wrap(async (req, res) => {
    const img = parseImage(req.body?.logo);
    const a = await prisma.asset.upsert({
      where: { key: 'logo' },
      update: { data: img.data, mime: img.mime, version: { increment: 1 } },
      create: { key: 'logo', data: img.data, mime: img.mime },
      select: { version: true },
    });
    res.json({ logoVersion: a.version });
  })
);
