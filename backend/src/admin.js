import express from 'express';
import { prisma, wrap, HttpError, text, intOrNull, bool, slugify, parseImage, getSettings, DEFAULT_SETTINGS } from './util.js';

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
    const brandId = text(body.brandId, 'Marca', { max: 40 });
    if (!(await prisma.brand.findUnique({ where: { id: brandId } }))) throw new HttpError(400, 'Marca não encontrada');
    data.brandId = brandId;
  }
  if ('puffs' in body) data.puffs = intOrNull(body.puffs, 'Puffs', { max: 1_000_000 });
  if ('series' in body) data.series = text(body.series, 'Série', { max: 40, required: false });
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
    const name = text(req.body?.name, 'Nome da marca', { max: 40 });
    const last = await prisma.brand.aggregate({ _max: { sortOrder: true } });
    const b = await prisma.brand.create({ data: { name, sortOrder: (last._max.sortOrder ?? 0) + 10 } });
    res.status(201).json({ ...b, products: 0 });
  })
);

admin.put(
  '/brands/order',
  wrap(async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : null;
    if (!ids?.length) throw new HttpError(400, 'Lista de marcas vazia');
    await prisma.$transaction(ids.map((id, i) => prisma.brand.update({ where: { id }, data: { sortOrder: (i + 1) * 10 } })));
    res.json({ ok: true });
  })
);

admin.put(
  '/brands/:id',
  wrap(async (req, res) => {
    const data = {};
    if ('name' in (req.body || {})) data.name = text(req.body.name, 'Nome da marca', { max: 40 });
    if ('active' in (req.body || {})) data.active = bool(req.body.active);
    const b = await prisma.brand.update({ where: { id: req.params.id }, data, include: { _count: { select: { products: true } } } });
    const { _count, ...rest } = b;
    res.json({ ...rest, products: _count.products });
  })
);

admin.delete(
  '/brands/:id',
  wrap(async (req, res) => {
    const count = await prisma.product.count({ where: { brandId: req.params.id } });
    if (count) throw new HttpError(409, `Essa marca tem ${count} produto(s). Mude a marca deles ou exclua-os antes.`);
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
    if ('msgFlavor' in body) {
      updates.msgFlavor = text(body.msgFlavor, 'Mensagem do pedido com sabor', { max: 500 });
      if (!updates.msgFlavor.includes('{produto}') || !updates.msgFlavor.includes('{sabor}'))
        throw new HttpError(400, 'A mensagem do pedido com sabor precisa ter {produto} e {sabor}');
    }
    if ('msgProduct' in body) {
      updates.msgProduct = text(body.msgProduct, 'Mensagem do pedido sem sabor', { max: 500 });
      if (!updates.msgProduct.includes('{produto}')) throw new HttpError(400, 'A mensagem do pedido sem sabor precisa ter {produto}');
    }
    if ('msgHelp' in body) updates.msgHelp = text(body.msgHelp, 'Mensagem do botão flutuante', { max: 500 });
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
