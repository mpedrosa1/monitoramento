import { normalizeNumeroChamado, sanitizeNumeroChamado } from "./chamado-email";
import type { Chamado } from "./types";

/** Próximo número de protocolo: maior número existente + 1, com 6 dígitos. */
export function proximoNumeroChamado(chamados: Chamado[]): string {
  let max = 0;
  for (const c of chamados) {
    const n = Number.parseInt(sanitizeNumeroChamado(c.numero ?? ""), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return normalizeNumeroChamado(String(max + 1));
}

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
