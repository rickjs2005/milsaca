"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type CorretoraPin = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  verified: boolean;
  lat: number;
  lng: number;
};

type Props = {
  pins: CorretoraPin[];
};

// Marker icon padrão do leaflet quebra em bundlers porque referencia
// imagens via relative path do CSS. Fixamos via URL absoluta do CDN
// pra não precisar copiar assets.
const ICON_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const ICON_RETINA_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const SHADOW_URL =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: ICON_URL,
  iconRetinaUrl: ICON_RETINA_URL,
  shadowUrl: SHADOW_URL,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const verifiedIcon = L.divIcon({
  className: "milsaca-pin-verified",
  html: `<div style="background:#C9A961;width:24px;height:24px;border-radius:50%;border:3px solid #2D3A2E;box-shadow:0 2px 4px rgba(0,0,0,0.25)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

/**
 * Recentraliza o mapa quando a lista de pins muda — útil quando o
 * produtor aplica filtro e o conjunto visível encolhe.
 */
function FitBounds({ pins }: { pins: CorretoraPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0]!.lat, pins[0]!.lng], 9);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }, [pins, map]);
  return null;
}

export function CorretorasMap({ pins }: Props) {
  // Centro default: Manhuaçu/MG (coração da Zona da Mata cafeeira)
  const fallbackCenter = useMemo<[number, number]>(
    () => [-20.2587, -42.0289],
    [],
  );

  if (pins.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-milsaca-cream-escuro bg-milsaca-cream/40 text-center">
        <div className="space-y-2 px-6">
          <p className="text-sm font-medium text-milsaca-verde">
            Nenhuma corretora com localização no mapa
          </p>
          <p className="text-xs text-milsaca-verde-claro">
            Quando as corretoras informarem coordenadas, elas aparecem aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-milsaca-cream-escuro shadow-sm">
      <MapContainer
        center={fallbackCenter}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: 420, width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={p.verified ? verifiedIcon : defaultIcon}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-milsaca-verde">
                  {p.name}
                </p>
                {p.city || p.state ? (
                  <p className="text-xs text-milsaca-verde-claro">
                    {[p.city, p.state].filter(Boolean).join("/")}
                  </p>
                ) : null}
                {p.verified ? (
                  <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Verificada
                  </span>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
