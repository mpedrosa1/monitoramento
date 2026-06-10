"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { unlockAlertAudio } from "@/lib/alert-sound";
import { unidadeClusterMapIcon } from "@/lib/cluster-map-icon";
import { SP_STATE_CENTER } from "@/lib/geocode";
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

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map]);
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

function DynamicClusterMarkers({
  points,
  pointCoordsKey,
  selectedId,
  onSelectUnidade,
}: {
  points: UnidadeMapPoint[];
  pointCoordsKey: string;
  selectedId: string | null;
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
        const count = cluster.points.length;
        const livePoints = cluster.points.map(
          (p) => pointById.get(p.unidade.id) ?? p
        );
        const selected = livePoints.some((p) => p.unidade.id === selectedId);
        const key = livePoints
          .map((p) => p.unidade.id)
          .sort()
          .join("-");

        return (
          <Marker
            key={key}
            position={[cluster.lat, cluster.lng]}
            icon={unidadeClusterMapIcon(livePoints, selected)}
            eventHandlers={{
              click: () => {
                if (count === 1 && onSelectUnidade) {
                  onSelectUnidade(livePoints[0].unidade.id);
                }
              },
            }}
          >
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
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded px-1 py-0.5 text-left hover:bg-muted/60",
                        p.unidade.id === selectedId && "bg-muted/40"
                      )}
                      onClick={() => onSelectUnidade?.(p.unidade.id)}
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
          </Marker>
        );
      })}
    </>
  );
}

export default function PainelUnidadesMapInner({
  unidades,
  metricMap,
  selectedId,
  onSelectUnidade,
}: {
  unidades: Unidade[];
  metricMap: Map<string, DeviceMetric>;
  selectedId: string | null;
  onSelectUnidade?: (id: string) => void;
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

  if (mapPoints.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center border-t border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhuma unidade com coordenadas cadastradas para exibir no mapa.
      </div>
    );
  }

  return (
    <MapContainer
      center={[SP_STATE_CENTER.lat, SP_STATE_CENTER.lng]}
      zoom={SP_STATE_CENTER.zoom}
      className="h-full min-h-[320px] w-full"
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
      <MapInvalidateSize />
      <MapAudioUnlock />
      <MapFitClustersOnce points={fitPoints} />
      <DynamicClusterMarkers
        points={mapPoints}
        pointCoordsKey={pointCoordsKey}
        selectedId={selectedId}
        onSelectUnidade={onSelectUnidade}
      />
    </MapContainer>
  );
}
