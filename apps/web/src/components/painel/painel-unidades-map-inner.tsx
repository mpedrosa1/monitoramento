"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { unlockAlertAudio } from "@/lib/alert-sound";
import { unidadeClusterMapIcon } from "@/lib/cluster-map-icon";
import { SP_STATE_CENTER, MAP_ZOOM_COORD } from "@/lib/geocode";
import type { MapaUnidadeFocus } from "@/lib/mapa-unidade-focus";
import {
  formatAreaM2ComUnidade,
  UNIDADE_AREA_POLYGON_PATH_OPTIONS,
  unidadeAreaM2Exibicao,
  unidadeAreaVertices,
  unidadeTemAreaDefinida,
} from "@/lib/unidade-area";
import { UnidadeAreaLabelOverlay } from "@/components/unidades/unidade-area-label-overlay";
import {
  clusterUnidadeMapPointsByPixels,
  clustersStructureSignature,
  type UnidadeMapCluster,
  type UnidadeMapPoint,
} from "@/lib/unidade-map-cluster";
import { unidadeConnectivityLabel, unidadeConnectivityStatus } from "@/lib/unidade-form";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";

import "leaflet/dist/leaflet.css";

function unidadeHostOnline(
  u: Unidade,
  metricMap: Map<string, DeviceMetric>
): boolean {
  if (!u.ip?.trim()) return false;
  return metricMap.get(monitorUnidadeHostTargetId(u.id))?.online ?? false;
}

function MapInvalidateSize({ layoutKey }: { layoutKey?: unknown }) {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const t1 = window.setTimeout(invalidate, 50);
    const t2 = window.setTimeout(invalidate, 350);
    const t3 = window.setTimeout(invalidate, 800);
    const t4 = window.setTimeout(invalidate, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [map, layoutKey]);
  return null;
}

function MapAudioUnlock() {
  const map = useMap();
  useEffect(() => {
    const unlock = () => unlockAlertAudio();
    map.on("click", unlock);
    map.on("dragstart", unlock);
    map.on("zoomstart", unlock);
    return () => {
      map.off("click", unlock);
      map.off("dragstart", unlock);
      map.off("zoomstart", unlock);
    };
  }, [map]);
  return null;
}

function MapFitClustersOnce({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  const fittedKeyRef = useRef<string | null>(null);
  const key = points
    .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!key || fittedKeyRef.current === key) return;
    fittedKeyRef.current = key;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 12, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 48], animate: false });
  }, [map, key, points]);

  return null;
}

function MapBackgroundClick({ onBackgroundClick }: { onBackgroundClick?: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onBackgroundClick) return;
    map.on("click", onBackgroundClick);
    return () => {
      map.off("click", onBackgroundClick);
    };
  }, [map, onBackgroundClick]);
  return null;
}

function MapUnidadeFocusController({
  focus,
  unidades,
}: {
  focus?: MapaUnidadeFocus | null;
  unidades: Unidade[];
}) {
  const map = useMap();
  const lastTokenRef = useRef(0);

  useEffect(() => {
    if (!focus || focus.token === lastTokenRef.current) return;
    lastTokenRef.current = focus.token;

    const unidade = unidades.find((u) => u.id === focus.unidadeId);
    if (!unidade) return;

    const coords = coordsFromUnidade(unidade);
    if (!coords) return;

    const vertices = unidadeAreaVertices(unidade);
    const temArea = unidadeTemAreaDefinida(unidade);

    if (temArea && vertices.length >= 3) {
      const bounds = L.latLngBounds(
        vertices.map((v) => [v.lat, v.lng] as [number, number])
      );
      bounds.extend([coords.lat, coords.lng]);
      map.flyToBounds(bounds, { padding: [48, 48], duration: 1 });
      return;
    }

    map.flyTo([coords.lat, coords.lng], MAP_ZOOM_COORD, { duration: 1 });
  }, [focus, unidades, map]);

  return null;
}

function MapUnidadeAreaOverlay({
  unidade,
  visible,
}: {
  unidade: Unidade | null;
  visible: boolean;
}) {
  const map = useMap();
  const [labelVisivel, setLabelVisivel] = useState(false);

  const vertices = useMemo(
    () => (unidade ? unidadeAreaVertices(unidade) : []),
    [unidade]
  );
  const temArea = Boolean(unidade && unidadeTemAreaDefinida(unidade));
  const areaM2 = unidade ? unidadeAreaM2Exibicao(unidade) : 0;

  useEffect(() => {
    if (!visible || !temArea) {
      setLabelVisivel(false);
      return;
    }

    const atualizar = () => {
      setLabelVisivel(map.getZoom() >= MAP_ZOOM_COORD);
    };

    atualizar();
    map.on("zoom zoomend", atualizar);
    return () => {
      map.off("zoom zoomend", atualizar);
    };
  }, [map, visible, temArea]);

  if (!visible || !unidade || !temArea || vertices.length < 3) return null;

  const positions = vertices.map((v) => [v.lat, v.lng] as [number, number]);

  return (
    <>
      <Polygon positions={positions} pathOptions={UNIDADE_AREA_POLYGON_PATH_OPTIONS} />
      <UnidadeAreaLabelOverlay
        vertices={vertices}
        text={formatAreaM2ComUnidade(areaM2)}
        visible={labelVisivel}
      />
    </>
  );
}

function ClusterMarker({
  cluster,
  livePoints,
  onSelectUnidade,
}: {
  cluster: UnidadeMapCluster;
  livePoints: UnidadeMapPoint[];
  onSelectUnidade?: (id: string) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const count = livePoints.length;
  const isCluster = count > 1;

  function selectUnidade(id: string) {
    markerRef.current?.closePopup();
    onSelectUnidade?.(id);
  }

  return (
    <Marker
      ref={markerRef}
      position={[cluster.lat, cluster.lng]}
      icon={unidadeClusterMapIcon(livePoints)}
      eventHandlers={{
        click: () => {
          if (!isCluster) {
            selectUnidade(livePoints[0].unidade.id);
          }
        },
      }}
    >
      {isCluster ? (
        <Popup>
          <div className="space-y-2 text-sm">
            {livePoints.map((p) => {
              const connectivity = unidadeConnectivityStatus(
                p.unidade,
                p.online
              );
              return (
                <button
                  key={p.unidade.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left hover:bg-muted/60"
                  onClick={() => selectUnidade(p.unidade.id)}
                >
                  <span className="font-medium">{p.unidade.nome}</span>
                  <span
                    className={cn(
                      "text-xs font-medium uppercase",
                      connectivity === "online"
                        ? "text-emerald-600"
                        : connectivity === "offline"
                          ? "text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {unidadeConnectivityLabel(connectivity)}
                  </span>
                </button>
              );
            })}
          </div>
        </Popup>
      ) : null}
    </Marker>
  );
}

function DynamicClusterMarkers({
  points,
  pointCoordsKey,
  onSelectUnidade,
}: {
  points: UnidadeMapPoint[];
  pointCoordsKey: string;
  onSelectUnidade?: (id: string) => void;
}) {
  const map = useMap();
  const [clusters, setClusters] = useState<UnidadeMapCluster[]>([]);
  const pointsRef = useRef(points);
  const rafRef = useRef<number | null>(null);
  pointsRef.current = points;

  const pointById = useMemo(
    () => new Map(points.map((p) => [p.unidade.id, p])),
    [points]
  );

  const recluster = useCallback(() => {
    const current = pointsRef.current;
    if (current.length === 0) {
      setClusters((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const project = (lat: number, lng: number) =>
      map.latLngToContainerPoint(L.latLng(lat, lng));
    const next = clusterUnidadeMapPointsByPixels(current, project);
    const sig = clustersStructureSignature(next);
    setClusters((prev) =>
      clustersStructureSignature(prev) === sig ? prev : next
    );
  }, [map]);

  const scheduleRecluster = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      recluster();
    });
  }, [recluster]);

  useEffect(() => {
    recluster();
    map.on("zoom", scheduleRecluster);
    map.on("zoomend", recluster);
    map.on("moveend", recluster);
    map.on("resize", recluster);
    return () => {
      map.off("zoom", scheduleRecluster);
      map.off("zoomend", recluster);
      map.off("moveend", recluster);
      map.off("resize", recluster);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [map, recluster, scheduleRecluster]);

  useEffect(() => {
    recluster();
  }, [pointCoordsKey, recluster]);

  return (
    <>
      {clusters.map((cluster) => {
        const livePoints = cluster.points.map(
          (p) => pointById.get(p.unidade.id) ?? p
        );

        return (
          <ClusterMarker
            key={livePoints
              .map((p) => p.unidade.id)
              .sort()
              .join("-")}
            cluster={cluster}
            livePoints={livePoints}
            onSelectUnidade={onSelectUnidade}
          />
        );
      })}
    </>
  );
}

export default function PainelUnidadesMapInner({
  unidades,
  metricMap,
  onSelectUnidade,
  onMapBackgroundClick,
  layoutKey,
  mapFocus,
  areaUnidadeId,
}: {
  unidades: Unidade[];
  metricMap: Map<string, DeviceMetric>;
  onSelectUnidade?: (id: string) => void;
  onMapBackgroundClick?: () => void;
  layoutKey?: unknown;
  mapFocus?: MapaUnidadeFocus | null;
  areaUnidadeId?: string | null;
}) {
  const mapPoints = useMemo((): UnidadeMapPoint[] => {
    const pts: UnidadeMapPoint[] = [];
    for (const u of unidades) {
      const coords = coordsFromUnidade(u);
      if (!coords) continue;
      pts.push({
        unidade: u,
        lat: coords.lat,
        lng: coords.lng,
        online: unidadeHostOnline(u, metricMap),
      });
    }
    return pts;
  }, [unidades, metricMap]);

  const pointCoordsKey = useMemo(
    () =>
      mapPoints
        .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
        .sort()
        .join("|"),
    [mapPoints]
  );

  const fitPoints = useMemo(
    () => mapPoints.map((p) => ({ lat: p.lat, lng: p.lng })),
    [pointCoordsKey, mapPoints]
  );

  const areaUnidade = useMemo(
    () => unidades.find((u) => u.id === areaUnidadeId) ?? null,
    [unidades, areaUnidadeId]
  );

  if (mapPoints.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center border-t border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhuma unidade com coordenadas cadastradas para exibir no mapa.
      </div>
    );
  }

  return (
    <MapContainer
      center={[SP_STATE_CENTER.lat, SP_STATE_CENTER.lng]}
      zoom={SP_STATE_CENTER.zoom}
      className="h-full min-h-0 w-full"
      scrollWheelZoom
      dragging
      touchZoom
      doubleClickZoom
      boxZoom
      keyboard
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInvalidateSize layoutKey={layoutKey} />
      <MapAudioUnlock />
      <MapBackgroundClick onBackgroundClick={onMapBackgroundClick} />
      <MapFitClustersOnce points={fitPoints} />
      <MapUnidadeFocusController focus={mapFocus} unidades={unidades} />
      <MapUnidadeAreaOverlay unidade={areaUnidade} visible={Boolean(areaUnidadeId)} />
      <DynamicClusterMarkers
        points={mapPoints}
        pointCoordsKey={pointCoordsKey}
        onSelectUnidade={onSelectUnidade}
      />
    </MapContainer>
  );
}
