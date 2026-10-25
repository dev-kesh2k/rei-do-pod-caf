import { Link } from 'react-router-dom';
import { brl } from '../../lib/catalog';
import { useCart } from '../../lib/cart';
import { FotoProduto, StoreLayout, SuporteWhats } from '../../components/Store';
import { useTitulo } from '../../components/Site';
import { IconCarrinho, IconLixo, IconSeta } from '../../components/icons';
import { Quantidade } from './Produto';

export default function Carrinho() {
  useTitulo('Carrinho — REI DO POD CAF');
  const { linhas, total, aConsultar, alterar, remover, limpar } = useCart();
  const validas = linhas.filter((l) => l.disponivel);
  const indisponiveis = linhas.filter((l) => !l.disponivel);
  const qtd = validas.reduce((t, l) => t + l.item.qty, 0);

  return (
    <StoreLayout>
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-5 md:pt-8">
        <h1 className="mb-5 font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-none">
          <span className="texto-ouro">Carrinho</span>
        </h1>

        {linhas.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 px-4 py-16 text-center">
            <IconCarrinho className="mx-auto mb-3 h-10 w-10 text-texto-3" />
            <p className="mb-1 font-semibold">Seu carrinho está vazio</p>
            <p className="mb-6 text-sm text-texto-2">Escolha os produtos e sabores e finalize o pedido aqui mesmo.</p>
            <Link to="/produtos" className="botao-ouro inline-flex min-h-12 items-center rounded-2xl px-6 font-bold uppercase tracking-wider">
              Ver produtos
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <ul className="space-y-3">
              {linhas.map((l) => (
                <li key={l.key} className={`loja-card flex gap-3 p-3 sm:gap-4 sm:p-4 ${l.disponivel ? '' : 'opacity-70'}`}>
                  <Link
                    to={l.produto ? `/produto/${l.produto.id}` : '/produtos'}
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-fundo p-1.5 sm:h-24 sm:w-24"
                  >
                    {l.produto && <FotoProduto p={l.produto} />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-display text-lg font-extrabold uppercase leading-tight">{l.produto?.name ?? 'Produto removido'}</p>
                        {l.sabor && <p className="break-words text-xs font-semibold uppercase tracking-wide text-texto-2">{l.sabor.name}</p>}
                      </div>
                      <button type="button" className="adm-icon-btn -mr-1 -mt-1 hover:text-red-300" onClick={() => remover(l.key)} aria-label="Remover do carrinho">
                        <IconLixo />
                      </button>
                    </div>
                    {l.disponivel ? (
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <Quantidade valor={l.item.qty} onChange={(n) => alterar(l.key, n)} rotulo="Quantidade" />
                        <div className="text-right">
                          {l.unit == null ? (
                            <p className="font-semibold text-ouro">Consultar</p>
                          ) : (
                            <>
                              <p className="text-[11px] text-texto-3">
                                {l.de != null && <span className="mr-1 line-through">{brl(l.de)}</span>}
                                {brl(l.unit)} cada
                              </p>
                              <p className="font-bold">{brl(l.total!)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-amber-300">Esgotado ou fora do catálogo — não vai no pedido.</p>
                    )}
                  </div>
                </li>
              ))}
              <li className="flex justify-end">
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm text-texto-3 underline-offset-4 hover:text-red-300 hover:underline"
                  onClick={() => confirm('Esvaziar o carrinho?') && limpar()}
                >
                  Esvaziar carrinho
                </button>
              </li>
            </ul>

            <aside className="loja-card space-y-4 p-4 sm:p-5 lg:sticky lg:top-24">
              <h2 className="font-display text-2xl font-extrabold uppercase">Resumo</h2>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between gap-2 text-texto-2">
                  <span>
                    {qtd} {qtd === 1 ? 'item' : 'itens'}
                  </span>
                  <span>{total > 0 ? brl(total) : '—'}</span>
                </p>
                {aConsultar > 0 && (
                  <p className="flex justify-between gap-2 text-texto-2">
                    <span>A consultar</span>
                    <span>
                      {aConsultar} {aConsultar === 1 ? 'produto' : 'produtos'}
                    </span>
                  </p>
                )}
                <p className="flex items-baseline justify-between gap-2 border-t border-borda pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">
                    {total > 0 ? <span className="texto-ouro">{brl(total)}</span> : <span className="text-lg text-ouro">A consultar</span>}
                  </span>
                </p>
                {aConsultar > 0 && total > 0 && <p className="text-right text-xs text-texto-3">+ itens a consultar</p>}
              </div>

              {validas.length > 0 ? (
                <Link
                  to="/checkout"
                  className="botao-ouro flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 font-bold uppercase tracking-wider"
                >
                  Finalizar pedido
                  <IconSeta className="h-5 w-5" />
                </Link>
              ) : (
                <p className="text-center text-sm text-texto-3">Nenhum item disponível para pedir.</p>
              )}
              {indisponiveis.length > 0 && validas.length > 0 && (
                <p className="text-xs text-amber-300">
                  {indisponiveis.length} {indisponiveis.length === 1 ? 'item esgotado não entra' : 'itens esgotados não entram'} no pedido.
                </p>
              )}
              <p className="text-center text-xs text-texto-3">Entrega em Cafelândia e região · pagamento na entrega (Pix, dinheiro ou cartão).</p>
              <SuporteWhats className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[#5be08f] hover:bg-[#25d366]/10">
                Dúvidas? Fale com a loja
              </SuporteWhats>
            </aside>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
