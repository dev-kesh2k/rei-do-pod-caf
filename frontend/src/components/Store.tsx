import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { url } from '../lib/api';
import { DEFAULT_SETTINGS, brl, ehNovo, formatarPuffs, logoUrl, resumoPreco, temPromocao, useCatalog, waLink, type PublicProduct } from '../lib/catalog';
import { useCliente } from '../lib/customer';
import { useCart } from '../lib/cart';
import { useToast } from './Toast';
import { IconBusca, IconCarrinho, IconCasa, IconFoto, IconGrade, IconRecibo, IconWhatsApp } from './icons';

export function Logo({ compacto = false }: { compacto?: boolean }) {
  const { catalog } = useCatalog();
  return (
    <Link to="/" className="marca min-w-0" aria-label="REI DO POD CAF — início">
      <img src={logoUrl(catalog?.logoVersion ?? 0)} alt="" width={40} height={40} className="shrink-0" />
      <span className={`truncate ${compacto ? '!text-xl' : ''}`}>
        Rei do Pod <span className="texto-ouro">Caf</span>
      </span>
    </Link>
  );
}

function Contador({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ouro px-1 text-[11px] font-bold leading-none text-[#1a1406]">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function BuscaTopo() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [q, setQ] = useState(pathname === '/produtos' ? params.get('q') ?? '' : '');
  useEffect(() => {
    if (pathname === '/produtos') setQ(params.get('q') ?? '');
  }, [pathname, params]);
  function buscar(e: FormEvent) {
    e.preventDefault();
    nav(`/produtos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  }
  return (
    <form onSubmit={buscar} role="search" className="relative w-full max-w-xl">
      <IconBusca className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
      <input type="search" className="busca" placeholder="Buscar pod, sabor ou acessório…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produtos" />
    </form>
  );
}

const linkTopo = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'text-ouro' : 'text-texto-2 hover:text-texto'}`;

/** Botão de suporte: abre a conversa com a loja no WhatsApp (o pedido é feito no app). */
export function SuporteWhats({ className = '', children }: { className?: string; children?: ReactNode }) {
  const { catalog } = useCatalog();
  const s = catalog?.settings ?? DEFAULT_SETTINGS;
  return (
    <a href={waLink(s.whatsapp, s.msgHelp)} target="_blank" rel="noopener noreferrer" className={className}>
      <IconWhatsApp className="h-5 w-5 shrink-0" />
      {children ?? 'Falar com a loja'}
    </a>
  );
}

/** Moldura da loja: cabeçalho (desktop), topo + barra inferior (celular) e rodapé com suporte. */
export function StoreLayout({ children }: { children: ReactNode }) {
  const { quantidade } = useCart();
  const { cliente } = useCliente();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const abas = [
    { to: '/', label: 'Início', Icon: IconCasa, end: true },
    { to: '/categorias', label: 'Categorias', Icon: IconGrade },
    { to: '/produtos?busca=1', label: 'Busca', Icon: IconBusca, ativo: pathname === '/produtos' },
    { to: '/carrinho', label: 'Carrinho', Icon: IconCarrinho, n: quantidade },
    { to: '/pedidos', label: 'Pedidos', Icon: IconRecibo },
  ];

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-50 border-b border-borda bg-fundo/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:h-[4.5rem] lg:gap-8">
          <div className="min-w-0 flex-1 md:flex-none">
            <Logo />
          </div>
          <div className="hidden flex-1 justify-center md:flex">
            <BuscaTopo />
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink to="/" end className={linkTopo}>
              Início
            </NavLink>
            <NavLink to="/produtos" className={linkTopo}>
              Produtos
            </NavLink>
            <NavLink to="/categorias" className={linkTopo}>
              Categorias
            </NavLink>
          </nav>
          <NavLink
            to="/pedidos"
            className={({ isActive }) =>
              `hidden h-11 max-w-[11rem] items-center gap-2 rounded-full px-3 text-sm font-semibold md:inline-flex ${isActive ? 'text-ouro' : 'text-texto-2 hover:text-texto'}`
            }
          >
            <IconRecibo className="h-5 w-5 shrink-0" />
            <span className="truncate">{cliente ? cliente.name.split(' ')[0] : 'Meus pedidos'}</span>
          </NavLink>
          <Link
            to="/carrinho"
            className="relative hidden h-11 items-center gap-2 rounded-full border border-borda bg-superficie px-4 text-sm font-semibold transition-colors hover:border-ouro/40 md:inline-flex"
            aria-label={`Carrinho, ${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`}
          >
            <span className="relative">
              <IconCarrinho className="h-5 w-5" />
              <Contador n={quantidade} />
            </span>
            Carrinho
          </Link>
        </div>
      </header>

      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</div>

      <footer className="border-t border-borda px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-8 text-center text-xs text-stone-400 md:pb-10">
        <p className="mb-1 font-display text-lg font-extrabold uppercase tracking-wide text-texto">
          Rei do Pod <span className="texto-ouro">Caf</span>
        </p>
        <p>Pods 100% originais · Cafelândia e região · Entrega com pagamento na hora</p>
        <SuporteWhats className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#25d366]/40 px-4 text-sm font-semibold text-[#5be08f] hover:bg-[#25d366]/10">
          Dúvidas? Fale com a loja
        </SuporteWhats>
        <p className="mt-2">&copy; {new Date().getFullYear()} REI DO POD CAF — Proibida a venda para menores de 18 anos.</p>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-borda bg-fundo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Navegação">
        <div className="grid grid-cols-5">
          {abas.map(({ to, label, Icon, end, n, ativo }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-1 text-[10.5px] min-[360px]:text-[11px] font-semibold transition-colors ${
                  (ativo ?? isActive) ? 'text-ouro' : 'text-texto-3'
                }`
              }
            >
              <span className="relative">
                <Icon className="h-6 w-6" />
                {n !== undefined && <Contador n={n} />}
              </span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

    </div>
  );
}

export function PrecoVitrine({ p, grande = false }: { p: PublicProduct; grande?: boolean }) {
  const r = resumoPreco(p);
  if (r.tipo === 'esgotado') return <p className={`font-semibold text-texto-3 ${grande ? 'text-xl' : 'text-sm'}`}>Esgotado</p>;
  if (r.tipo === 'consultar')
    return <p className={`font-display font-extrabold uppercase tracking-wide text-ouro ${grande ? 'text-3xl' : 'text-xl'}`}>Consultar</p>;
  return (
    <div className="min-w-0">
      {r.de != null && <p className={`text-texto-3 line-through ${grande ? 'text-sm' : 'text-[11px]'}`}>de {brl(r.de)}</p>}
      <p className={`flex flex-wrap items-baseline gap-x-1 font-bold leading-tight ${grande ? 'text-3xl' : 'text-lg'}`}>
        {r.aPartir && <span className={`font-medium text-texto-2 ${grande ? 'text-sm' : 'text-[11px]'}`}>{r.de != null ? 'por' : 'a partir de'}</span>}
        {!r.aPartir && r.de != null && <span className={`font-medium text-texto-2 ${grande ? 'text-sm' : 'text-[11px]'}`}>por</span>}
        <span className="texto-ouro">{brl(r.valor)}</span>
      </p>
    </div>
  );
}

export function Selos({ p, className = '' }: { p: PublicProduct; className?: string }) {
  const r = resumoPreco(p);
  const selos: [string, string][] = [];
  if (r.tipo === 'esgotado') selos.push(['Esgotado', 'bg-zinc-700/90 text-zinc-100']);
  else {
    if (temPromocao(p)) selos.push([r.tipo === 'preco' && r.desconto > 0 ? `-${r.desconto}%` : 'Promoção', 'bg-red-500 text-white']);
    if (ehNovo(p)) selos.push(['Novo', 'botao-ouro !shadow-none']);
  }
  if (!selos.length) return null;
  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      {selos.map(([t, cls]) => (
        <span
          key={t}
          aria-label={t.startsWith('-') ? `Promoção ${t}` : undefined}
          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cls}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

/** Foto que sempre cabe na caixa do pai (o pai define o tamanho). */
export function FotoProduto({ p, className = '' }: { p: PublicProduct; className?: string }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      {p.photo ? (
        <img
          src={url(p.photo)}
          alt={p.name}
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,.55)] ${className}`}
        />
      ) : (
        <IconFoto className="h-10 w-10 text-texto-3" />
      )}
    </span>
  );
}

/** Card da vitrine. Produto sem sabores tem "Adicionar" direto; com sabores leva à página do produto. */
export function CardProduto({ p }: { p: PublicProduct }) {
  const { adicionar } = useCart();
  const toast = useToast();
  const r = resumoPreco(p);
  const esgotado = r.tipo === 'esgotado';
  const disp = p.flavors.filter((f) => f.available).length;
  const meta = [p.puffs ? formatarPuffs(p.puffs) : '', p.noFlavor ? '' : `${disp} ${disp === 1 ? 'sabor' : 'sabores'}`].filter(Boolean).join(' · ');

  return (
    <article className={`loja-card group flex h-full min-w-0 flex-col ${esgotado ? 'opacity-70' : ''}`}>
      <Link to={`/produto/${p.id}`} className="flex flex-1 flex-col" aria-label={p.name}>
        <div className="relative flex aspect-square items-center justify-center p-3 sm:p-5">
          <FotoProduto p={p} className={`transition-transform duration-500 group-hover:scale-105 ${esgotado ? 'grayscale' : ''}`} />
          <Selos p={p} className="absolute left-2 top-2 sm:left-3 sm:top-3" />
        </div>
        <div className="flex flex-1 flex-col gap-1 px-3 pb-2 sm:px-4">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[.15em] text-ouro/80 sm:text-[11px]">{p.brand}</p>
          <h3 className="line-clamp-2 font-display text-lg font-extrabold uppercase leading-[1.05] sm:text-xl">{p.name}</h3>
          {meta && <p className="truncate text-[11px] text-texto-3 sm:text-xs">{meta}</p>}
          <div className="mt-auto pt-1">
            <PrecoVitrine p={p} />
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        {esgotado ? (
          <span className="flex min-h-10 w-full items-center justify-center rounded-xl border border-borda text-xs font-semibold text-texto-3">Indisponível</span>
        ) : p.noFlavor ? (
          <button
            type="button"
            className="botao-ouro flex min-h-10 w-full items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider sm:text-sm"
            onClick={() => {
              adicionar(p.uid, null, 1);
              toast(`${p.name} no carrinho`);
            }}
          >
            Adicionar
          </button>
        ) : (
          <Link
            to={`/produto/${p.id}`}
            className="flex min-h-10 w-full items-center justify-center rounded-xl border border-ouro/30 bg-ouro/5 text-xs font-bold uppercase tracking-wider text-ouro transition-colors hover:bg-ouro/15 sm:text-sm"
          >
            Escolher sabor
          </Link>
        )}
      </div>
    </article>
  );
}

export function GradeProdutos({ produtos }: { produtos: PublicProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {produtos.map((p) => (
        <CardProduto key={p.uid} p={p} />
      ))}
    </div>
  );
}

export function GradeEsqueleto({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="loja-card aspect-[3/5] animate-pulse" />
      ))}
    </div>
  );
}

export function Secao({ titulo, acao, children, id }: { titulo: ReactNode; acao?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="min-w-0 font-display text-[clamp(1.6rem,7vw,2.25rem)] font-extrabold uppercase leading-none">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
