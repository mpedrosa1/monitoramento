import type { HudEquipamentoPos } from "@/lib/mapa-hud-equipamentos-pos";

const STORAGE_KEY = "mapa-hud-layout-v1";

type MapaHudLayoutStore = {
  geralEquipamentos: Record<string, HudEquipamentoPos>;
  unidadeEquipamentos: Record<string, Record<string, HudEquipamentoPos>>;
  veiculoCards: Record<string, HudEquipamentoPos>;
};

function emptyStore(): MapaHudLayoutStore {
  return {
    geralEquipamentos: {},
    unidadeEquipamentos: {},
    veiculoCards: {},
  };
}

function readStore(): MapaHudLayoutStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<MapaHudLayoutStore>;
    return {
      geralEquipamentos: parsed.geralEquipamentos ?? {},
      unidadeEquipamentos: parsed.unidadeEquipamentos ?? {},
      veiculoCards: parsed.veiculoCards ?? {},
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: MapaHudLayoutStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function isValidPos(pos: unknown): pos is HudEquipamentoPos {
  if (!pos || typeof pos !== "object") return false;
  const p = pos as HudEquipamentoPos;
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

export function loadGeralEquipamentosPos(): Record<string, HudEquipamentoPos> {
  return readStore().geralEquipamentos;
}

export function saveGeralEquipamentosPos(
  posicoes: Record<string, HudEquipamentoPos>
): void {
  const store = readStore();
  store.geralEquipamentos = posicoes;
  writeStore(store);
}

export function loadUnidadeEquipamentosPos(
  unidadeId: string
): Record<string, HudEquipamentoPos> {
  if (!unidadeId) return {};
  return readStore().unidadeEquipamentos[unidadeId] ?? {};
}

export function saveUnidadeEquipamentosPos(
  unidadeId: string,
  posicoes: Record<string, HudEquipamentoPos>
): void {
  if (!unidadeId) return;
  const store = readStore();
  store.unidadeEquipamentos[unidadeId] = posicoes;
  writeStore(store);
}

export function loadVeiculoCardPos(
  storageKey: string
): HudEquipamentoPos | null {
  if (!storageKey) return null;
  const pos = readStore().veiculoCards[storageKey];
  return isValidPos(pos) ? pos : null;
}

export function veiculoCardStorageKeyGeral(): string {
  return "geral";
}

export function veiculoCardStorageKeyUnidade(unidadeId: string): string {
  return `unidade:${unidadeId}`;
}

export function saveVeiculoCardPos(
  storageKey: string,
  pos: HudEquipamentoPos
): void {
  if (!storageKey || !isValidPos(pos)) return;
  const store = readStore();
  store.veiculoCards[storageKey] = pos;
  writeStore(store);
}
