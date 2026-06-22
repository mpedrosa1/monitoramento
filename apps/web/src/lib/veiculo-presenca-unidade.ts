import { haversineMeters } from "@/lib/unidade-map-cluster";
import { normalizePlaca } from "@/lib/veiculo-placa";
import type {
  Colaborador,
  ColaboradorStatus,
  Unidade,
  Veiculo,
  VeiculoPosicao,
} from "@/lib/types";

/** Raio em km para considerar veículo próximo da unidade (igual ao backend). */
export const VEICULO_PRESENCA_RAIO_KM = 5;

/** Atualizações consecutivas estáveis para confirmar presença na unidade. */
export const VEICULO_PRESENCA_UPDATES_ESTAVEIS = 5;

/** Velocidade mínima (km/h) para considerar veículo em deslocamento. */
export const VEICULO_VELOCIDADE_DESLOCAMENTO_KMH = 2;

export type PresencaColaboradorHud = {
  colaborador: Colaborador;
  veiculo: Veiculo;
  placa: string;
  ambiguo: boolean;
  outrasUnidadesNomes: string[];
};

export type VehicleTrack = {
  signature: string | null;
  stableCount: number;
  nearbyUnitIds: string[];
  confirmed: boolean;
};

function roundCoord(n: number): string {
  /** ~11 m — tolera jitter de GPS sem perder precisão para presença na unidade. */
  return n.toFixed(4);
}

function roundVel(n: number): string {
  return Math.round(n).toString();
}

function positionSignature(p: VeiculoPosicao): string {
  return `${roundCoord(p.lat)}|${roundCoord(p.lng)}|${roundVel(p.velocidadeKm ?? 0)}`;
}

function validCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function unidadesNoRaio(
  pos: VeiculoPosicao,
  unidades: Unidade[]
): { id: string; nome: string }[] {
  const out: { id: string; nome: string }[] = [];
  for (const u of unidades) {
    const lat = u.latitude;
    const lng = u.longitude;
    if (lat == null || lng == null || !validCoords(lat, lng)) continue;
    const distKm =
      haversineMeters({ lat: pos.lat, lng: pos.lng }, { lat, lng }) / 1000;
    if (distKm <= VEICULO_PRESENCA_RAIO_KM) {
      out.push({ id: u.id, nome: u.nome });
    }
  }
  return out;
}

function sameUnitSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

function updateVehicleTrack(
  track: VehicleTrack,
  pos: VeiculoPosicao,
  nearby: { id: string; nome: string }[]
): void {
  const nearbyIds = nearby.map((u) => u.id);
  const sig = positionSignature(pos);

  if (nearby.length === 0) {
    track.signature = null;
    track.stableCount = 0;
    track.nearbyUnitIds = [];
    track.confirmed = false;
    return;
  }

  if (track.signature === sig && sameUnitSet(track.nearbyUnitIds, nearbyIds)) {
    track.stableCount += 1;
  } else {
    track.signature = sig;
    track.stableCount = 1;
    track.nearbyUnitIds = nearbyIds;
  }

  track.confirmed = track.stableCount >= VEICULO_PRESENCA_UPDATES_ESTAVEIS;
}

function statusFromTrack(
  track: VehicleTrack,
  pos: VeiculoPosicao
): ColaboradorStatus {
  if (track.confirmed && track.nearbyUnitIds.length > 0) {
    return "em_missao";
  }
  const moving = (pos.velocidadeKm ?? 0) >= VEICULO_VELOCIDADE_DESLOCAMENTO_KMH;
  if (moving) {
    return "em_deslocamento";
  }
  return "escritorio";
}

function resolveVeiculoDaPosicao(
  pos: VeiculoPosicao,
  veiculoPorId: Map<string, Veiculo>,
  veiculoPorPlaca: Map<string, Veiculo>
): Veiculo | undefined {
  return (
    veiculoPorId.get(pos.veiculoId) ??
    veiculoPorPlaca.get(normalizePlaca(pos.placa))
  );
}

export type RastreamentoColaboradorResult = {
  presencasPorUnidade: Map<string, PresencaColaboradorHud[]>;
  statusPorColaborador: Map<string, ColaboradorStatus>;
};

/**
 * Processa posições GPS e retorna presenças no HUD e status operacional por colaborador.
 */
export function processRastreamentoColaboradores(
  tracker: Map<string, VehicleTrack>,
  veiculoPosicoes: VeiculoPosicao[],
  unidades: Unidade[],
  veiculos: Veiculo[],
  colaboradores: Colaborador[]
): RastreamentoColaboradorResult {
  const veiculoPorId = new Map(veiculos.map((v) => [v.id, v]));
  const veiculoPorPlaca = new Map(
    veiculos.map((v) => [normalizePlaca(v.placa), v])
  );
  const colaboradorPorId = new Map(colaboradores.map((c) => [c.id, c]));
  const unidadeNomePorId = new Map(unidades.map((u) => [u.id, u.nome]));

  const activeIds = new Set(veiculoPosicoes.map((p) => p.veiculoId));
  for (const id of tracker.keys()) {
    if (!activeIds.has(id)) tracker.delete(id);
  }

  const statusPorColaborador = new Map<string, ColaboradorStatus>();

  for (const pos of veiculoPosicoes) {
    if (!validCoords(pos.lat, pos.lng)) continue;

    let track = tracker.get(pos.veiculoId);
    if (!track) {
      track = {
        signature: null,
        stableCount: 0,
        nearbyUnitIds: [],
        confirmed: false,
      };
      tracker.set(pos.veiculoId, track);
    }

    const nearby = unidadesNoRaio(pos, unidades);
    updateVehicleTrack(track, pos, nearby);

    const veiculo = resolveVeiculoDaPosicao(pos, veiculoPorId, veiculoPorPlaca);
    if (veiculo?.colaboradorId) {
      statusPorColaborador.set(
        veiculo.colaboradorId,
        statusFromTrack(track, pos)
      );
    }
  }

  const presencasPorUnidade = new Map<string, PresencaColaboradorHud[]>();

  for (const [veiculoId, track] of tracker) {
    if (!track.confirmed || track.nearbyUnitIds.length === 0) continue;

    const pos = veiculoPosicoes.find((p) => p.veiculoId === veiculoId);
    const veiculo =
      veiculoPorId.get(veiculoId) ??
      (pos ? resolveVeiculoDaPosicao(pos, veiculoPorId, veiculoPorPlaca) : undefined);
    if (!veiculo?.colaboradorId) continue;

    const colaborador = colaboradorPorId.get(veiculo.colaboradorId);
    if (!colaborador) continue;

    const ambiguo = track.nearbyUnitIds.length > 1;
    const placa = pos?.placa ?? veiculo.placa;

    for (const unidadeId of track.nearbyUnitIds) {
      const outrasUnidadesNomes = track.nearbyUnitIds
        .filter((id) => id !== unidadeId)
        .map((id) => unidadeNomePorId.get(id) ?? id);

      const item: PresencaColaboradorHud = {
        colaborador,
        veiculo,
        placa,
        ambiguo,
        outrasUnidadesNomes,
      };

      const list = presencasPorUnidade.get(unidadeId) ?? [];
      if (!list.some((x) => x.colaborador.id === colaborador.id)) {
        list.push(item);
      }
      presencasPorUnidade.set(unidadeId, list);
    }
  }

  return { presencasPorUnidade, statusPorColaborador };
}

export function presencasNaUnidade(
  map: Map<string, PresencaColaboradorHud[]>,
  unidadeId: string
): PresencaColaboradorHud[] {
  return map.get(unidadeId) ?? [];
}

/** @deprecated Use processRastreamentoColaboradores */
export function computePresencasPorUnidade(
  tracker: Map<string, VehicleTrack>,
  veiculoPosicoes: VeiculoPosicao[],
  unidades: Unidade[],
  veiculos: Veiculo[],
  colaboradores: Colaborador[]
): Map<string, PresencaColaboradorHud[]> {
  return processRastreamentoColaboradores(
    tracker,
    veiculoPosicoes,
    unidades,
    veiculos,
    colaboradores
  ).presencasPorUnidade;
}
