import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconAlvo, IconBusca, IconX } from './icons';

export type Pin = { lat: number; lng: number };

// Cafelândia (PR): onde a loja entrega.
const CENTRO: [number, number] = [-24.6189, -53.3203];

const icone = L.divIcon({
  className: '',
  html: '<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc8a"/><stop offset=".5" stop-color="#e6c766"/><stop offset="1" stop-color="#b8862f"/></linearGradient></defs><path d="M17 1C8.7 1 2 7.6 2 15.8 2 27 17 43 17 43s15-16 15-27.2C32 7.6 25.3 1 17 1z" fill="url(#g)" stroke="#0a0a0b" stroke-width="2"/><circle cx="17" cy="16" r="6" fill="#0a0a0b"/></svg>',
  iconSize: [34, 44],
  iconAnchor: [17, 43],
});

function criarMapa(el: HTMLElement, value: Pin | null, interativo: boolean) {
  const m = L.map(el, {
    center: value ? [value.lat, value.lng] : CENTRO,
    zoom: value ? 17 : 14,
    zoomControl: true,
    dragging: true,
    scrollWheelZoom: interativo,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
  return m;
}

/** Mapa só para ver o ponto (painel / ticket). */
export function MapaPonto({ lat, lng, className = 'h-56' }: { lat: number; lng: number; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = criarMapa(el.current, { lat, lng }, false);
    L.marker([lat, lng], { icon: icone }).addTo(m);
    return () => {
      m.remove();
    };
  }, [lat, lng]);
  return <div ref={el} className={`relative z-0 w-full overflow-hidden rounded-2xl border border-borda ${className}`} aria-label="Mapa do local de entrega" />;
}

/** O cliente marca o ponto de entrega: localização do aparelho, busca pelo endereço, toque no mapa e pino arrastável. */
export function MapPicker({ value, onChange, enderecoBusca }: { value: Pin | null; onChange: (p: Pin | null) => void; enderecoBusca: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState<'' | 'gps' | 'busca'>('');

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = criarMapa(el.current, value, true);
    m.on('click', (e: L.LeafletMouseEvent) => onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const pos: L.LatLngExpression = [value.lat, value.lng];
    if (!marker.current) {
      marker.current = L.marker(pos, { icon: icone, draggable: true }).addTo(m);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
    } else marker.current.setLatLng(pos);
  }, [value]);

  function focar(p: Pin) {
    onChange(p);
    map.current?.setView([p.lat, p.lng], 17);
  }

  function localizar() {
    setMsg('');
    if (!navigator.geolocation) return setMsg('Este aparelho não permite usar a localização. Toque no mapa para marcar.');
    setOcupado('gps');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOcupado('');
        focar({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setOcupado('');
        setMsg('Não consegui pegar sua localização. Permita o acesso no navegador ou toque no mapa para marcar.');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function buscar() {
    setMsg('');
    if (enderecoBusca.trim().length < 5) return setMsg('Preencha rua, número e bairro para buscar no mapa.');
    setOcupado('busca');
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(`${enderecoBusca}, Cafelândia, PR`)}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const list = (await r.json()) as { lat: string; lon: string }[];
      if (!list.length) setMsg('Endereço não encontrado no mapa. Toque no mapa para marcar o ponto.');
      else focar({ lat: Number(list[0].lat), lng: Number(list[0].lon) });
    } catch {
      setMsg('Não foi possível buscar agora. Toque no mapa para marcar o ponto.');
    } finally {
      setOcupado('');
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 min-[420px]:grid-cols-2">
        <button type="button" className="botao-ouro adm-btn px-3 text-sm font-bold" onClick={localizar} disabled={!!ocupado}>
          <IconAlvo className="h-5 w-5" />
          {ocupado === 'gps' ? 'Localizando…' : 'Usar minha localização'}
        </button>
        <button type="button" className="adm-btn adm-btn-ghost px-3 text-sm" onClick={buscar} disabled={!!ocupado}>
          <IconBusca className="h-4 w-4" />
          {ocupado === 'busca' ? 'Buscando…' : 'Buscar pelo endereço'}
        </button>
      </div>
      <div ref={el} className="relative z-0 h-72 w-full overflow-hidden rounded-2xl border border-borda" role="application" aria-label="Mapa para marcar o local de entrega" />
      <p className="text-xs text-texto-3">{value ? 'Pino marcado. Arraste para ajustar o ponto exato.' : 'Toque no mapa para marcar o local exato da entrega.'}</p>
      {msg && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{msg}</p>}
      {value && (
        <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-red-300" onClick={() => onChange(null)}>
          <IconX className="h-4 w-4" />
          Remover ponto do mapa
        </button>
      )}
    </div>
  );
}
