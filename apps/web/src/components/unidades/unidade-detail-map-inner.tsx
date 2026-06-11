"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import {
  fitAreaLabelFontSize,
  formatAreaM2ComUnidade,
  insetScreenPoints,
  polygonAreaM2,
  verticesToLatLng,
} from "@/lib/unidade-area";
import { apiFetch, asArray } from "@/lib/api";
import {
  corOperadoraAntena,
  rotuloOperadoraAntena,
  rotuloTecnologiaAntena,
} from "@/lib/antenas";
import type { LatLng } from "@/lib/geocode";
import { MAP_ZOOM_COORD, SP_STATE_CENTER } from "@/lib/geocode";
import type { AntenaProxima, UnidadeAreaVertice } from "@/lib/types";
import { AntenasMapPainel } from "@/components/unidades/antenas-map-painel";

import "leaflet/dist/leaflet.css";

const RAIO_PADRAO_KM = 10;

type AreaLabelLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  clipPath: string;
  fontSize: number;
};

function UnidadeAreaLabelOverlay({
  vertices,
  text,
  visible,
}: {
  vertices: LatLng[];
  text: string;
  visible: boolean;
}) {
  const map = useMap();
  const [layout, setLayout] = useState<AreaLabelLayout | null>(null);
  const verticesKey = useMemo(
    () => vertices.map((v) => `${v.lat},${v.lng}`).join("|"),
    [vertices]
  );

  useEffect(() => {
    if (!visible || vertices.length < 3) {
      setLayout(null);
      return;
    }

    const atualizar = () => {
      const screenPts = vertices.map((v) => {
        const p = map.latLngToContainerPoint([v.lat, v.lng]);
        return { x: p.x, y: p.y };
      });
      const labelPts = insetScreenPoints(screenPts);
      const xs = labelPts.map((p) => p.x);
      const ys = labelPts.map((p) => p.y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const width = Math.max(...xs) - left;
      const height = Math.max(...ys) - top;

      if (width < 8 || height < 8) {
        setLayout(null);
        return;
      }

      const clipPath = `polygon(${labelPts
        .map((p) => `${p.x - left}px ${p.y - top}px`)
        .join(", ")})`;
      const fontSize = fitAreaLabelFontSize(text, width, height);

      setLayout({ left, top, width, height, clipPath, fontSize });
    };

    atualizar();
    map.on("zoom zoomend move moveend resize viewreset", atualizar);
    return () => {
      map.off("zoom zoomend move moveend resize viewreset", atualizar);
    };
  }, [map, visible, text, verticesKey, vertices]);

  if (!visible || !layout) return null;

  return createPortal(
    <div
      className="unidade-area-label-overlay"
      style={{
        position: "absolute",
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        clipPath: layout.clipPath,
      }}
    >
      <span
        className="unidade-area-label-overlay__text"
        style={{ fontSize: layout.fontSize }}
      >
        {text}
      </span>
    </div>,
    map.getContainer()
  );
}

function UnidadeMarcadorOuArea({
  position,
  label,
  vertices,
  areaM2,
}: {
  position: LatLng;
  label: string;
  vertices: LatLng[];
  areaM2: number;
}) {
  const map = useMap();
  const [mostrarArea, setMostrarArea] = useState(false);
  const verticesKey = useMemo(
    () => vertices.map((v) => `${v.lat},${v.lng}`).join("|"),
    [vertices]
  );
  const temPoligono = vertices.length >= 3 && areaM2 > 0;
  const areaTexto = formatAreaM2ComUnidade(areaM2);

  useEffect(() => {
    if (!temPoligono) {
      setMostrarArea(false);
      return;
    }

    const atualizar = () => {
      setMostrarArea(map.getZoom() >= MAP_ZOOM_COORD);
    };

    atualizar();
    map.on("zoom zoomend", atualizar);
    return () => {
      map.off("zoom zoomend", atualizar);
    };
  }, [map, temPoligono, verticesKey]);

  return (
    <>
      {!mostrarArea ? (
        <Marker
          key="unidade-pin"
          position={[position.lat, position.lng]}
          title={label}
        />
      ) : null}
      {temPoligono ? (
        <UnidadeAreaLabelOverlay
          vertices={vertices}
          text={areaTexto}
          visible={mostrarArea}
        />
      ) : null}
    </>
  );
}

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

function verticesFitKey(vertices: LatLng[], position: LatLng): string {
  return [
    position.lat,
    position.lng,
    ...vertices.map((v) => `${v.lat},${v.lng}`),
  ].join("|");
}

function MapFitArea({
  position,
  vertices,
  ativo,
}: {
  position: LatLng;
  vertices: LatLng[];
  ativo: boolean;
}) {
  const map = useMap();
  const fittedKeyRef = useRef<string | null>(null);
  const verticesKey = verticesFitKey(vertices, position);

  useEffect(() => {
    if (!ativo || vertices.length < 3) return;
    if (fittedKeyRef.current === verticesKey) return;
    fittedKeyRef.current = verticesKey;

    const bounds = L.latLngBounds(
      vertices.map((v) => [v.lat, v.lng] as [number, number])
    );
    bounds.extend([position.lat, position.lng]);
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, verticesKey, ativo, vertices, position.lat, position.lng]);
  return null;
}

function MapFitRaio({ center, raioKm, ativo }: { center: LatLng; raioKm: number; ativo: boolean }) {
  const map = useMap();
  const fittedRef = useRef<string | null>(null);
  const fitKey = `${center.lat}|${center.lng}|${raioKm}`;

  useEffect(() => {
    if (!ativo) {
      fittedRef.current = null;
      return;
    }
    if (fittedRef.current === fitKey) return;
    fittedRef.current = fitKey;

    const dLat = raioKm / 111.32;
    const dLng =
      raioKm / (111.32 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
    const bounds = L.latLngBounds(
      [center.lat - dLat, center.lng - dLng],
      [center.lat + dLat, center.lng + dLng]
    );
    map.fitBounds(bounds, { padding: [28, 28] });
  }, [map, center.lat, center.lng, raioKm, ativo, fitKey]);
  return null;
}

function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function UnidadeDetailMapInner({
  position,
  label,
  areaVertices,
  areaM2: areaM2Prop,
}: {
  position: LatLng | null;
  label: string;
  areaVertices?: UnidadeAreaVertice[];
  areaM2?: number;
}) {
  const poligonoArea = verticesToLatLng(asArray(areaVertices));
  const temPoligono = poligonoArea.length >= 3;
  const areaM2 =
    areaM2Prop && areaM2Prop > 0
      ? areaM2Prop
      : temPoligono
        ? polygonAreaM2(poligonoArea)
        : 0;
  const poligonoPositions = poligonoArea.map(
    (v) => [v.lat, v.lng] as [number, number]
  );
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
            <MapFitArea
              position={position}
              vertices={poligonoArea}
              ativo={temPoligono && !showRaio && !showAntenas}
            />
            <MapFitRaio center={position} raioKm={raioKm} ativo={showRaio || showAntenas} />
            {temPoligono ? (
              <Polygon
                positions={poligonoPositions}
                pathOptions={{
                  color: "#2563eb",
                  weight: 2,
                  fillColor: "#3b82f6",
                  fillOpacity: 0.22,
                }}
              />
            ) : null}
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
            <UnidadeMarcadorOuArea
              position={position}
              label={label}
              vertices={poligonoArea}
              areaM2={areaM2}
            />
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
