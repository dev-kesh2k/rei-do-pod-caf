import { Link } from 'react-router-dom';
import { Marca, WhatsAppFlutuante, useTitulo } from '../components/Site';
import { IconCoroa, IconSeta } from '../components/icons';
import destaque from '../destaque.webp';

const STATS = [
  ['100%', 'Original'],
  ['Rapidex', 'Entrega em mãos'],
  ['+500', 'Clientes'],
  ['Top 1', 'Cafelândia'],
];

export default function Home() {
  useTitulo('REI DO POD CAF — Pods originais em Cafelândia e região');
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-fundo/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Marca />
          <Link to="/sabores" className="hidden items-center gap-2 text-sm font-semibold text-ouro transition-colors hover:text-ouro-claro sm:inline-flex">
            Ver sabores
            <IconSeta className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[48rem] max-w-[100vw] -translate-x-1/2 rounded-full bg-ouro/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-14 md:pt-20">
          <div className="mb-12 text-center">
            <p className="entrada mb-6 inline-flex items-center gap-2 rounded-full border border-ouro/30 bg-ouro/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.2em] text-ouro">
              <IconCoroa className="h-3.5 w-3.5" />
              O melhor do PR
            </p>
            <h1
              className="entrada mb-6 font-display text-[clamp(3rem,15vw,3.75rem)] font-extrabold uppercase leading-[.9] tracking-tight md:text-8xl"
              style={{ '--atraso': 1 } as React.CSSProperties}
            >
              O melhor pod
              <br />
              do <span className="texto-ouro">Paraná</span>
            </h1>
            <p className="entrada mx-auto max-w-md text-lg leading-relaxed text-stone-400" style={{ '--atraso': 2 } as React.CSSProperties}>
              Produtos <span className="font-medium text-stone-100">100% originais</span> com a entrega mais rápida de Cafelândia e região. Sabor
              intenso até o último puff.
            </p>
          </div>

          <Link
            to="/sabores"
            className="entrada group mx-auto mb-16 block max-w-2xl rounded-[2rem] bg-gradient-to-b from-ouro/40 via-white/10 to-transparent p-px"
            style={{ '--atraso': 3 } as React.CSSProperties}
          >
            <div className="overflow-hidden rounded-[calc(2rem-1px)] bg-superficie">
              <div className="relative overflow-hidden">
                <img
                  src={destaque}
                  alt="Pods Elfbar, Black Sheep e Ignite lado a lado"
                  width={1344}
                  height={896}
                  className="h-64 w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 md:h-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-superficie via-transparent to-transparent" aria-hidden="true" />
              </div>
              <div className="relative -mt-10 p-5 sm:p-6 md:p-8">
                <span className="botao-ouro flex w-full items-center justify-center gap-3 rounded-2xl px-3 py-5 text-center text-[clamp(.8rem,3.8vw,.95rem)] font-bold uppercase tracking-[.1em] md:text-lg md:tracking-[.15em]">
                  Explorar todos os sabores
                  <IconSeta className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>

          <dl
            className="entrada mx-auto grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/5 bg-white/5 md:grid-cols-4"
            style={{ '--atraso': 4 } as React.CSSProperties}
          >
            {STATS.map(([valor, rotulo]) => (
              <div key={rotulo} className="flex flex-col items-center bg-fundo px-2 py-6 text-center">
                <dt className="order-2 mt-1 text-[11px] font-semibold uppercase tracking-widest text-stone-400">{rotulo}</dt>
                <dd className="texto-ouro order-1 font-display text-3xl font-extrabold uppercase">{valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>

      <footer className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-xs text-stone-400">
        &copy; {new Date().getFullYear()} REI DO POD CAF — Proibida a venda para menores de 18 anos.
      </footer>
      <WhatsAppFlutuante />
    </div>
  );
}
