import type { LatLng } from "@/lib/geocode";

export type OsrmRouteResult = {
  /** Pontos da rota (lat/lng) para desenhar no mapa. */
  path: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/** Horário estimado de chegada com base na duração da rota. */
export function formatChegadaEstimada(
  durationSeconds: number,
  agora = new Date()
): string {
  const chegada = new Date(agora.getTime() + durationSeconds * 1000);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(chegada);
}

/**
 * Rota de carro entre dois pontos via OSRM (OpenStreetMap).
 * Tempo estimado sem trânsito em tempo real.
 */
export async function fetchOsrmRoute(
  origin: LatLng,
  destination: LatLng
): Promise<OsrmRouteResult | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    code?: string;
    routes?: {
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: [number, number][] };
    }[];
  };

  if (data.code !== "Ok" || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const raw = route.geometry?.coordinates;
  if (!raw?.length) return null;

  const distanceMeters = route.distance ?? 0;
  const durationSeconds = route.duration ?? 0;

  const path: LatLng[] = raw.map(([lng, lat]) => ({ lat, lng }));

  return { path, distanceMeters, durationSeconds };
}
