import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from '../../lib/api';
import { logoUrl, useCatalog } from '../../lib/catalog';
import { IconAjustes, IconCaixa, IconOlho, IconSair, IconTag } from '../../components/icons';

const ITENS = [
  { to: '/admin', end: true, label: 'Produtos', Icon: IconCaixa },
  { to: '/admin/marcas', label: 'Marcas', Icon: IconTag },
  { to: '/admin/ajustes', label: 'Ajustes', Icon: IconAjustes },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const [logado, setLogado] = useState(!!getToken());
  const [nome, setNome] = useState('');
  const { catalog } = useCatalog();

  useEffect(() => {
    const sair = () => setLogado(false);
    window.addEventListener('rdp:logout', sair);
    if (getToken()) api<{ user: { name: string } }>('auth/me').then((r) => setNome(r.user.name)).catch(() => {});
    return () => window.removeEventListener('rdp:logout', sair);
  }, []);

  if (!logado) return <Navigate to="/admin/login" replace />;

  function sair() {
    setToken(null);
    nav('/admin/login', { replace: true });
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
      isActive ? 'bg-ouro/10 text-ouro' : 'text-texto-2 hover:bg-white/5 hover:text-texto'
    }`;

  return (
    <div className="min-h-[100dvh] lg:flex">
      {/* Menu lateral (desktop) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-borda bg-superficie/60 p-4 lg:flex">
        <Link to="/admin" className="mb-6 flex items-center gap-3 px-2 py-2">
          <img src={logoUrl(catalog?.logoVersion ?? 0)} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-ouro/40" />
          <span className="font-display text-xl font-extrabold uppercase leading-none">
            Rei do Pod <span className="texto-ouro">Caf</span>
            <span className="mt-1 block font-sans text-[11px] font-semibold normal-case tracking-normal text-texto-3">Painel</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {ITENS.map(({ to, end, label, Icon }) => (
            <NavLink key={to} to={to} end={end} className={linkCls}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
          <a href={import.meta.env.BASE_URL + 'sabores'} target="_blank" rel="noopener" className={linkCls({ isActive: false })}>
            <IconOlho className="h-5 w-5" />
            Ver catálogo
          </a>
        </nav>
        <div className="mt-auto border-t border-borda pt-4">
          {nome && <p className="truncate px-3 pb-2 text-xs text-texto-3">{nome}</p>}
          <button type="button" onClick={sair} className={linkCls({ isActive: false }) + ' w-full'}>
            <IconSair className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Topo (celular/tablet) */}
        <header className="sticky top-0 z-30 border-b border-borda bg-fundo/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between gap-2 px-4">
            <Link to="/admin" className="flex min-w-0 items-center gap-2.5">
              <img src={logoUrl(catalog?.logoVersion ?? 0)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-ouro/40" />
              <span className="truncate font-display text-lg font-extrabold uppercase">
                Rei do Pod <span className="texto-ouro">Caf</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center">
              <a href={import.meta.env.BASE_URL + 'sabores'} target="_blank" rel="noopener" className="adm-icon-btn" aria-label="Ver catálogo">
                <IconOlho />
              </a>
              <button type="button" onClick={sair} className="adm-icon-btn" aria-label="Sair">
                <IconSair />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>

        {/* Barra inferior (celular/tablet) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-fundo/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3">
            {ITENS.map(({ to, end, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    isActive ? 'text-ouro' : 'text-texto-3'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
