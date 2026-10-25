import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SETTINGS, logoUrl, useCatalog, waLink } from '../lib/catalog';
import { IconWhatsApp } from './icons';

export function Marca({ className = '' }: { className?: string }) {
  const { catalog } = useCatalog();
  return (
    <Link to="/" className={`marca ${className}`} aria-label="REI DO POD CAF — voltar ao início">
      <img src={logoUrl(catalog?.logoVersion ?? 0)} alt="" width={40} height={40} />
      <span>
        Rei do Pod <span className="texto-ouro">Caf</span>
      </span>
    </Link>
  );
}

/** Botão flutuante: para quem quer tirar dúvida sem escolher um sabor. */
export function WhatsAppFlutuante() {
  const { catalog } = useCatalog();
  const s = catalog?.settings ?? DEFAULT_SETTINGS;
  return (
    <a
      href={waLink(s.whatsapp, s.msgHelp)}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-flutuante"
      aria-label="Falar com a loja no WhatsApp"
    >
      <IconWhatsApp />
    </a>
  );
}

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
