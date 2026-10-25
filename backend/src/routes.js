import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma, wrap, getSettings, signToken, publicUser, requireAuth, loginLimiter, HttpError, text } from './util.js';
import { admin } from './admin.js';
import { customerApi } from './customer.js';

export const api = express.Router();

api.get('/health', (_req, res) => res.json({ ok: true }));

const noStore = (res) => res.set('Cache-Control', 'no-store');

// ---------- Catálogo público ----------
// Só produtos ativos de categorias ativas. Sabor esgotado vem sem preço (não pode ser comprado).
function offer(price, promo) {
  if (price == null) return { price: null, promo: null };
  return { price, promo: promo != null && promo < price ? promo : null };
}

api.get(
  '/catalog',
  wrap(async (_req, res) => {
    const [settings, logo, products, brands] = await Promise.all([
      getSettings(),
      prisma.asset.findUnique({ where: { key: 'logo' }, select: { version: true } }),
      prisma.product.findMany({
        where: { active: true, brand: { active: true } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: { flavors: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
      }),
      prisma.brand.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    ]);
    const brandById = new Map(brands.map((b) => [b.id, b]));
    const count = new Map();
    for (const p of products) count.set(p.brandId, (count.get(p.brandId) || 0) + 1);
    noStore(res);
    // Número e chave dos avisos são só do painel.
    const { notifyWhatsapp: _n, notifyEnabled: _e, ...publicSettings } = settings;
    res.json({
      settings: publicSettings,
      logoVersion: logo?.version ?? 0,
      categories: brands.filter((b) => count.get(b.id)).map((b) => ({ name: b.name, kind: b.kind, count: count.get(b.id) })),
      products: products.map((p) => {
        const base = offer(p.priceCents, p.promoCents);
        const flavors = p.flavors.map((f) => {
          const o = f.priceCents != null ? offer(f.priceCents, f.promoCents) : base;
          return f.available ? { id: f.id, name: f.name, available: true, ...o } : { id: f.id, name: f.name, available: false, price: null, promo: null };
        });
        const inStock = p.noFlavor ? p.inStock : flavors.some((f) => f.available);
        return {
          uid: p.id,
          id: p.slug,
          name: p.name,
          brand: brandById.get(p.brandId)?.name ?? '',
          kind: brandById.get(p.brandId)?.kind ?? 'pod',
          puffs: p.puffs,
          series: p.series,
          description: p.description,
          photo: p.photoVersion ? `api/products/${p.id}/photo?v=${p.photoVersion}` : '',
          createdAt: p.createdAt,
          featured: p.featured,
          noFlavor: p.noFlavor,
          inStock,
          ...(p.noFlavor && !inStock ? { price: null, promo: null } : base),
          flavors: p.noFlavor ? [] : flavors,
        };
      }),
    });
  })
);

// ---------- Imagens ----------
api.get(
  '/products/:id/photo',
  wrap(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, select: { photo: true, photoMime: true } });
    if (!p?.photo) throw new HttpError(404, 'Sem foto');
    res.set('Content-Type', p.photoMime || 'image/webp');
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.send(Buffer.from(p.photo));
  })
);

api.get(
  '/logo',
  wrap(async (req, res) => {
    const a = await prisma.asset.findUnique({ where: { key: 'logo' }, select: { data: true, mime: true } });
    if (!a) throw new HttpError(404, 'Sem logo');
    res.set('Content-Type', a.mime);
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.send(Buffer.from(a.data));
  })
);

// ---------- Login ----------
api.post(
  '/auth/login',
  loginLimiter,
  wrap(async (req, res) => {
    const email = text(req.body?.email, 'E-mail', { max: 160 }).toLowerCase();
    const password = text(req.body?.password, 'Senha', { max: 200 });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      req.loginFail();
      throw new HttpError(401, 'E-mail ou senha incorretos');
    }
    req.loginOk();
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

api.get('/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

api.post(
  '/auth/password',
  requireAuth,
  wrap(async (req, res) => {
    const current = text(req.body?.current, 'Senha atual', { max: 200 });
    const next = text(req.body?.password, 'Nova senha', { max: 200 });
    if (next.length < 8) throw new HttpError(400, 'A nova senha precisa de pelo menos 8 caracteres');
    if (!(await bcrypt.compare(current, req.user.passwordHash))) throw new HttpError(400, 'Senha atual incorreta');
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    res.json({ ok: true });
  })
);

api.use(customerApi);

api.use('/admin', requireAuth, (_req, res, next) => {
  noStore(res);
  next();
}, admin);
