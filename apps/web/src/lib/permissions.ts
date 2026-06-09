import { missaoIniciada } from "@/lib/missoes";
import type { Chamado, Missao, TipoAcessoSistema } from "@/lib/types";

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

/** Colaborador logado faz parte da missão (registro Missao). */
export function isAtribuidoMissaoDireta(
  colaboradorId: string | undefined,
  missao: Missao | null | undefined
): boolean {
  if (!colaboradorId || !missao?.colaboradorIds?.length) return false;
  return missao.colaboradorIds.includes(colaboradorId);
}

/** Colaborador atribuído pode iniciar missão planejada. */
export function canIniciarMissao(
  colaboradorId: string | undefined,
  missao: Missao | null | undefined
): boolean {
  if (!missao || missao.status !== "planejada") return false;
  return isAtribuidoMissaoDireta(colaboradorId, missao);
}

/**
 * Concluir missão em andamento: administradores/desenvolvedores ou
 * colaborador atribuído à missão. Missões ainda não iniciadas
 * (agendadas) não podem ser concluídas.
 */
export function canConcluirMissao(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  missao: Missao | null | undefined,
  chamado?: Chamado | null
): boolean {
  if (!missao || !missaoIniciada(missao, chamado)) return false;
  if (canManageData(tipoAcesso)) return true;
  return isAtribuidoMissaoDireta(colaboradorId, missao);
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
