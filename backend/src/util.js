import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// O Postgres do Hub é compartilhado: limita o pool deste app.
function dbUrl() {
  const raw = process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    const max = Number(process.env.DB_POOL_SIZE) || 3;
    const current = Number(u.searchParams.get('connection_limit')) || Infinity;
    u.searchParams.set('connection_limit', String(Math.min(current, max)));
    return u.toString();
  } catch {
    return raw;
  }
}

// Os bytes das fotos só são lidos pelas rotas de imagem.
export const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl() } },
  omit: { product: { photo: true }, asset: { data: true } },
});

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Validação ----------
export function text(v, field, { max = 120, required = true } = {}) {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
  if (required && !s) throw new HttpError(400, `${field} é obrigatório`);
  if (s.length > max) throw new HttpError(400, `${field}: máximo de ${max} caracteres`);
  return s;
}

export function intOrNull(v, field, { min = 0, max = 10_000_000 } = {}) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${field} inválido`);
  return n;
}

/** Preço em centavos (inteiro) ou null. */
export function cents(v, field) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100_000_000) throw new HttpError(400, `${field} inválido`);
  return n;
}

/** Valida o par preço/promoção (promoção só com preço e menor que ele). */
export function pricePair(price, promo, what) {
  if (promo != null && price == null) throw new HttpError(400, `${what}: informe o preço antes da promoção`);
  if (promo != null && promo >= price) throw new HttpError(400, `${what}: o preço promocional precisa ser menor que o preço`);
}

export const KINDS = ['pod', 'outro'];

export const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';

export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** "data:image/webp;base64,..." → { data, mime }, só imagens e até 3 MB. */
export function parseImage(dataUrl) {
  const m = /^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'Envie uma imagem PNG, JPG, WEBP ou GIF');
  const data = Buffer.from(m[3], 'base64');
  if (!data.length) throw new HttpError(400, 'Imagem vazia');
  if (data.length > 3 * 1024 * 1024) throw new HttpError(413, 'Imagem muito grande (máx. 3 MB)');
  return { data, mime: m[1] };
}

// ---------- Configurações ----------
export const DEFAULT_SETTINGS = {
  whatsapp: '5545998078084',
  msgHelp: 'Olá! Vim pelo site e queria tirar uma dúvida.',
  bannerTitle: 'O melhor pod do Paraná',
  bannerText: 'Produtos 100% originais com a entrega mais rápida de Cafelândia e região.',
  pixKey: '',
  notifyWhatsapp: '', // número que recebe os avisos de pedido (como aparece no WhatsApp)
  notifyEnabled: '1',
};

export async function getSettings() {
  const rows = await prisma.setting.findMany();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in out) out[r.key] = r.value;
  return out;
}

// ---------- Autenticação ----------
const SECRET = process.env.JWT_SECRET || '';
if (!SECRET) console.warn('JWT_SECRET não definido: usando segredo temporário (sessões caem ao reiniciar).');
const KEY = SECRET || crypto.randomBytes(32).toString('hex');

export const signToken = (user) => jwt.sign({ sub: user.id }, KEY, { expiresIn: '30d' });
// Cliente: token próprio (typ "c"), lembrado no aparelho.
export const signCustomerToken = (c) => jwt.sign({ sub: c.id, typ: 'c' }, KEY, { expiresIn: '365d' });

export async function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Entre com seu celular' });
  try {
    const { sub, typ } = jwt.verify(token, KEY);
    if (typ !== 'c') return res.status(401).json({ error: 'Entre com seu celular' });
    const customer = await prisma.customer.findUnique({ where: { id: String(sub) } });
    if (!customer) return res.status(401).json({ error: 'Entre com seu celular' });
    req.customer = customer;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Entre de novo com seu celular.' });
  }
}

export const publicUser = ({ passwordHash, ...rest }) => rest;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const { sub, typ } = jwt.verify(token, KEY);
    if (typ) return res.status(401).json({ error: 'Não autenticado' });
    const user = await prisma.user.findUnique({ where: { id: String(sub) } });
    if (!user) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada' });
  }
}

// Tentativas de login por IP (memória): 10 erros em 15 min bloqueiam.
const attempts = new Map();
export function loginLimiter(req, res, next) {
  const ip = req.ip || 'x';
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now - a.first > 15 * 60_000) attempts.delete(ip);
  const cur = attempts.get(ip);
  if (cur && cur.count >= 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
  req.loginFail = () => {
    const c = attempts.get(ip) || { first: now, count: 0 };
    c.count += 1;
    attempts.set(ip, c);
  };
  req.loginOk = () => attempts.delete(ip);
  next();
}

// Limite genérico por IP: no máximo `max` ações de um tipo a cada 15 min (memória).
const hits = new Map();
export function limit(ip, kind, max) {
  const k = `${kind}:${ip}`;
  const now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < 15 * 60_000);
  if (list.length >= max) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  list.push(now);
  hits.set(k, list);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, l] of hits) if (!l.some((t) => now - t < 15 * 60_000)) hits.delete(k);
}, 10 * 60_000).unref();

// ---------- Celular ----------
/** Celular normalizado (DDD + número, sem o 55). */
export function phoneKey(v) {
  let d = String(v || '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d;
}

export function mobile(v) {
  const key = phoneKey(text(v, 'Celular', { max: 30 }));
  if (key.length < 10 || key.length > 11) throw new HttpError(400, 'Informe o celular com DDD (ex.: 45 99807-8084)');
  return key;
}

export const formatPhone = (key) =>
  key.length === 11 ? `(${key.slice(0, 2)}) ${key.slice(2, 7)}-${key.slice(7)}` : key.length === 10 ? `(${key.slice(0, 2)}) ${key.slice(2, 6)}-${key.slice(6)}` : key;

// ---------- Pedidos ----------
export const PAYMENT_METHODS = ['pix', 'dinheiro', 'cartao'];
export const STATUSES = ['recebido', 'confirmado', 'em_rota', 'entregue', 'cancelado'];
