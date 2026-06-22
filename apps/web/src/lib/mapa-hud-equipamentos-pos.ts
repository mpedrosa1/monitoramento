export type HudEquipamentoPos = { x: number; y: number };

export function clampHudEquipamentoPos(
  x: number,
  y: number,
  cardWidth: number,
  cardHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding = 8,
  scale = 1
): HudEquipamentoPos {
  const w = cardWidth * scale;
  const h = cardHeight * scale;
  const maxX = Math.max(padding, containerWidth - w - padding);
  const maxY = Math.max(padding, containerHeight - h - padding);
  return {
    x: Math.min(Math.max(padding, x), maxX),
    y: Math.min(Math.max(padding, y), maxY),
  };
}

export function clientToContainerPos(
  clientX: number,
  clientY: number,
  container: HTMLElement,
  offsetX = 0,
  offsetY = 0
): HudEquipamentoPos {
  const rect = container.getBoundingClientRect();
  return {
    x: clientX - rect.left - offsetX,
    y: clientY - rect.top - offsetY,
  };
}

const GLOBAL_EQUIPAMENTO_KEY_SEP = "|";

export function globalEquipamentoKey(
  unidadeId: string,
  grupoKey: string
): string {
  return `${unidadeId}${GLOBAL_EQUIPAMENTO_KEY_SEP}${grupoKey}`;
}

export function parseGlobalEquipamentoKey(
  key: string
): { unidadeId: string; grupoKey: string } | null {
  const sep = key.indexOf(GLOBAL_EQUIPAMENTO_KEY_SEP);
  if (sep <= 0) return null;
  return {
    unidadeId: key.slice(0, sep),
    grupoKey: key.slice(sep + 1),
  };
}

/** Ponto inferior central do card (considerando escala do HUD). */
export function hudEquipamentoCardAnchorBottom(
  pos: HudEquipamentoPos,
  cardWidth: number,
  cardHeight: number,
  scale = 1
): HudEquipamentoPos {
  return {
    x: pos.x + (cardWidth * scale) / 2,
    y: pos.y + cardHeight * scale,
  };
}
