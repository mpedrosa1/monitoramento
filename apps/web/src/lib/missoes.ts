import type { Chamado, Missao, MissaoStatus } from "./types";
import { isoParaDataExtenso, formatNumeroExibicao } from "./chamado-email";

export function missoesDaUnidade(
  missoes: Missao[],
  unidadeId: string
): Missao[] {
  return missoes.filter((m) => m.unidadeId === unidadeId);
}

function chamadoIdEfetivo(chamadoId?: string): boolean {
  const id = chamadoId?.trim();
  if (!id) return false;
  return id !== "000000000000000000000000";
}

function chamadoDaMissao(missao: Missao, chamados: Chamado[]): Chamado | null {
  if (!chamadoIdEfetivo(missao.chamadoId)) return null;
  return chamados.find((c) => c.id === missao.chamadoId) ?? null;
}

/** Chamado resolvido na missão; null = preventiva ou vínculo inexistente. */
export function chamadoVinculadoDaMissao(
  missao: Missao | null | undefined,
  chamados: Chamado[]
): Chamado | null {
  if (!missao) return null;
  return chamadoDaMissao(missao, chamados);
}

/** Conclusão pelo modal da missão — quando não há chamado efetivamente vinculado. */
export function missaoPermiteConclusaoDireta(
  missao: Missao,
  chamados: Chamado[]
): boolean {
  return chamadoDaMissao(missao, chamados) === null;
}

export function dataInicioMissao(
  missao: Missao,
  chamado?: Chamado | null
): string | undefined {
  return missao.dataInicio ?? chamado?.previsaoChegadaData;
}

/**
 * Status exibido da missão (igual ao gravado; início não depende mais da data prevista).
 */
export function statusEfetivoMissao(
  missao: Missao,
  _chamado?: Chamado | null
): MissaoStatus {
  return missao.status;
}

/** Missão já iniciada (status gravado em andamento). */
export function missaoIniciada(
  missao: Missao,
  _chamado?: Chamado | null
): boolean {
  return missao.status === "em_andamento";
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
  if (!chamadoIdEfetivo(chamadoId)) return "Preventiva";
  const c = chamados.find((ch) => ch.id === chamadoId);
  if (!c) return "Preventiva";
  return c.numero ? formatNumeroExibicao(c.numero) : c.titulo;
}

export type TipoMissao = "corretiva" | "preventiva";

export const tipoMissaoLabel: Record<TipoMissao, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
};

/** Corretiva = com chamado vinculado; preventiva = sem chamado. */
export function tipoMissao(
  missao: Pick<Missao, "chamadoId">,
  chamados: Chamado[]
): TipoMissao {
  return chamadoVinculadoDaMissao(missao as Missao, chamados)
    ? "corretiva"
    : "preventiva";
}

/** Coluna Chamado na listagem: número do chamado ou S/N. */
export function labelChamadoMissaoTabela(
  chamadoId: string | undefined,
  chamados: Chamado[]
): string {
  if (!chamadoIdEfetivo(chamadoId)) return "S/N";
  const c = chamados.find((ch) => ch.id === chamadoId);
  if (!c) return "S/N";
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
