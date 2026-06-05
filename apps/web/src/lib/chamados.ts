import type { Chamado } from "./types";

/** Últimos chamados com status "aberto" de uma unidade, mais recentes primeiro. */
export function ultimosChamadosAbertosDaUnidade(
  chamados: Chamado[],
  unidadeId: string,
  limit = 5
): Chamado[] {
  return chamados
    .filter((c) => c.unidadeId === unidadeId && c.status === "aberto")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}
