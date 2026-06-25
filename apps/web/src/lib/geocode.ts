import type { UnidadeEndereco } from "./types";

/** Centro aproximado do estado de São Paulo (para mapa sem endereço). */
export const SP_STATE_CENTER = {
  lat: -22.19,
  lng: -48.79,
  zoom: 7,
} as const;

export const MAP_ZOOM_ENDERECO = 16;
export const MAP_ZOOM_COORD = 16;

export type LatLng = { lat: number; lng: number };

export function formatCoord(value: number): string {
  return value.toFixed(6);
}

export function parseCoordPair(
  latitude: string,
  longitude: string
): LatLng | null {
  const lat = Number.parseFloat(latitude.replace(",", ".").trim());
  const lng = Number.parseFloat(longitude.replace(",", ".").trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function enderecoTemConteudo(endereco: UnidadeEndereco): boolean {
  const e = endereco;
  return !!(
    e.logradouro.trim() ||
    e.bairro.trim() ||
    e.cidade.trim() ||
    e.estado.trim() ||
    e.cep.replace(/\D/g, "").length >= 5
  );
}

export function montarQueryEndereco(endereco: UnidadeEndereco): string {
  const parts = [
    endereco.logradouro.trim(),
    endereco.numero.trim() ? `nº ${endereco.numero.trim()}` : "",
    endereco.bairro.trim(),
    endereco.cidade.trim(),
    endereco.estado.trim(),
    endereco.cep.trim(),
    "Brasil",
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Converte endereço em coordenadas via Nominatim (OpenStreetMap).
 * Uso moderado; requer User-Agent identificável.
 */
export async function geocodificarEndereco(
  endereco: UnidadeEndereco
): Promise<LatLng | null> {
  const q = montarQueryEndereco(endereco);
  const semPais = q.replace(/,?\s*Brasil\s*$/i, "").trim();
  if (!semPais) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "MMRTEC-Monitoramento/1.0 (unidades; geocode)",
    },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { lat?: string; lon?: string }[];
  const first = data[0];
  if (!first?.lat || !first?.lon) return null;

  const lat = Number.parseFloat(first.lat);
  const lng = Number.parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

/** Abre rotas no Google Maps (site ou app no celular). */
export function googleMapsDirectionsUrl(
  destination: LatLng,
  origin?: LatLng | null
): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * URL para embutir (iframe) o Google Street View de uma coordenada.
 * Usa a Embed API oficial quando há `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`;
 * caso contrário, recorre ao embed sem chave do Google Maps.
 */
export function googleStreetViewEmbedUrl(lat: number, lng: number): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/streetview?key=${key}&location=${lat},${lng}&fov=90`;
  }
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`;
}
