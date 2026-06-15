import L from "leaflet";
import type { UnidadeMapPoint } from "@/lib/unidade-map-cluster";

const COLOR_ONLINE = "#22c55e";
const COLOR_OFFLINE = "#ef4444";

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  if (endDeg - startDeg >= 360) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  }
  const p0 = polar(cx, cy, r, startDeg);
  const p1 = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y} Z`;
}

function clusterPieSvg(points: UnidadeMapPoint[], selected: boolean): string {
  const size = 44;
  const cx = size / 2;
  const cy = size / 2;
  const r = 17;
  const n = points.length;
  const slice = 360 / n;
  const sorted = [...points].sort((a, b) =>
    a.unidade.id.localeCompare(b.unidade.id)
  );

  const slices = sorted
    .map((p, i) => {
      const fill = p.online ? COLOR_ONLINE : COLOR_OFFLINE;
      const d = pieSlicePath(cx, cy, r, i * slice, (i + 1) * slice);
      return `<path d="${d}" fill="${fill}" />`;
    })
    .join("");

  const selectionRing = selected
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#1074b8" stroke-width="2.5" />`
    : "";

  const border = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff" stroke-width="2" />`;
  const label = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-size="13" font-weight="700" font-family="system-ui,sans-serif" paint-order="stroke" stroke="#00000055" stroke-width="2">${n}</text>`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))">${selectionRing}${slices}${border}${label}</svg>`;
}

function singleUnitSvg(online: boolean, selected: boolean): string {
  const size = 28;
  const cx = size / 2;
  const cy = size / 2;
  const r = 11;
  const fill = online ? COLOR_ONLINE : COLOR_OFFLINE;
  const selectionRing = selected
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="#1074b8" stroke-width="2.5" />`
    : "";
  const dot = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="2" />`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.4))">${selectionRing}${dot}</svg>`;
}

export function unidadeClusterMapIcon(
  points: UnidadeMapPoint[],
  selected: boolean
): L.DivIcon {
  const count = points.length;
  const html =
    count > 1
      ? clusterPieSvg(points, selected)
      : singleUnitSvg(points[0]?.online ?? false, selected);
  const size = count > 1 ? 44 : 28;

  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
