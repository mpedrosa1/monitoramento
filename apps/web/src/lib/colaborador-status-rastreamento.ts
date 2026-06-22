import type { Colaborador, ColaboradorStatus } from "@/lib/types";

/** Status definidos manualmente — não sobrescrever pelo rastreamento. */
export const COLABORADOR_STATUS_MANUAIS: ColaboradorStatus[] = [
  "ferias",
  "atestado",
  "almoco",
];

export function colaboradorStatusManual(status: ColaboradorStatus): boolean {
  return COLABORADOR_STATUS_MANUAIS.includes(status);
}

export function colaboradorStatusEfetivo(
  colaborador: Colaborador,
  statusRastreamento?: Map<string, ColaboradorStatus> | null
): ColaboradorStatus {
  if (colaboradorStatusManual(colaborador.status)) {
    return colaborador.status;
  }
  const tracked = statusRastreamento?.get(colaborador.id);
  if (tracked) return tracked;
  return colaborador.status;
}

export function withColaboradorStatusEfetivo(
  colaborador: Colaborador,
  statusRastreamento?: Map<string, ColaboradorStatus> | null
): Colaborador {
  return {
    ...colaborador,
    status: colaboradorStatusEfetivo(colaborador, statusRastreamento),
  };
}

export function withColaboradoresStatusEfetivo(
  colaboradores: Colaborador[],
  statusRastreamento?: Map<string, ColaboradorStatus> | null
): Colaborador[] {
  if (!statusRastreamento || statusRastreamento.size === 0) {
    return colaboradores;
  }
  return colaboradores.map((c) =>
    withColaboradorStatusEfetivo(c, statusRastreamento)
  );
}
