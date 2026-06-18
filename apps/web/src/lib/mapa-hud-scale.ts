export const MAPA_HUD_SCALE_MIN = 0.75;
export const MAPA_HUD_SCALE_MAX = 1.25;
export const MAPA_HUD_SCALE_DEFAULT = 1;
export const MAPA_HUD_SCALE_STORAGE_KEY = "mapa-hud-scale";

export function clampMapaHudScale(value: number): number {
  return Math.min(
    MAPA_HUD_SCALE_MAX,
    Math.max(MAPA_HUD_SCALE_MIN, value)
  );
}

export function loadMapaHudScale(): number {
  if (typeof window === "undefined") return MAPA_HUD_SCALE_DEFAULT;
  try {
    const raw = localStorage.getItem(MAPA_HUD_SCALE_STORAGE_KEY);
    if (!raw) return MAPA_HUD_SCALE_DEFAULT;
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed)) return MAPA_HUD_SCALE_DEFAULT;
    return clampMapaHudScale(parsed);
  } catch {
    return MAPA_HUD_SCALE_DEFAULT;
  }
}

export function saveMapaHudScale(value: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      MAPA_HUD_SCALE_STORAGE_KEY,
      String(clampMapaHudScale(value))
    );
  } catch {
    /* ignore */
  }
}

export type MapaHudScaleOrigin =
  | "top left"
  | "top right"
  | "bottom left"
  | "bottom right";

export function mapaHudCornerScaleStyle(
  scale: number,
  origin: MapaHudScaleOrigin
): { transform: string; transformOrigin: MapaHudScaleOrigin } | undefined {
  if (scale === 1) return undefined;
  return {
    transform: `scale(${scale})`,
    transformOrigin: origin,
  };
}

/** @deprecated Preferir mapaHudCornerScaleStyle por canto. */
export function mapaHudScaleWrapperStyle(scale: number): {
  transform: string;
  transformOrigin: string;
  width: string;
  height: string;
  maxHeight: string;
} {
  return {
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    maxHeight: `${100 / scale}%`,
  };
}

export function mapaHudDockBottomOffset(scale: number): string {
  return `calc((11.5rem + 0.5rem) * ${scale})`;
}

/** Largura base da lista de unidades no HUD geral (rem). */
export const MAPA_HUD_LISTA_UNIDADES_WIDTH_REM = 18;
export const MAPA_HUD_LISTA_UNIDADES_WIDTH_SM_REM = 20;
