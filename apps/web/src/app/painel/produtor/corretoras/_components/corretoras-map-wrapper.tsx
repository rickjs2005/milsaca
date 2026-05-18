"use client";

import dynamic from "next/dynamic";

type CorretoraPin = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  verified: boolean;
  lat: number;
  lng: number;
};

/**
 * Wrapper client que carrega o mapa dinamicamente sem SSR.
 * Leaflet referencia `window` no top-level, então não pode ser
 * server-rendered. Esse wrapper é o limite client/server.
 */
const CorretorasMap = dynamic(
  () => import("./corretoras-map").then((m) => m.CorretorasMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-milsaca-cream-escuro bg-milsaca-cream/40">
        <p className="text-sm text-milsaca-verde-claro">Carregando mapa…</p>
      </div>
    ),
  },
);

export function CorretorasMapWrapper({ pins }: { pins: CorretoraPin[] }) {
  return <CorretorasMap pins={pins} />;
}
