import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../../lib/api';
import { brl } from '../../lib/catalog';
import { clienteApi, useCliente, type Cliente } from '../../lib/customer';
import { dataHora, numero, type Pedido } from '../../lib/orders';
import LoginCliente from '../../components/LoginCliente';
import { ChipSituacao } from '../../components/Pedido';
import { StoreLayout, SuporteWhats } from '../../components/Store';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconLapis, IconRecibo, IconSair, IconUsuario } from '../../components/icons';

function Perfil() {
  const { cliente, sair, atualizar } = useCliente();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(cliente?.name ?? '');
  if (!cliente) return null;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await clienteApi<{ customer: Cliente }>('customer/me', { method: 'PUT', body: { name: nome } });
      atualizar(r.customer);
      setEditando(false);
      toast('Nome atualizado');
    } catch (err) {
      toast(errorText(err), true);
    }
  }

  return (
    <section className="loja-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="botao-ouro flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <IconUsuario className="h-6 w-6" />
        </span>
        {editando ? (
          <form onSubmit={salvar} className="flex min-w-0 flex-1 gap-2">
            <input className="adm-input min-w-0 px-3" autoFocus maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Seu nome" />
            <button className="botao-ouro adm-btn shrink-0 px-4 font-bold">Salvar</button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate font-display text-2xl font-extrabold uppercase leading-tight">
              <span className="truncate">{cliente.name}</span>
              <button type="button" className="adm-icon-btn h-9 w-9 shrink-0" onClick={() => setEditando(true)} aria-label="Editar nome">
                <IconLapis />
              </button>
            </p>
            <p className="text-sm text-texto-2">{cliente.phone}</p>
          </div>
        )}
      </div>
      {cliente.lastAddress && (
        <p className="mt-3 break-words rounded-xl bg-fundo/60 px-3 py-2 text-xs text-texto-2">
          Último endereço: {cliente.lastAddress.street}, {cliente.lastAddress.houseNumber} · {cliente.lastAddress.district}
          {cliente.lastAddress.latitude != null && ' · 📍 no mapa'}
        </p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <SuporteWhats className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 text-sm font-bold text-white">Falar com a loja</SuporteWhats>
        <button
          type="button"
          onClick={() => confirm('Sair deste aparelho? Seus pedidos continuam salvos no seu celular.') && sair()}
          className="adm-btn adm-btn-ghost px-4"
        >
          <IconSair className="h-4 w-4" />
          Sair
        </button>
      </div>
    </section>
  );
}

export default function Pedidos() {
  useTitulo('Meus pedidos — REI DO POD CAF');
  const { cliente } = useCliente();
  const [lista, setLista] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setLista(await clienteApi<Pedido[]>('orders'));
      setErro('');
    } catch (e) {
      setErro(errorText(e, 'Não foi possível carregar seus pedidos'));
    }
  }, []);

  useEffect(() => {
    if (!cliente) return setLista(null);
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [cliente, carregar]);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-5 md:pt-8">
        <h1 className="mb-5 font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-none">
          Meus <span className="texto-ouro">pedidos</span>
        </h1>

        {!cliente ? (
          <div className="space-y-4">
            <LoginCliente texto="Entre com o celular usado nos pedidos para acompanhar a entrega. Sem senha." />
            <SuporteWhats className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5be08f]">Dúvidas? Fale com a loja</SuporteWhats>
          </div>
        ) : (
          <div className="space-y-5">
            <Perfil />
            {erro && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>}
            {!lista && !erro && <div className="loja-card h-40 animate-pulse" />}
            {lista && lista.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 px-4 py-12 text-center">
                <IconRecibo className="mx-auto mb-3 h-10 w-10 text-texto-3" />
                <p className="mb-4 text-sm text-texto-2">Você ainda não fez pedidos.</p>
                <Link to="/produtos" className="botao-ouro inline-flex min-h-12 items-center rounded-2xl px-6 font-bold uppercase tracking-wider">
                  Ver produtos
                </Link>
              </div>
            )}
            <ul className="space-y-3">
              {lista?.map((p) => (
                <li key={p.id}>
                  <Link to={`/pedidos/${p.id}`} className="loja-card block p-4 hover:border-ouro/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-xl font-extrabold uppercase">Pedido {numero(p.number)}</p>
                        <p className="text-xs text-texto-3">{dataHora(p.createdAt)}</p>
                      </div>
                      <ChipSituacao s={p.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-texto-2">
                      {p.items.map((i) => `${i.quantity}x ${i.name}${i.flavorName ? ` (${i.flavorName.toLowerCase()})` : ''}`).join(', ')}
                    </p>
                    <p className="mt-2 font-bold">{brl(p.totalCents)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
