import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { url } from '../lib/api';
import { DEFAULT_SETTINGS, formatarPuffs, mensagemPedido, normalizar, useCatalog, waLink, type PublicProduct, type Settings } from '../lib/catalog';
import { Marca, WhatsAppFlutuante, useTitulo } from '../components/Site';
import { IconBusca, IconLink, IconRelogio } from '../components/icons';

const REDUZIR_MOVIMENTO = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DIAS_NOVO = 7;

const temEstoque = (p: PublicProduct) => (p.noFlavor ? p.inStock : p.flavors.length > 0);
const ehNovo = (p: PublicProduct) => Date.now() - Date.parse(p.createdAt) < DIAS_NOVO * 24 * 60 * 60 * 1000;

/** Cards entram (sobem e aparecem) conforme chegam na tela ao rolar — só na primeira exibição. */
let observer: IntersectionObserver | null = null;
let ordemLote = 0;
function revelar(el: HTMLElement) {
  if (REDUZIR_MOVIMENTO || !('IntersectionObserver' in window)) return;
  if (!observer) {
    observer = new IntersectionObserver(
      (entradas) => {
        ordemLote = 0;
        entradas.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          const t = target as HTMLElement;
          observer!.unobserve(t);
          t.style.setProperty('--ordem', String(ordemLote++));
          t.classList.add('visivel');
          t.addEventListener(
            'transitionend',
            () => {
              t.classList.remove('revelar', 'visivel');
              t.style.removeProperty('--ordem');
            },
            { once: true }
          );
        });
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
  }
  el.classList.add('revelar');
  observer.observe(el);
}

function BotaoCompartilhar({ produto }: { produto: PublicProduct }) {
  const [copiado, setCopiado] = useState(false);
  async function compartilhar() {
    const link = `${location.origin}${location.pathname}#${produto.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: produto.name, text: `${produto.name} — REI DO POD CAF`, url: link });
      } catch {
        /* cliente cancelou */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt('Copie o link do produto:', link);
    }
  }
  return (
    <button
      type="button"
      className="btn-compartilhar"
      onClick={compartilhar}
      data-copiado={copiado ? '' : undefined}
      aria-label={copiado ? 'Link copiado!' : `Compartilhar link do ${produto.name}`}
    >
      <IconLink />
    </button>
  );
}

function BadgeSabor({ produto, sabor, ordem, settings }: { produto: string; sabor?: string; ordem: number; settings: Settings }) {
  const [clicado, setClicado] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <a
      href={waLink(settings.whatsapp, mensagemPedido(settings, produto, sabor))}
      target="_blank"
      rel="noopener noreferrer"
      className={`sabor-badge${clicado ? ' clicado' : ''}`}
      style={{ '--i': ordem } as CSSProperties}
      aria-label={sabor ? `Pedir ${produto} sabor ${sabor} via WhatsApp` : `Pedir ${produto} via WhatsApp`}
      onClick={() => {
        setClicado(true);
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setClicado(false), 2500);
      }}
    >
      <span className="sabor-badge__text">{sabor || 'Fazer Pedido'}</span>
    </a>
  );
}

function CardProduto({ produto, settings, animar, hidden }: { produto: PublicProduct; settings: Settings; animar: boolean; hidden: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (animar && ref.current) revelar(ref.current);
  }, [animar]);
  return (
    <section
      ref={ref}
      id={produto.id}
      data-marca={produto.brand}
      className="product-card"
      hidden={hidden}
      style={{ viewTransitionName: `card-${produto.id.replace(/[^a-zA-Z0-9_-]/g, '')}` } as CSSProperties}
    >
      <div className={produto.puffs ? 'card-badges' : 'card-badges single'}>
        {produto.puffs ? <span className="badge-puffs">{formatarPuffs(produto.puffs)}</span> : null}
        {produto.series ? <span className="badge-serie">{produto.series}</span> : null}
      </div>
      <div className="img-wrap">
        {produto.photo ? <img src={url(produto.photo)} alt={produto.name} loading="lazy" /> : null}
        {ehNovo(produto) ? <span className="badge-novo">Novo</span> : null}
      </div>
      <div className="card-titulo">
        <h2>{produto.name}</h2>
        <BotaoCompartilhar produto={produto} />
      </div>
      <p className="sabores-label">{produto.noFlavor ? 'Disponibilidade' : 'Sabores disponíveis'}</p>
      <div className="sabores-container">
        {!temEstoque(produto) ? (
          <p className="sem-estoque">
            <IconRelogio />
            Indisponível no momento
          </p>
        ) : produto.noFlavor ? (
          <BadgeSabor produto={produto.name} ordem={0} settings={settings} />
        ) : (
          produto.flavors.map((s, i) => <BadgeSabor key={s} produto={produto.name} sabor={s} ordem={i} settings={settings} />)
        )}
      </div>
    </section>
  );
}

function Esqueleto() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="product-card" aria-hidden="true">
          <div className="esqueleto">
            <span style={{ width: '100%', height: '11rem', borderRadius: '1rem' }} />
          </div>
          <div className="esqueleto" style={{ margin: '1rem 0' }}>
            <span style={{ width: '60%', height: '1.8rem' }} />
          </div>
          <div className="esqueleto">
            <span style={{ width: '5.5rem' }} />
            <span style={{ width: '7rem' }} />
            <span style={{ width: '4.5rem' }} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function Sabores() {
  useTitulo('Sabores Disponíveis — REI DO POD CAF');
  const { catalog, error } = useCatalog();
  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState<string | null>(null);
  const [grudado, setGrudado] = useState(false);
  const barraRef = useRef<HTMLDivElement>(null);
  const marcadorRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLElement>(null);
  const animarRef = useRef<boolean | null>(null);
  const linkTratado = useRef(false);

  const settings = catalog?.settings ?? DEFAULT_SETTINGS;
  // Com estoque primeiro, esgotados no fim (mantendo a ordem do painel).
  const produtos = useMemo(() => {
    const lista = catalog?.products ?? [];
    return [...lista.filter(temEstoque), ...lista.filter((p) => !temEstoque(p))];
  }, [catalog]);
  const marcas = catalog?.brands ?? [];
  const marcaAtiva = marca && marcas.includes(marca) ? marca : null;

  // Anima a entrada só na primeira exibição; nas atualizações silenciosas, não.
  if (animarRef.current === null && catalog) animarRef.current = true;
  useEffect(() => {
    if (catalog) {
      const t = setTimeout(() => (animarRef.current = false), 0);
      return () => clearTimeout(t);
    }
  }, [catalog]);

  const termo = normalizar(busca);
  const visivel = (p: PublicProduct) =>
    (!marcaAtiva || p.brand === marcaAtiva) &&
    (!termo || [p.name, ...p.flavors].some((t) => normalizar(t).includes(termo)));
  const totalVisiveis = produtos.filter(visivel).length;

  // Barra "grudada" ganha borda e sombra.
  useEffect(() => {
    const m = marcadorRef.current;
    if (!m || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setGrudado(!e.isIntersecting));
    io.observe(m);
    return () => io.disconnect();
  }, []);

  // Link direto (#id): rola até o card e destaca, uma vez.
  useLayoutEffect(() => {
    if (linkTratado.current || !produtos.length) return;
    linkTratado.current = true;
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const card = document.getElementById(id);
    if (!card?.classList.contains('product-card')) return;
    card.classList.remove('revelar');
    card.scrollIntoView({ block: 'center' });
    card.classList.add('destaque');
    setTimeout(() => card.classList.remove('destaque'), 2500);
  }, [produtos]);

  function voltarAoInicioDaLista() {
    const grid = gridRef.current;
    const barra = barraRef.current;
    if (!grid || !barra) return;
    const topo = grid.getBoundingClientRect().top + scrollY - barra.offsetHeight - 12;
    if (scrollY > topo) scrollTo({ top: topo, behavior: REDUZIR_MOVIMENTO ? 'auto' : 'smooth' });
  }

  function trocarMarca(m: string | null) {
    const trocar = () => flushSync(() => setMarca(m));
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !REDUZIR_MOVIMENTO) doc.startViewTransition(trocar);
    else trocar();
    voltarAoInicioDaLista();
  }

  return (
    <div className="relative min-h-[100dvh] pt-[env(safe-area-inset-top)]">
      <div className="brilho-topo" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 pt-5">
        <Marca />
      </div>

      <header className="relative z-10 px-4 pb-6 pt-10 text-center">
        <p className="entrada mb-3 text-xs font-semibold uppercase tracking-[.25em] text-ouro">Catálogo atualizado</p>
        <h1
          className="entrada mb-3 font-display text-[clamp(2.4rem,13vw,3rem)] font-extrabold uppercase leading-[.95] tracking-tight md:text-7xl"
          style={{ '--atraso': 1 } as CSSProperties}
        >
          Escolha seu <span className="texto-ouro">sabor</span>
        </h1>
        <p className="entrada mx-auto max-w-md text-sm text-stone-400 md:text-base" style={{ '--atraso': 2 } as CSSProperties}>
          Toque no sabor e o pedido vai direto pro WhatsApp.
        </p>
      </header>

      <div ref={marcadorRef} aria-hidden="true" />
      <div ref={barraRef} className={`ferramentas entrada${grudado ? ' grudado' : ''}`} style={{ '--atraso': 3 } as CSSProperties}>
        <div className="search-wrap">
          <IconBusca className="h-4 w-4" />
          <label htmlFor="busca-sabor" className="sr-only">
            Buscar produto ou sabor
          </label>
          <input
            id="busca-sabor"
            className="busca"
            type="search"
            placeholder="Buscar produto ou sabor…"
            autoComplete="off"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              requestAnimationFrame(voltarAoInicioDaLista);
            }}
          />
        </div>
        <div className="filtro-marcas" role="group" aria-label="Filtrar por marca">
          {[null, ...marcas].map((m) => (
            <button key={m ?? '*'} type="button" className="filtro-marca" aria-pressed={m === marcaAtiva} onClick={() => trocarMarca(m)}>
              {m ?? 'Todas'}
            </button>
          ))}
        </div>
      </div>

      <main
        ref={gridRef}
        className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy={!catalog}
      >
        {!catalog && !error && <Esqueleto />}
        {!catalog && error && (
          <p className="sem-estoque sem-estoque--erro" style={{ gridColumn: '1/-1' }}>
            Não foi possível carregar o catálogo agora — tente recarregar a página.
          </p>
        )}
        {produtos.map((p) => (
          <CardProduto key={p.id} produto={p} settings={settings} animar={!!animarRef.current} hidden={!visivel(p)} />
        ))}
      </main>

      {catalog && totalVisiveis === 0 && (
        <p className="relative z-10 px-4 pb-24 text-center text-sm text-stone-400">
          {catalog.products.length === 0 ? (
            'Nenhum produto disponível no momento.'
          ) : (
            <>
              Nada encontrado para “<span className="text-stone-100">{[busca.trim(), marcaAtiva].filter(Boolean).join(' em ')}</span>”. Tente
              outro nome de produto ou sabor.
            </>
          )}
        </p>
      )}

      <footer className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">
        &copy; {new Date().getFullYear()} REI DO POD CAF — Todos os direitos reservados.
        <br />
        Proibida a venda para menores de 18 anos.
      </footer>
      <WhatsAppFlutuante />
    </div>
  );
}
