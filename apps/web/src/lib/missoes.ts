import type { Chamado, Missao, MissaoStatus } from "./types";
import { hojeIso, isoParaDataExtenso, formatNumeroExibicao } from "./chamado-email";

export function missoesDaUnidade(
  missoes: Missao[],
  unidadeId: string
): Missao[] {
  return missoes.filter((m) => m.unidadeId === unidadeId);
}

function chamadoDaMissao(missao: Missao, chamados: Chamado[]): Chamado | null {
  if (!missao.chamadoId) return null;
  return chamados.find((c) => c.id === missao.chamadoId) ?? null;
}

export function dataInicioMissao(
  missao: Missao,
  chamado?: Chamado | null
): string | undefined {
  return missao.dataInicio ?? chamado?.previsaoChegadaData;
}

/** Início antes do dia de hoje (comparação YYYY-MM-DD). */
export function inicioMissaoAnteriorAHoje(
  missao: Missao,
  chamado?: Chamado | null,
  hoje = hojeIso()
): boolean {
  const data = dataInicioMissao(missao, chamado);
  if (!data) return false;
  return data < hoje;
}

/**
 * Missão planejada com início no passado é exibida/tratada como em andamento.
 */
export function statusEfetivoMissao(
  missao: Missao,
  chamado?: Chamado | null
): MissaoStatus {
  if (
    missao.status === "planejada" &&
    inicioMissaoAnteriorAHoje(missao, chamado)
  ) {
    return "em_andamento";
  }
  return missao.status;
}

/** Missão já iniciada (em andamento real ou efetivo). */
export function missaoIniciada(
  missao: Missao,
  chamado?: Chamado | null
): boolean {
  return statusEfetivoMissao(missao, chamado) === "em_andamento";
}

export function missoesPlanejadasDaUnidade(
  missoes: Missao[],
  unidadeId: string,
  chamados: Chamado[] = []
): Missao[] {
  return missoesDaUnidade(missoes, unidadeId).filter((m) => {
    const chamado = chamadoDaMissao(m, chamados);
    return statusEfetivoMissao(m, chamado) === "planejada";
  });
}

export function missoesEmAndamentoDaUnidade(
  missoes: Missao[],
  unidadeId: string,
  chamados: Chamado[] = []
): Missao[] {
  return missoesDaUnidade(missoes, unidadeId).filter((m) => {
    const chamado = chamadoDaMissao(m, chamados);
    return statusEfetivoMissao(m, chamado) === "em_andamento";
  });
}

/** Rótulo do chamado vinculado à missão; sem vínculo = preventiva. */
export function labelChamadoVinculadoMissao(
  chamadoId: string | undefined,
  chamados: Chamado[]
): string {
  if (!chamadoId) return "Preventiva";
  const c = chamados.find((ch) => ch.id === chamadoId);
  if (!c) return "Preventiva";
  return c.numero ? formatNumeroExibicao(c.numero) : c.titulo;
}

/** Data e hora de início da missão (com fallback ao chamado vinculado). */
export function formatInicioMissao(
  missao: Missao,
  chamado?: Chamado | null
): string {
  const data = dataInicioMissao(missao, chamado);
  const hora = missao.horaInicio ?? chamado?.previsaoChegadaHora;
  if (!data) return "—";
  return `${isoParaDataExtenso(data)}${hora ? `, ${hora}` : ""}`;
}
