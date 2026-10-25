import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { url } from '../../lib/api';
import { ehNovo, temEstoque, temPromocao, useCatalog, type PublicProduct } from '../../lib/catalog';
import { CardProduto, GradeEsqueleto, Secao, StoreLayout } from '../../components/Store';
import { useTitulo } from '../../components/Site';
import { IconCarrinho, IconEscudo, IconRaio, IconSeta } from '../../components/icons';
import destaque from '../../destaque.webp';

/** Linha de produtos: rola para o lado no celular, grade no desktop. */
function Prateleira({ produtos }: { produtos: PublicProduct[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      {produtos.map((p) => (
        <div key={p.uid} className="w-[min(44vw,13rem)] shrink-0 snap-start [&>article]:h-full md:w-auto">
          <CardProduto p={p} />
        </div>
      ))}
    </div>
  );
}

const verTodos = (to: string) => (
  <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ouro hover:text-ouro-claro">
    Ver todos
    <IconSeta className="h-4 w-4" />
  </Link>
);

function Titulo({ texto }: { texto: string }) {
  // Última palavra em dourado, como no site original.
  const partes = texto.trim().split(/\s+/);
  const ultima = partes.pop();
  return (
    <>
      {partes.join(' ')} {ultima && <span className="texto-ouro">{ultima}</span>}
    </>
  );
}

export default function Inicio() {
  useTitulo('REI DO POD CAF — Loja de pods originais em Cafelândia e região');
  const { catalog, error } = useCatalog();
  const produtos = useMemo(() => catalog?.products ?? [], [catalog]);
  const comEstoque = useMemo(() => produtos.filter(temEstoque), [produtos]);
  const promocoes = comEstoque.filter(temPromocao).slice(0, 10);
  const destaques = comEstoque.filter((p) => p.featured).slice(0, 10);
  const vitrine = destaques.length ? destaques : comEstoque.slice(0, 10);
  // Novidades: só cadastrados há pouco (selo "Novo"), fora da Vitrine e quando são minoria —
  // se todos têm a mesma data (ex.: catálogo importado de uma vez), a seção não aparece.
  const naVitrine = new Set(vitrine.map((p) => p.uid));
  const recentes = comEstoque.filter(ehNovo);
  const novidades =
    recentes.length <= comEstoque.length / 2
      ? recentes.filter((p) => !naVitrine.has(p.uid)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 10)
      : [];
  const s = catalog?.settings;

  return (
    <StoreLayout>
      {/* Banner */}
      <section className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-ouro/20 bg-superficie">
          <img src={destaque} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 md:left-auto md:w-3/5 md:opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-fundo via-fundo/70 to-fundo/10 md:bg-gradient-to-r md:from-fundo md:via-fundo/85 md:to-transparent" aria-hidden="true" />
          <div className="relative flex min-h-[22rem] flex-col justify-end gap-4 p-5 sm:p-8 md:min-h-[26rem] md:max-w-xl md:justify-center md:p-12">
            <p className="entrada inline-flex w-fit items-center gap-2 rounded-full border border-ouro/30 bg-fundo/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.2em] text-ouro">
              <IconEscudo className="h-3.5 w-3.5" />
              100% originais
            </p>
            <h1 className="entrada font-display text-[clamp(2.6rem,12vw,4.75rem)] font-extrabold uppercase leading-[.9] tracking-tight" style={{ '--atraso': 1 } as CSSProperties}>
              <Titulo texto={s?.bannerTitle ?? 'O melhor pod do Paraná'} />
            </h1>
            {s?.bannerText && (
              <p className="entrada max-w-md text-base text-stone-300 md:text-lg" style={{ '--atraso': 2 } as CSSProperties}>
                {s.bannerText}
              </p>
            )}
            <div className="entrada flex flex-col gap-2 sm:flex-row" style={{ '--atraso': 3 } as CSSProperties}>
              <Link to="/produtos" className="botao-ouro flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 font-bold uppercase tracking-wider">
                Ver produtos
                <IconSeta className="h-5 w-5" />
              </Link>
              {promocoes.length > 0 && (
                <Link to="/produtos?ordem=promocao" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-fundo/60 px-6 font-semibold backdrop-blur">
                  Promoções
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens */}
      <section className="mx-auto max-w-7xl px-4 pt-4">
        <ul className="grid grid-cols-2 gap-2 text-xs sm:text-sm md:grid-cols-4">
          {[
            [IconEscudo, '100% original', 'Produtos de procedência'],
            [IconRaio, 'Entrega rapidex', 'Em mãos, Cafelândia e região'],
            [IconCarrinho, 'Peça pelo app', 'Pague na entrega'],
            [IconEscudo, '+500 clientes', 'Top 1 de Cafelândia'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof IconEscudo;
            return (
              <li key={t as string} className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-borda bg-superficie/70 p-3">
                <I className="h-5 w-5 shrink-0 text-ouro" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{t as string}</span>
                  <span className="block truncate text-[11px] text-texto-3 sm:text-xs">{d as string}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Categorias */}
      {catalog && catalog.categories.length > 0 && (
        <Secao titulo="Categorias" acao={verTodos('/categorias')}>
          <div className="chips -mx-4 px-4 md:mx-0 md:flex-wrap md:px-0">
            {catalog.categories.map((c) => {
              const capa = produtos.find((p) => p.brand === c.name && p.photo);
              return (
                <Link
                  key={c.name}
                  to={`/produtos?cat=${encodeURIComponent(c.name)}`}
                  className="flex min-h-14 shrink-0 items-center gap-2.5 rounded-2xl border border-borda bg-superficie py-2 pl-2 pr-4 transition-colors hover:border-ouro/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fundo">
                    {capa && <img src={url(capa.photo)} alt="" loading="lazy" className="max-h-10 max-w-10 object-contain" />}
                  </span>
                  <span>
                    <span className="block whitespace-nowrap text-sm font-semibold">{c.name}</span>
                    <span className="block text-[11px] text-texto-3">
                      {c.count} {c.count === 1 ? 'produto' : 'produtos'}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Secao>
      )}

      {!catalog && !error && (
        <Secao titulo="Carregando…">
          <GradeEsqueleto n={5} />
        </Secao>
      )}
      {!catalog && error && (
        <p className="mx-auto max-w-7xl px-4 py-10 text-center text-sm text-orange-300">Não foi possível carregar a loja agora — tente recarregar a página.</p>
      )}

      {promocoes.length > 0 && (
        <Secao titulo={<span className="texto-ouro">Promoções</span>} acao={verTodos('/produtos?ordem=promocao')}>
          <Prateleira produtos={promocoes} />
        </Secao>
      )}
      {vitrine.length > 0 && (
        <Secao titulo={destaques.length ? 'Destaques' : 'Vitrine'} acao={verTodos('/produtos')}>
          <Prateleira produtos={vitrine} />
        </Secao>
      )}
      {novidades.length > 0 && (
        <Secao titulo="Novidades" acao={verTodos('/produtos?ordem=novos')}>
          <Prateleira produtos={novidades} />
        </Secao>
      )}

      {catalog && (
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-2">
          <Link to="/produtos" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-ouro/30 bg-ouro/5 font-bold uppercase tracking-wider text-ouro hover:bg-ouro/10">
            Ver todos os {produtos.length} produtos
            <IconSeta className="h-5 w-5" />
          </Link>
        </div>
      )}
    </StoreLayout>
  );
}
