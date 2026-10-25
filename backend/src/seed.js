// Idempotente: roda no start do backend e no "npm run db:seed" do Hub.
// Cria o admin inicial, o catálogo real do site original e a logo só quando ainda não existem.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { prisma, DEFAULT_SETTINGS } from './util.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'prisma');

export async function seed() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if ((await prisma.user.count()) === 0) {
    if (!email || !password) throw new Error('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos');
    await prisma.user.create({
      data: { email, name: process.env.SEED_ADMIN_NAME || 'Administrador', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Admin criado: ${email}`);
  }

  if ((await prisma.product.count()) === 0 && (await prisma.brand.count()) === 0) {
    const items = JSON.parse(fs.readFileSync(path.join(dir, 'seed-data.json'), 'utf8'));
    const brands = new Map();
    for (const p of items) {
      if (!brands.has(p.brand)) {
        const b = await prisma.brand.create({ data: { name: p.brand, sortOrder: (brands.size + 1) * 10 } });
        brands.set(p.brand, b.id);
      }
      const img = path.join(dir, 'seed-images', `${p.slug}.webp`);
      const photo = fs.existsSync(img) ? fs.readFileSync(img) : null;
      await prisma.product.create({
        data: {
          slug: p.slug,
          name: p.name,
          brandId: brands.get(p.brand),
          puffs: p.puffs ?? null,
          series: p.series || '',
          active: p.active,
          noFlavor: p.noFlavor,
          inStock: p.inStock,
          sortOrder: p.sortOrder,
          createdAt: new Date(p.createdAt),
          photo,
          photoMime: photo ? 'image/webp' : '',
          photoVersion: photo ? 1 : 0,
          flavors: { create: p.flavors.map((f) => ({ name: f.name, available: f.available, sortOrder: f.sortOrder })) },
        },
      });
    }
    console.log(`Catálogo inicial criado: ${items.length} produtos`);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  if (!(await prisma.asset.findUnique({ where: { key: 'logo' } }))) {
    const logo = path.join(dir, 'seed-images', '_logo.webp');
    if (fs.existsSync(logo)) {
      await prisma.asset.create({ data: { key: 'logo', data: fs.readFileSync(logo), mime: 'image/webp' } });
    }
  }
}
