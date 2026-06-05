"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { apiFetch, asArray } from "@/lib/api";
import {
  corOperadoraAntena,
  rotuloOperadoraAntena,
  rotuloTecnologiaAntena,
} from "@/lib/antenas";
import type { LatLng } from "@/lib/geocode";
import { SP_STATE_CENTER } from "@/lib/geocode";
import type { AntenaProxima } from "@/lib/types";
import { AntenasMapPainel } from "@/components/unidades/antenas-map-painel";

import "leaflet/dist/leaflet.css";

const RAIO_PADRAO_KM = 10;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapInvalidateSize({ painelAberto }: { painelAberto: boolean }) {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map, painelAberto]);
  return null;
}

function MapFitRaio({ center, raioKm, ativo }: { center: LatLng; raioKm: number; ativo: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!ativo) return;
    const dLat = raioKm / 111.32;
    const dLng =
      raioKm / (111.32 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
    const bounds = L.latLngBounds(
      [center.lat - dLat, center.lng - dLng],
      [center.lat + dLat, center.lng + dLng]
    );
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, center.lat, center.lng, raioKm, ativo]);
  return null;
}

function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function UnidadeDetailMapInner({
  position,
  label,
}: {
  position: LatLng | null;
  label: string;
}) {
  const [antenas, setAntenas] = useState<AntenaProxima[]>([]);
  const [loadingAntenas, setLoadingAntenas] = useState(false);
  const [erroAntenas, setErroAntenas] = useState<string | null>(null);
  const [raioKm, setRaioKm] = useState(RAIO_PADRAO_KM);
  const [showRaio, setShowRaio] = useState(false);
  const [showAntenas, setShowAntenas] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);

  const center = position ?? {
    lat: SP_STATE_CENTER.lat,
    lng: SP_STATE_CENTER.lng,
  };
  const zoom = position ? 13 : SP_STATE_CENTER.zoom;

  useEffect(() => {
    if (!position) {
      setAntenas([]);
      setErroAntenas(null);
      return;
    }

    let cancelled = false;
    setLoadingAntenas(true);
    setErroAntenas(null);

    const url = `/api/v1/antenas/proximas?lat=${position.lat}&lng=${position.lng}&raio_km=${raioKm}`;
    apiFetch<AntenaProxima[] | null>(url)
      .then((data) => {
        if (cancelled) return;
        setAntenas(asArray(data));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setAntenas([]);
        setErroAntenas(
          err instanceof Error ? err.message : "Falha ao carregar antenas"
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingAntenas(false);
      });

    return () => {
      cancelled = true;
    };
  }, [position?.lat, position?.lng, raioKm]);

  return (
    <div className="relative h-full min-h-[min(70vh,520px)] w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full min-h-[min(70vh,520px)] w-full rounded-lg border border-border z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateSize painelAberto={painelAberto} />
        {position && (
          <>
            <MapFitRaio center={position} raioKm={raioKm} ativo={showRaio || showAntenas} />
            {showRaio && (
              <Circle
                center={[position.lat, position.lng]}
                radius={raioKm * 1000}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 1.5,
                  fillColor: "#3b82f6",
                  fillOpacity: 0.06,
                  dashArray: "6 4",
                }}
              />
            )}
            <Marker position={[position.lat, position.lng]} title={label} />
            {showAntenas &&
              antenas.map((a) => (
                <CircleMarker
                  key={a.id}
                  center={[a.latitude, a.longitude]}
                  radius={5}
                  pathOptions={{
                    color: corOperadoraAntena(a.nomeEntidade),
                    fillColor: corOperadoraAntena(a.nomeEntidade),
                    fillOpacity: 0.85,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <div className="space-y-1 text-xs leading-snug">
                      <p className="font-semibold">
                        {rotuloOperadoraAntena(a.nomeEntidade)} ·{" "}
                        {rotuloTecnologiaAntena(a.tecnologia)}
                      </p>
                      <p>
                        Estação {a.numEstacao || "—"} · {a.municipio || "—"}
                      </p>
                      <p>
                        {formatDistancia(a.distanciaKm)} da unidade
                        {a.azimute ? ` · Azimute ${a.azimute}°` : ""}
                      </p>
                      {(a.potenciaW || a.alturaAntena) && (
                        <p className="text-muted-foreground">
                          {a.potenciaW ? `Potência ${a.potenciaW} W` : ""}
                          {a.potenciaW && a.alturaAntena ? " · " : ""}
                          {a.alturaAntena ? `Altura ${a.alturaAntena} m` : ""}
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </>
        )}
      </MapContainer>

      {!position && (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-md bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground ring-1 ring-border">
          Coordenadas não cadastradas — mapa centrado em São Paulo.
        </p>
      )}

      {position && (
        <AntenasMapPainel
          aberto={painelAberto}
          onAbertoChange={setPainelAberto}
          raioKm={raioKm}
          onRaioKmChange={setRaioKm}
          showRaio={showRaio}
          onShowRaioChange={setShowRaio}
          showAntenas={showAntenas}
          onShowAntenasChange={setShowAntenas}
          antenas={antenas}
          loading={loadingAntenas}
          erro={erroAntenas}
        />
      )}
    </div>
  );
}
