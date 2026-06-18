import { missaoIniciada } from "@/lib/missoes";
import {
  isMaster,
  resolvePermissoes,
} from "@/lib/acesso";
import {
  permissoesEfetivas,
  temPermissao,
  type PermissaoAdminDetalhadaKey,
} from "@/lib/permissoes-admin";
import type { Chamado, Missao, PermissoesAdmin, TipoAcessoSistema } from "@/lib/types";

type AcessoContext = {
  tipoAcesso?: TipoAcessoSistema | string | null;
  permissoesAdmin?: PermissoesAdmin | null;
};

function ctx(tipoAcesso?: TipoAcessoSistema | string | null, permissoesAdmin?: PermissoesAdmin | null): AcessoContext {
  return { tipoAcesso, permissoesAdmin };
}

function can(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin: PermissoesAdmin | null | undefined,
  key: PermissaoAdminDetalhadaKey
): boolean {
  return temPermissao(tipoAcesso, permissoesAdmin, key);
}

export function canCrudColaboradores(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudColaboradores");
}

export function canCrudUnidades(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudUnidades");
}

export function canCrudVeiculos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudVeiculos");
}

export function canCrudEquipamentos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudEquipamentos");
}

export function canCrudMissoes(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudMissoes");
}

export function canCrudChamados(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "crudChamados");
}

export function canConcluirMissaoQualquer(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "concluirMissaoQualquer");
}

export function canEncerrarChamadoQualquer(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "encerrarChamadoQualquer");
}

export function canFrotaValoresAlugueis(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "frotaValoresAlugueis");
}

export function canFrotaVisualizarContratos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "frotaVisualizarContratos");
}

export function canFrotaRegistrarPeriodo(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "frotaRegistrarPeriodo");
}

export function canFrotaRegistrarMulta(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "frotaRegistrarMulta");
}

export function canFrotaTrocarVeiculos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "frotaTrocarVeiculos");
}

export function canRhSalariosBonificacoes(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "rhSalariosBonificacoes");
}

export function canRhEscalaTrabalho(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "rhEscalaTrabalho");
}

export function canRhCalendarioSobreaviso(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "rhCalendarioSobreaviso");
}

export function canRhRecarregarSaldos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "rhRecarregarSaldos");
}

export function canRhRegistrarDespesaOutros(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return can(tipoAcesso, permissoesAdmin, "rhRegistrarDespesaOutros");
}

export function canViewTodasMultasVeiculo(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (isMaster(tipoAcesso, permissoesAdmin)) return true;
  if (tipoAcesso !== "administrador") return false;
  const p = permissoesEfetivas(tipoAcesso, permissoesAdmin);
  return p.crudVeiculos || p.frotaRegistrarMulta;
}

/** Qualquer permissão de CRUD de cadastro. */
export function canManageData(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return (
    canCrudColaboradores(tipoAcesso, permissoesAdmin) ||
    canCrudUnidades(tipoAcesso, permissoesAdmin) ||
    canCrudVeiculos(tipoAcesso, permissoesAdmin) ||
    canCrudEquipamentos(tipoAcesso, permissoesAdmin) ||
    canCrudMissoes(tipoAcesso, permissoesAdmin) ||
    canCrudChamados(tipoAcesso, permissoesAdmin)
  );
}

export function canManageMissoes(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canCrudMissoes(tipoAcesso, permissoesAdmin);
}

export function canManageEquipamentosUnidade(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canCrudEquipamentos(tipoAcesso, permissoesAdmin);
}

export function canAccessEquipamentos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canCrudEquipamentos(tipoAcesso, permissoesAdmin);
}

export function canAccessRecursosHumanos(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (isMaster(tipoAcesso, permissoesAdmin)) return true;
  const { tipo } = resolvePermissoes(tipoAcesso, permissoesAdmin);
  if (tipo !== "administrador") return false;
  const p = permissoesEfetivas(tipoAcesso, permissoesAdmin);
  return (
    p.crudColaboradores ||
    p.rhSalariosBonificacoes ||
    p.rhEscalaTrabalho ||
    p.rhCalendarioSobreaviso ||
    p.rhRecarregarSaldos ||
    p.rhRegistrarDespesaOutros
  );
}

export function canManageRecargas(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canRhRecarregarSaldos(tipoAcesso, permissoesAdmin);
}

export function canViewFinanceiro(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  return canRhSalariosBonificacoes(tipoAcesso, permissoesAdmin);
}

export { isMaster as isDesenvolvedor, isMaster, resolvePermissoes };

export function isAtribuidoMissaoDireta(
  colaboradorId: string | undefined,
  missao: Missao | null | undefined
): boolean {
  if (!colaboradorId || !missao?.colaboradorIds?.length) return false;
  return missao.colaboradorIds.includes(colaboradorId);
}

export function canIniciarMissao(
  colaboradorId: string | undefined,
  missao: Missao | null | undefined
): boolean {
  if (!missao || missao.status !== "planejada") return false;
  return isAtribuidoMissaoDireta(colaboradorId, missao);
}

export function canConcluirMissao(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  missao: Missao | null | undefined,
  chamado?: Chamado | null,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (!missao || !missaoIniciada(missao, chamado)) return false;
  if (canConcluirMissaoQualquer(tipoAcesso, permissoesAdmin)) return true;
  return isAtribuidoMissaoDireta(colaboradorId, missao);
}

export function isAtribuidoMissao(
  colaboradorId: string | undefined,
  chamado: Chamado | null | undefined
): boolean {
  if (!colaboradorId || !chamado?.colaboradorIds?.length) return false;
  return chamado.colaboradorIds.includes(colaboradorId);
}

export function canEncerrarChamado(
  tipoAcesso: TipoAcessoSistema | undefined | null,
  colaboradorId: string | undefined,
  chamado: Chamado | null | undefined,
  permissoesAdmin?: PermissoesAdmin | null
): boolean {
  if (!chamado || chamado.status !== "em_andamento") return false;
  if (canEncerrarChamadoQualquer(tipoAcesso, permissoesAdmin)) return true;
  return isAtribuidoMissao(colaboradorId, chamado);
}

export type { AcessoContext };
