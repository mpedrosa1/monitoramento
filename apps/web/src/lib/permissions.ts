import { missaoIniciada } from "@/lib/missoes";
import {
  canAccessRecursosHumanos as canAccessRH,
  canManagePadrao,
  canManageRecargas,
  canViewFinanceiro,
  isDesenvolvedor,
  isMaster,
  resolvePermissoes,
} from "@/lib/acesso";
import type { Chamado, Missao, PermissoesAdmin, TipoAcessoSistema } from "@/lib/types";

type AcessoContext = {
  tipoAcesso?: TipoAcessoSistema | string | null;
  permissoesAdmin?: PermissoesAdmin | null;
};

function ctx(tipoAcesso?: TipoAcessoSistema | string | null, permissoesAdmin?: PermissoesAdmin | null): AcessoContext {
  return { tipoAcesso, permissoesAdmin };
}

/** Somente administradores com Padrão — CRUD na página Missões. */
export function canManageMissoes(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canManagePadrao(tipoAcesso, permissoesAdmin);
}

/** Administradores com Padrão — vincular e editar equipamentos na unidade. */
export function canManageEquipamentosUnidade(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canManagePadrao(tipoAcesso, permissoesAdmin);
}

/** Administradores com Padrão — podem gerenciar cadastros. */
export function canManageData(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canManagePadrao(tipoAcesso, permissoesAdmin);
}

/** Página de equipamentos — mesmo critério do Padrão. */
export function canAccessEquipamentos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canManagePadrao(tipoAcesso, permissoesAdmin);
}

export function canAccessRecursosHumanos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canAccessRH(tipoAcesso, permissoesAdmin);
}

export { canManageRecargas, canViewFinanceiro, isDesenvolvedor, isMaster, resolvePermissoes };

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
 * Concluir missão em andamento: administradores ou
 * colaborador atribuído à missão.
 */
export function canConcluirMissao(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  missao: Missao | null | undefined,
  chamado?: Chamado | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (!missao || !missaoIniciada(missao, chamado)) return false;
  if (canManagePadrao(tipoAcesso, permissoesAdmin)) return true;
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
 * Encerrar chamado em andamento: administradores ou
 * colaborador atribuído à missão.
 */
export function canEncerrarChamado(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  chamado: Chamado | null | undefined,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (!chamado || chamado.status !== "em_andamento") return false;
  if (canManagePadrao(tipoAcesso, permissoesAdmin)) return true;
  return isAtribuidoMissao(colaboradorId, chamado);
}

export type { AcessoContext };
