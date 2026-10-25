import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { brl, efetivo, formatarPuffs, resumoPreco, temEstoque, useCatalog } from '../../lib/catalog';
import { MAX_QTD, useCart } from '../../lib/cart';
import { CardProduto, FotoProduto, PrecoVitrine, Selos, StoreLayout } from '../../components/Store';
import { useToast } from '../../components/Toast';
import { useTitulo } from '../../components/Site';
import { IconCarrinho, IconLink, IconMais, IconMenos, IconVoltar } from '../../components/icons';

export function Quantidade({ valor, onChange, rotulo }: { valor: number; onChange: (n: number) => void; rotulo: string }) {
  return (
    <div className="inline-flex items-center rounded-xl border border-borda bg-fundo" role="group" aria-label={rotulo}>
      <button type="button" className="adm-icon-btn" onClick={() => onChange(valor - 1)} disabled={valor <= 1} aria-label="Diminuir quantidade">
        <IconMenos />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button type="button" className="adm-icon-btn" onClick={() => onChange(valor + 1)} disabled={valor >= MAX_QTD} aria-label="Aumentar quantidade">
        <IconMais />
      </button>
    </div>
  );
}

export default function Produto() {
  const { slug } = useParams();
  const { catalog, error } = useCatalog();
  const { adicionar } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const p = catalog?.products.find((x) => x.id === slug);
  useTitulo(p ? `${p.name} — REI DO POD CAF` : 'Produto — REI DO POD CAF');

  const [saborId, setSaborId] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    setSaborId(null);
    setQtd(1);
  }, [slug]);

  if (!catalog)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-7xl px-4 py-10">
          {error ? (
            <p className="text-center text-sm text-orange-300">Não foi possível carregar — tente recarregar a página.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="loja-card aspect-square animate-pulse" />
              <div className="loja-card h-80 animate-pulse" />
            </div>
          )}
        </div>
      </StoreLayout>
    );

  if (!p)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="mb-2 font-display text-4xl font-extrabold uppercase">Produto não encontrado</h1>
          <p className="mb-6 text-sm text-texto-2">Ele pode ter saído do catálogo. Veja os outros produtos da loja.</p>
          <Link to="/produtos" className="botao-ouro inline-flex min-h-12 items-center rounded-2xl px-6 font-bold uppercase tracking-wider">
            Ver produtos
          </Link>
        </div>
      </StoreLayout>
    );

  const sabor = p.flavors.find((f) => f.id === saborId && f.available) ?? null;
  const podeComprar = temEstoque(p) && (p.noFlavor || !!sabor);
  const oferta = p.noFlavor ? p : sabor;
  const unit = oferta ? efetivo(oferta) : null;
  const relacionados = catalog.products.filter((x) => x.brand === p.brand && x.uid !== p.uid && temEstoque(x)).slice(0, 5);
  const r = resumoPreco(p);

  function colocar(irParaCarrinho: boolean) {
    if (!p || !podeComprar) return;
    adicionar(p.uid, p.noFlavor ? null : sabor!.id, qtd);
    if (irParaCarrinho) nav('/carrinho');
    else toast(`${qtd}x ${p.name}${sabor ? ` — ${sabor.name}` : ''} no carrinho`);
  }

  async function compartilhar() {
    const link = `${location.origin}${import.meta.env.BASE_URL}produto/${p!.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: p!.name, text: `${p!.name} — REI DO POD CAF`, url: link });
      } catch {
        /* cancelou */
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
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:pt-6">
        <nav className="mb-3 flex min-w-0 items-center gap-2 text-sm text-texto-3" aria-label="Caminho">
          <button type="button" onClick={() => (history.length > 1 ? nav(-1) : nav('/produtos'))} className="adm-icon-btn -ml-2" aria-label="Voltar">
            <IconVoltar />
          </button>
          <Link to="/produtos" className="hover:text-texto">
            Produtos
          </Link>
          <span>/</span>
          <Link to={`/produtos?cat=${encodeURIComponent(p.brand)}`} className="truncate hover:text-texto">
            {p.brand}
          </Link>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:gap-10">
          <div className="loja-card relative flex aspect-square items-center justify-center p-8 md:sticky md:top-24 md:self-start">
            <FotoProduto p={p} className={temEstoque(p) ? '' : 'grayscale'} />
            <Selos p={p} className="absolute left-4 top-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-ouro">{p.brand}</p>
            <div className="flex items-start gap-2">
              <h1 className="min-w-0 flex-1 break-words font-display text-[clamp(2.2rem,10vw,3.5rem)] font-extrabold uppercase leading-[.95]">{p.name}</h1>
              <button
                type="button"
                onClick={compartilhar}
                className="adm-icon-btn mt-1 border border-borda"
                aria-label={copiado ? 'Link copiado!' : `Compartilhar ${p.name}`}
                title={copiado ? 'Link copiado!' : 'Compartilhar'}
              >
                <IconLink />
              </button>
            </div>
            {(p.puffs || p.series) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.puffs ? (
                  <span className="rounded-full bg-ouro/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ouro ring-1 ring-inset ring-ouro/25">
                    {formatarPuffs(p.puffs)}
                  </span>
                ) : null}
                {p.series && <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-texto-2">{p.series}</span>}
              </div>
            )}

            <div className="my-5 rounded-2xl border border-borda bg-superficie p-4">
              {oferta && podeComprar ? (
                oferta.price == null ? (
                  <p className="font-display text-3xl font-extrabold uppercase text-ouro">Consultar</p>
                ) : (
                  <div>
                    {oferta.promo != null && <p className="text-sm text-texto-3 line-through">de {brl(oferta.price)}</p>}
                    <p className="text-3xl font-bold">
                      {oferta.promo != null && <span className="mr-1 text-sm font-medium text-texto-2">por</span>}
                      <span className="texto-ouro">{brl(unit!)}</span>
                    </p>
                  </div>
                )
              ) : (
                <PrecoVitrine p={p} grande />
              )}
              {r.tipo === 'consultar' || (oferta && oferta.price == null) ? (
                <p className="mt-1 text-xs text-texto-3">Valor combinado pelo WhatsApp ao finalizar o pedido.</p>
              ) : null}
              {!p.noFlavor && !sabor && r.tipo !== 'esgotado' && <p className="mt-1 text-xs text-texto-3">Escolha o sabor para ver o valor exato.</p>}
            </div>

            {!p.noFlavor && (
              <div className="mb-5">
                <p className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold">
                  Sabores
                  <span className="text-xs font-normal text-texto-3">{sabor ? sabor.name : 'Escolha um'}</span>
                </p>
                {p.flavors.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-3 text-center text-sm text-texto-3">Indisponível no momento</p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sabor">
                    {p.flavors.map((f) =>
                      f.available ? (
                        <button
                          key={f.id}
                          type="button"
                          role="radio"
                          aria-checked={f.id === saborId}
                          onClick={() => setSaborId(f.id)}
                          className="chip max-w-full whitespace-normal text-left text-xs uppercase tracking-wide"
                        >
                          {f.name}
                          {f.promo != null && <span className="ml-1.5 rounded bg-red-500 px-1 text-[10px] text-white">%</span>}
                        </button>
                      ) : (
                        <span
                          key={f.id}
                          className="chip max-w-full cursor-not-allowed whitespace-normal border-dashed text-xs uppercase tracking-wide text-texto-3 opacity-60"
                          aria-disabled="true"
                          title="Esgotado"
                        >
                          <span className="line-through">{f.name}</span> · esgotado
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {temEstoque(p) ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Quantidade valor={qtd} onChange={(n) => setQtd(Math.max(1, Math.min(MAX_QTD, n)))} rotulo="Quantidade" />
                  {unit != null && podeComprar && (
                    <p className="text-right text-sm text-texto-2">
                      Subtotal <span className="block text-lg font-bold text-texto">{brl(unit * qtd)}</span>
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!podeComprar}
                    onClick={() => colocar(false)}
                    className="botao-ouro flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconCarrinho className="h-5 w-5" />
                    {podeComprar ? 'Adicionar' : 'Escolha um sabor'}
                  </button>
                  <button
                    type="button"
                    disabled={!podeComprar}
                    onClick={() => colocar(true)}
                    className="flex min-h-12 items-center justify-center rounded-2xl border border-white/15 px-4 font-semibold transition-colors hover:border-ouro/40 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Comprar agora
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-texto-3">Produto esgotado no momento.</p>
            )}

            {p.description && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold">Descrição</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-texto-2">{p.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="mb-4 font-display text-3xl font-extrabold uppercase">Mais de {p.brand}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {relacionados.map((x) => (
              <CardProduto key={x.uid} p={x} />
            ))}
          </div>
        </section>
      )}
    </StoreLayout>
  );
}
