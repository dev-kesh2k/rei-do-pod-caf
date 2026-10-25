import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { logoUrl, useCatalog } from '../lib/catalog';

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

export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = titulo;
  }, [titulo]);
}
