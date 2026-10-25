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

export const bool = (v) => v === true || v === 'true' || v === 1;

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
  msgFlavor: 'Olá! Gostaria de {produto} sabor {sabor}. Está disponível?',
  msgProduct: 'Olá! Gostaria de {produto}. Está disponível?',
  msgHelp: 'Olá! Vim pelo site e queria tirar uma dúvida.',
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

export const publicUser = ({ passwordHash, ...rest }) => rest;

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const { sub } = jwt.verify(token, KEY);
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
