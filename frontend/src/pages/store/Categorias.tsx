import { Link } from 'react-router-dom';
import { url } from '../../lib/api';
import { useCatalog, type Category } from '../../lib/catalog';
import { StoreLayout } from '../../components/Store';
import { useTitulo } from '../../components/Site';

export default function Categorias() {
  useTitulo('Categorias — REI DO POD CAF');
  const { catalog, error } = useCatalog();
  const cats = catalog?.categories ?? [];
  const grupos: [string, Category[]][] = [
    ['Pods por marca', cats.filter((c) => c.kind === 'pod')],
    ['Outros produtos', cats.filter((c) => c.kind === 'outro')],
  ];

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 md:pt-8">
        <h1 className="mb-6 font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-none">
          <span className="texto-ouro">Categorias</span>
        </h1>
        {!catalog && !error && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="loja-card h-40 animate-pulse" />
            ))}
          </div>
        )}
        {!catalog && error && <p className="text-sm text-orange-300">Não foi possível carregar — tente recarregar a página.</p>}
        {grupos.map(([titulo, lista]) =>
          lista.length ? (
            <section key={titulo} className="mb-8">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.2em] text-texto-3">{titulo}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {lista.map((c) => {
                  const fotos = (catalog?.products ?? []).filter((p) => p.brand === c.name && p.photo).slice(0, 1);
                  return (
                    <Link key={c.name} to={`/produtos?cat=${encodeURIComponent(c.name)}`} className="loja-card group flex flex-col p-3 sm:p-4">
                      <div className="flex h-28 items-center justify-center sm:h-36">
                        {fotos.map((p) => (
                          <img
                            key={p.uid}
                            src={url(p.photo)}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,.6)] transition-transform duration-500 group-hover:scale-105"
                          />
                        ))}
                      </div>
                      <p className="mt-3 truncate font-display text-xl font-extrabold uppercase">{c.name}</p>
                      <p className="text-xs text-texto-3">
                        {c.count} {c.count === 1 ? 'produto' : 'produtos'}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null
        )}
      </div>
    </StoreLayout>
  );
}
