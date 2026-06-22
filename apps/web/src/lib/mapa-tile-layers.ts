export type MapaTileVisao = "rua" | "satelite";

export type MapaTileLayerConfig = {
  url: string;
  attribution: string;
  maxZoom?: number;
};

export const MAPA_TILE_RUA: MapaTileLayerConfig = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
};

/** Esri World Imagery — uso em dev; respeitar termos em produção. */
export const MAPA_TILE_SATELITE: MapaTileLayerConfig = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution:
    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>',
  maxZoom: 19,
};

export function mapaTileLayerConfig(
  visao: MapaTileVisao
): MapaTileLayerConfig {
  return visao === "satelite" ? MAPA_TILE_SATELITE : MAPA_TILE_RUA;
}

export function toggleMapaTileVisao(visao: MapaTileVisao): MapaTileVisao {
  return visao === "rua" ? "satelite" : "rua";
}
