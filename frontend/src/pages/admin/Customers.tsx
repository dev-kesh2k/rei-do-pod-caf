import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorText } from '../../lib/api';
import { brl } from '../../lib/catalog';
import { dataHora } from '../../lib/orders';
import { useTitulo } from '../../components/Site';
import { IconBusca, IconWhatsApp } from '../../components/icons';

type Cliente = { id: string; name: string; phone: string; phoneKey: string; orders: number; spentCents: number; lastOrderAt: string | null; createdAt: string };

export default function Customers() {
  useTitulo('Clientes — Painel');
  const [lista, setLista] = useState<Cliente[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api<Cliente[]>(`admin/customers?q=${encodeURIComponent(busca.trim())}`)
        .then((l) => {
          setLista(l);
          setErro('');
        })
        .catch((e) => setErro(errorText(e, 'Não foi possível carregar os clientes')));
    }, 250);
    return () => clearTimeout(t);
  }, [busca]);

  const wa = (c: Cliente) => `https://wa.me/55${c.phoneKey}?text=${encodeURIComponent(`Olá, ${c.name.split(' ')[0]}! Aqui é do Rei do Pod Caf.`)}`;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase sm:text-4xl">Clientes</h1>
      <p className="mb-4 text-sm text-texto-2">
        Quem entrou na loja com o celular. Total gasto não conta pedidos cancelados.
        {lista && ` ${lista.length} cliente(s).`}
      </p>
      <div className="relative mb-4">
        <IconBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-texto-3" />
        <input type="search" className="adm-input pl-10 pr-3" placeholder="Buscar por nome ou celular…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar clientes" />
      </div>
      {erro && <div className="adm-card mb-4 p-4 text-sm text-red-300">{erro}</div>}
      {!lista && !erro && <div className="adm-card h-64 animate-pulse" />}
      {lista && lista.length === 0 && <div className="adm-card p-8 text-center text-sm text-texto-2">Nenhum cliente encontrado.</div>}

      {lista && lista.length > 0 && (
        <>
          <div className="adm-card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-borda text-left text-xs uppercase tracking-wider text-texto-3">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Celular</th>
                  <th className="px-4 py-3 text-right font-semibold">Pedidos</th>
                  <th className="px-4 py-3 text-right font-semibold">Total gasto</th>
                  <th className="px-4 py-3 font-semibold">Último pedido</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-b border-borda/60">
                    <td className="max-w-[14rem] truncate px-4 py-2 font-semibold">{c.name}</td>
                    <td className="px-4 py-2 text-texto-2">{c.phone}</td>
                    <td className="px-4 py-2 text-right">
                      <Link to={`/admin?s=todos&q=${c.phoneKey}`} className="text-ouro hover:underline">
                        {c.orders}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{brl(c.spentCents)}</td>
                    <td className="px-4 py-2 text-texto-2">{c.lastOrderAt ? dataHora(c.lastOrderAt) : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <a href={wa(c)} target="_blank" rel="noopener noreferrer" className="adm-icon-btn text-[#5be08f]" aria-label={`WhatsApp de ${c.name}`}>
                        <IconWhatsApp />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {lista.map((c) => (
              <li key={c.id} className="adm-card flex items-center gap-2 p-3">
                <Link to={`/admin?s=todos&q=${c.phoneKey}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-texto-2">{c.phone}</p>
                  <p className="text-xs text-texto-3">
                    {c.orders} pedido(s) · <span className="font-semibold text-texto">{brl(c.spentCents)}</span>
                  </p>
                </Link>
                <a href={wa(c)} target="_blank" rel="noopener noreferrer" className="adm-icon-btn text-[#5be08f]" aria-label={`WhatsApp de ${c.name}`}>
                  <IconWhatsApp />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
