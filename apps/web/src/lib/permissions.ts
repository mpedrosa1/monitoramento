import type { Chamado, TipoAcessoSistema } from "@/lib/types";

/** Somente administradores — CRUD na página Missões. */
export function canManageMissoes(
  tipoAcesso: TipoAcessoSistema | undefined | null
): boolean {
  return (
    tipoAcesso === "admin_com_financeiro" ||
    tipoAcesso === "admin_sem_financeiro"
  );
}

/** Administradores e desenvolvedores — podem gerenciar cadastros. */
export function canManageData(
  tipoAcesso: TipoAcessoSistema | undefined | null
): boolean {
  return (
    tipoAcesso === "admin_com_financeiro" ||
    tipoAcesso === "admin_sem_financeiro" ||
    tipoAcesso === "desenvolvedor"
  );
}

/** Página de equipamentos — mesmo critério dos administradores. */
export function canAccessEquipamentos(
  tipoAcesso: TipoAcessoSistema | undefined | null
): boolean {
  return canManageData(tipoAcesso);
}

/** Colaborador logado faz parte da missão do chamado. */
export function isAtribuidoMissao(
  colaboradorId: string | undefined,
  chamado: Chamado | null | undefined
): boolean {
  if (!colaboradorId || !chamado?.colaboradorIds?.length) return false;
  return chamado.colaboradorIds.includes(colaboradorId);
}

/**
 * Encerrar chamado em andamento: administradores/desenvolvedores ou
 * colaborador atribuído à missão.
 */
export function canEncerrarChamado(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  chamado: Chamado | null | undefined
): boolean {
  if (!chamado || chamado.status !== "em_andamento") return false;
  if (canManageData(tipoAcesso)) return true;
  return isAtribuidoMissao(colaboradorId, chamado);
}
