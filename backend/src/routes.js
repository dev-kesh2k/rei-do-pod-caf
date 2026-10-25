import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma, wrap, getSettings, signToken, publicUser, requireAuth, loginLimiter, HttpError, text } from './util.js';
import { admin } from './admin.js';

export const api = express.Router();

api.get('/health', (_req, res) => res.json({ ok: true }));

const noStore = (res) => res.set('Cache-Control', 'no-store');

// ---------- Catálogo público ----------
// Só produtos ativos de marcas ativas e só os sabores disponíveis: o que for desligado no painel some na hora.
api.get(
  '/catalog',
  wrap(async (_req, res) => {
    const [settings, logo, products] = await Promise.all([
      getSettings(),
      prisma.asset.findUnique({ where: { key: 'logo' }, select: { version: true } }),
      prisma.product.findMany({
        where: { active: true, brand: { active: true } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          brand: { select: { name: true, sortOrder: true } },
          flavors: { where: { available: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { name: true } },
        },
      }),
    ]);
    // Botões de marca na ordem do painel, só das marcas que têm produto visível.
    const brands = [...new Map(products.map((p) => [p.brand.name, p.brand.sortOrder])).entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
    noStore(res);
    res.json({
      settings,
      logoVersion: logo?.version ?? 0,
      brands,
      products: products.map((p) => ({
        id: p.slug,
        name: p.name,
        brand: p.brand.name,
        puffs: p.puffs,
        series: p.series,
        photo: p.photoVersion ? `api/products/${p.id}/photo?v=${p.photoVersion}` : '',
        createdAt: p.createdAt,
        noFlavor: p.noFlavor,
        inStock: p.inStock,
        flavors: p.flavors.map((f) => f.name),
      })),
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

api.use('/admin', requireAuth, (_req, res, next) => {
  noStore(res);
  next();
}, admin);
