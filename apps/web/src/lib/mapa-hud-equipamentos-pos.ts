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
