import type { LatLng } from "./geocode";
import type { Unidade } from "./types";

export type UnidadeMapPoint = {
  unidade: Unidade;
  lat: number;
  lng: number;
  online: boolean;
};

export type UnidadeMapCluster = {
  lat: number;
  lng: number;
  points: UnidadeMapPoint[];
};

/** Raio em metros para unir marcadores muito próximos. */
export const UNIDADE_MAP_CLUSTER_RADIUS_M = 800;

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function clusterKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}`;
}

export function clusterMapOnline(cluster: UnidadeMapCluster): boolean {
  return cluster.points.every((p) => p.online);
}

/** Assinatura da estrutura de clusters (ignora status online). */
export function clustersStructureSignature(
  clusters: UnidadeMapCluster[]
): string {
  return clusters
    .map((c) => {
      const ids = c.points
        .map((p) => p.unidade.id)
        .sort()
        .join(",");
      return `${ids}@${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    })
    .sort()
    .join("|");
}

/** Distância em pixels na tela para unir marcadores (varia com o zoom). */
export const UNIDADE_MAP_CLUSTER_PIXEL_RADIUS = 52;

function unionFindClusters(
  points: UnidadeMapPoint[],
  shouldMerge: (i: number, j: number) => boolean
): UnidadeMapCluster[] {
  if (points.length === 0) return [];

  const parent = points.map((_, i) => i);

  function find(i: number): number {
    let root = i;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]];
      root = parent[root];
    }
    return root;
  }

  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (shouldMerge(i, j)) union(i, j);
    }
  }

  const groups = new Map<number, UnidadeMapPoint[]>();
  for (let i = 0; i < points.length; i++) {
    const root = find(i);
    const list = groups.get(root);
    if (list) list.push(points[i]);
    else groups.set(root, [points[i]]);
  }

  return Array.from(groups.values()).map((pts) => {
    const n = pts.length;
    return {
      lat: pts.reduce((sum, p) => sum + p.lat, 0) / n,
      lng: pts.reduce((sum, p) => sum + p.lng, 0) / n,
      points: pts,
    };
  });
}

/** Agrupa por proximidade em metros (estático). */
export function clusterUnidadeMapPoints(
  points: UnidadeMapPoint[],
  radiusM = UNIDADE_MAP_CLUSTER_RADIUS_M
): UnidadeMapCluster[] {
  return unionFindClusters(points, (i, j) => {
    const sameCoords =
      clusterKey(points[i].lat, points[i].lng) ===
      clusterKey(points[j].lat, points[j].lng);
    if (sameCoords) return true;
    return (
      haversineMeters(
        { lat: points[i].lat, lng: points[i].lng },
        { lat: points[j].lat, lng: points[j].lng }
      ) <= radiusM
    );
  });
}

type MapProjector = (lat: number, lng: number) => { x: number; y: number };

/** Agrupa pela distância em pixels no zoom atual (dinâmico ao afastar/aproximar). */
export function clusterUnidadeMapPointsByPixels(
  points: UnidadeMapPoint[],
  project: MapProjector,
  pixelRadius = UNIDADE_MAP_CLUSTER_PIXEL_RADIUS
): UnidadeMapCluster[] {
  const pixels = points.map((p) => project(p.lat, p.lng));

  return unionFindClusters(points, (i, j) => {
    const sameCoords =
      clusterKey(points[i].lat, points[i].lng) ===
      clusterKey(points[j].lat, points[j].lng);
    if (sameCoords) return true;

    const dx = pixels[i].x - pixels[j].x;
    const dy = pixels[i].y - pixels[j].y;
    return Math.hypot(dx, dy) <= pixelRadius;
  });
}
