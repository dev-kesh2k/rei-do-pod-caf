/** Centavos → texto do campo ("89,90"); null → "". */
export const centsToInput = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));

/** Texto digitado ("89,90", "1.299,00", "89.9", "89") → centavos; "" → null; inválido → NaN. */
export function inputToCents(s: string): number | null {
  let t = s.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(Number(t) * 100);
}

/** Mantém só dígitos, vírgula e ponto enquanto digita. */
export const limparPreco = (s: string) => s.replace(/[^\d.,]/g, '').slice(0, 12);

/** Erro do par preço/promoção, ou "" se ok. */
export function erroPreco(price: number | null, promo: number | null): string {
  if (Number.isNaN(price as number)) return 'Preço inválido';
  if (Number.isNaN(promo as number)) return 'Promoção inválida';
  if (promo != null && price == null) return 'Promoção sem preço';
  if (promo != null && price != null && promo >= price) return 'Promoção precisa ser menor';
  return '';
}
