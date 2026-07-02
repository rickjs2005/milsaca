"use client";

import { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";

type Modo = "gps" | "manual" | "geojson";

/**
 * Form de cadastro de talhão com 3 modos de localização:
 *  - GPS ("estou na lavoura"): captura navigator.geolocation → lat/lng.
 *  - Manual: digita lat/lng (tirado do Google Maps, por exemplo).
 *  - GeoJSON: cola o polígono exportado do CAR/agrônomo.
 * Localização é OPCIONAL no cadastro — o checklist EUDR cobra depois.
 */
export function NovoTalhaoForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [modo, setModo] = useState<Modo>("gps");
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(
    null,
  );
  const [gpsErro, setGpsErro] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);

  function capturarGps() {
    setGpsErro(null);
    if (!("geolocation" in navigator)) {
      setGpsErro("Este aparelho não oferece localização pelo navegador.");
      return;
    }
    setCapturando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: Math.round(pos.coords.accuracy),
        });
        setCapturando(false);
      },
      (err) => {
        setGpsErro(
          err.code === err.PERMISSION_DENIED
            ? "Permita o acesso à localização no navegador e tente de novo."
            : "Não foi possível obter sua localização. Tente ao ar livre.",
        );
        setCapturando(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const modos: { key: Modo; label: string }[] = [
    { key: "gps", label: "Estou na lavoura" },
    { key: "manual", label: "Digitar coordenadas" },
    { key: "geojson", label: "Colar do CAR" },
  ];

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="talhao-nome">Nome do talhão</Label>
        <Input
          id="talhao-nome"
          name="nome"
          maxLength={120}
          required
          placeholder="Ex.: Talhão da grota"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="talhao-area">Área (hectares, opcional)</Label>
        <Input
          id="talhao-area"
          name="area_ha"
          inputMode="decimal"
          placeholder="Ex.: 3,5"
        />
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="text-label text-milsaca-preto">
          Localização (opcional agora, obrigatória pra vender pra Europa)
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {modos.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setModo(m.key)}
              className={cn(
                "rounded-pill border px-3 py-1.5 text-body-sm font-medium transition-colors",
                modo === m.key
                  ? "border-milsaca-verde bg-milsaca-verde text-milsaca-cream"
                  : "border-neutral-200 text-neutral-600 hover:border-milsaca-verde",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {modo === "gps" && (
          <div className="mt-3 space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={capturarGps}
              disabled={capturando}
            >
              {capturando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="mr-2 h-4 w-4" />
              )}
              {capturando ? "Obtendo localização…" : "Marcar minha localização"}
            </Button>
            {gps && (
              <p className="text-body-sm text-success-700">
                Localização marcada: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}{" "}
                <span className="text-neutral-500">(precisão ~{gps.acc} m)</span>
              </p>
            )}
            {gpsErro && (
              <p className="text-body-sm text-danger-700">{gpsErro}</p>
            )}
            <input type="hidden" name="lat" value={gps?.lat ?? ""} />
            <input type="hidden" name="lng" value={gps?.lng ?? ""} />
            <input type="hidden" name="origem" value="gps" />
          </div>
        )}

        {modo === "manual" && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="talhao-lat">Latitude</Label>
              <Input
                id="talhao-lat"
                name="lat"
                inputMode="decimal"
                placeholder="Ex.: -20.2565"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="talhao-lng">Longitude</Label>
              <Input
                id="talhao-lng"
                name="lng"
                inputMode="decimal"
                placeholder="Ex.: -42.0336"
              />
            </div>
          </div>
        )}

        {modo === "geojson" && (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="talhao-geojson">GeoJSON do talhão</Label>
            <textarea
              id="talhao-geojson"
              name="geojson_texto"
              rows={5}
              placeholder='{"type":"Polygon","coordinates":[[[...]]]}'
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-caption text-neutral-500">
              Cole o polígono exportado do CAR ou fornecido pelo seu agrônomo
              (Point, Polygon ou MultiPolygon).
            </p>
          </div>
        )}
      </fieldset>

      <div className="sm:col-span-2">
        <SubmitButton variant="primary" pendingLabel="Salvando…">
          Salvar talhão
        </SubmitButton>
      </div>
    </form>
  );
}
