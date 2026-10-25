type P = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconWhatsApp = ({ className }: P) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.2-.6-6-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4a10.4 10.4 0 0 1-1.7-5.7C5 10 9.9 5.3 16 5.3S27 10 27 15.8s-4.9 10.6-11 10.6zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2l-1 1.3c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6.4-.6c.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.4 1.4.6 1.9.7.8.3 1.6.2 2.2.1.7-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z" />
  </svg>
);
export const IconBusca = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
);
export const IconLink = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);
export const IconRelogio = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
);
export const IconSeta = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
);
export const IconVoltar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M19 12H5m6 6-6-6 6-6" /></svg>
);
export const IconCoroa = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}><path d="M2 7l5 4 5-7 5 7 5-4-2 12H4L2 7zm2 14h16v2H4z" /></svg>
);
export const IconCima = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="m18 15-6-6-6 6" /></svg>
);
export const IconBaixo = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="m6 9 6 6 6-6" /></svg>
);
export const IconLixo = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
);
export const IconLapis = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const IconMais = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconCaixa = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
);
export const IconTag = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
export const IconAjustes = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
);
export const IconOlho = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconSair = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
);
export const IconFoto = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
);
export const IconCarrinho = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></svg>
);
export const IconCasa = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
);
export const IconGrade = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);
export const IconMenos = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M5 12h14" /></svg>
);
export const IconCheck = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="m5 12 5 5L20 7" /></svg>
);
export const IconEscudo = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconRaio = ({ className }: P) => (
  <svg viewBox="0 0 24 24" {...base} className={className}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
);
