import { asArray } from "@/lib/api";
import type { LatLng } from "@/lib/geocode";
import type { Unidade, UnidadeAreaVertice } from "@/lib/types";

const EARTH_RADIUS_M = 6378137;

/** Área geodésica de um polígono em m² (vértices em ordem). */
export function polygonAreaM2(vertices: LatLng[]): number {
  if (vertices.length < 3) return 0;

  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs((area * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** Centroide planar do polígono (adequado para áreas de unidade). */
export function polygonCentroid(vertices: LatLng[]): LatLng | null {
  if (vertices.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const v of vertices) {
    lat += v.lat;
    lng += v.lng;
  }
  return { lat: lat / vertices.length, lng: lng / vertices.length };
}

let measureCanvas: HTMLCanvasElement | null = null;

/** Recuo visual dos vértices do polígono na tela (0–1, em direção ao centro). */
export const AREA_LABEL_INSET_RATIO = 0.2;

export const AREA_LABEL_FONT_FAMILY =
  "var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif";

export const AREA_LABEL_FONT_WEIGHT = 400;

/** Tamanho de fonte (px) para caber o texto dentro da caixa do polígono na tela. */
export function fitAreaLabelFontSize(
  text: string,
  maxWidthPx: number,
  maxHeightPx: number,
  minPx = 7,
  maxPx = 96
): number {
  if (maxWidthPx < 8 || maxHeightPx < 8) return minPx;
  if (typeof document === "undefined") return minPx;

  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return minPx;

  const family = "ui-sans-serif, system-ui, -apple-system, sans-serif";
  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    ctx.font = `${AREA_LABEL_FONT_WEIGHT} ${mid}px ${family}`;
    const { width } = ctx.measureText(text);
    const height = mid * 1.15;
    if (width <= maxWidthPx * 0.68 && height <= maxHeightPx * 0.32) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return Math.max(minPx, Math.floor(best * 0.92));
}

export function insetScreenPoints<T extends { x: number; y: number }>(
  points: T[],
  ratio = AREA_LABEL_INSET_RATIO
): T[] {
  if (points.length === 0 || ratio <= 0) return points;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points.map((p) => ({
    ...p,
    x: p.x + (cx - p.x) * ratio,
    y: p.y + (cy - p.y) * ratio,
  }));
}

export function formatAreaM2(m2: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(m2);
}

export function formatAreaM2ComUnidade(m2: number): string {
  return `${formatAreaM2(m2)} m²`;
}

export function formatUnidadeAreaExibicao(unidade: Unidade): string {
  if (!unidadeTemAreaDefinida(unidade)) return "—";
  return formatAreaM2ComUnidade(unidadeAreaM2Exibicao(unidade));
}

export function verticesToLatLng(vertices: UnidadeAreaVertice[]): LatLng[] {
  return vertices
    .filter(
      (v) =>
        Number.isFinite(v.latitude) &&
        Number.isFinite(v.longitude) &&
        v.latitude >= -90 &&
        v.latitude <= 90 &&
        v.longitude >= -180 &&
        v.longitude <= 180
    )
    .map((v) => ({ lat: v.latitude, lng: v.longitude }));
}

export function latLngToVertices(points: LatLng[]): UnidadeAreaVertice[] {
  return points.map((p) => ({
    latitude: Number(p.lat.toFixed(6)),
    longitude: Number(p.lng.toFixed(6)),
  }));
}

export function unidadeAreaVertices(unidade: Unidade): LatLng[] {
  return verticesToLatLng(asArray(unidade.areaVertices));
}

export function unidadeTemAreaDefinida(unidade: Unidade): boolean {
  const vertices = unidadeAreaVertices(unidade);
  return vertices.length >= 3 && (unidade.areaM2 ?? 0) > 0;
}

export function unidadeAreaM2Exibicao(unidade: Unidade): number {
  if ((unidade.areaM2 ?? 0) > 0) return unidade.areaM2!;
  const vertices = unidadeAreaVertices(unidade);
  return vertices.length >= 3 ? polygonAreaM2(vertices) : 0;
}

export function areaResumo(vertices: LatLng[]): string {
  if (vertices.length < 3) {
    return vertices.length === 0
      ? "Nenhuma área definida"
      : `${vertices.length} ponto${vertices.length === 1 ? "" : "s"} — mínimo 3`;
  }
  return `${formatAreaM2(polygonAreaM2(vertices))} m² · ${vertices.length} vértices`;
}
