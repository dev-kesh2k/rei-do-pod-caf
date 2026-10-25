export type ItemPedido = { id: string; productId: string | null; name: string; flavorName: string; unitPriceCents: number | null; quantity: number; totalCents: number | null };
export type Pedido = {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  phoneKey: string;
  street: string;
  houseNumber: string;
  district: string;
  complement: string;
  reference: string;
  latitude: number | null;
  longitude: number | null;
  totalCents: number;
  consultItems: number;
  paymentMethod: 'pix' | 'dinheiro' | 'cartao';
  changeForCents: number | null;
  notes: string;
  status: Situacao;
  paid: boolean;
  cancelReason: string;
  canceledBy: string;
  createdAt: string;
  confirmedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  canceledAt: string | null;
  items: ItemPedido[];
};
export type Situacao = 'recebido' | 'confirmado' | 'em_rota' | 'entregue' | 'cancelado';

export const SITUACOES: Situacao[] = ['recebido', 'confirmado', 'em_rota', 'entregue'];
export const ROTULO: Record<Situacao, string> = {
  recebido: 'Recebido',
  confirmado: 'Confirmado',
  em_rota: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};
export const COR: Record<Situacao, string> = {
  recebido: 'bg-sky-500/15 text-sky-300 ring-sky-400/30',
  confirmado: 'bg-ouro/15 text-ouro ring-ouro/30',
  em_rota: 'bg-violet-500/15 text-violet-300 ring-violet-400/30',
  entregue: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
  cancelado: 'bg-zinc-500/15 text-zinc-400 ring-zinc-400/30',
};
export const PAGAMENTO: Record<Pedido['paymentMethod'], string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' };

export const numero = (n: number) => `#${String(n).padStart(4, '0')}`;
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const enderecoLinha = (p: Pick<Pedido, 'street' | 'houseNumber' | 'district' | 'complement'>) =>
  [`${p.street}, ${p.houseNumber}`, p.complement, p.district].filter(Boolean).join(' · ');
export const mapaUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
