"use client";

import { useAuth } from "@/components/auth-provider";
import {
  resolveAuthUserPermissoes,
  resolveAuthUserTipoAcesso,
} from "@/lib/auth-session";
import {
  canAccessEquipamentos,
  canAccessRecursosHumanos,
  canConcluirMissaoQualquer,
  canCrudChamados,
  canCrudColaboradores,
  canCrudEquipamentos,
  canCrudMissoes,
  canCrudUnidades,
  canCrudVeiculos,
  canEncerrarChamadoQualquer,
  canFrotaRegistrarMulta,
  canFrotaRegistrarPeriodo,
  canFrotaTrocarVeiculos,
  canFrotaValoresAlugueis,
  canFrotaVisualizarContratos,
  canManageData,
  canManageEquipamentosUnidade,
  canManageMissoes,
  canManageRecargas,
  canRhCalendarioSobreaviso,
  canRhEscalaTrabalho,
  canRhRegistrarDespesaOutros,
  canViewFinanceiro,
  canViewTodasMultasVeiculo,
  isDesenvolvedor,
  isMaster,
} from "@/lib/permissions";

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const tipoAcesso = resolveAuthUserTipoAcesso(user);
  const permissoesAdmin = resolveAuthUserPermissoes(user);

  return {
    isLoading,
    tipoAcesso,
    permissoesAdmin,
    isMaster: isMaster(tipoAcesso, permissoesAdmin),
    isDesenvolvedor: isDesenvolvedor(tipoAcesso, permissoesAdmin),
    canManageData: canManageData(tipoAcesso, permissoesAdmin),
    canCrudColaboradores: canCrudColaboradores(tipoAcesso, permissoesAdmin),
    canCrudUnidades: canCrudUnidades(tipoAcesso, permissoesAdmin),
    canCrudVeiculos: canCrudVeiculos(tipoAcesso, permissoesAdmin),
    canCrudEquipamentos: canCrudEquipamentos(tipoAcesso, permissoesAdmin),
    canCrudMissoes: canCrudMissoes(tipoAcesso, permissoesAdmin),
    canCrudChamados: canCrudChamados(tipoAcesso, permissoesAdmin),
    canConcluirMissaoQualquer: canConcluirMissaoQualquer(
      tipoAcesso,
      permissoesAdmin
    ),
    canEncerrarChamadoQualquer: canEncerrarChamadoQualquer(
      tipoAcesso,
      permissoesAdmin
    ),
    canFrotaValoresAlugueis: canFrotaValoresAlugueis(tipoAcesso, permissoesAdmin),
    canFrotaVisualizarContratos: canFrotaVisualizarContratos(
      tipoAcesso,
      permissoesAdmin
    ),
    canFrotaRegistrarPeriodo: canFrotaRegistrarPeriodo(
      tipoAcesso,
      permissoesAdmin
    ),
    canFrotaRegistrarMulta: canFrotaRegistrarMulta(tipoAcesso, permissoesAdmin),
    canFrotaTrocarVeiculos: canFrotaTrocarVeiculos(tipoAcesso, permissoesAdmin),
    canRhEscalaTrabalho: canRhEscalaTrabalho(tipoAcesso, permissoesAdmin),
    canRhCalendarioSobreaviso: canRhCalendarioSobreaviso(
      tipoAcesso,
      permissoesAdmin
    ),
    canRhRegistrarDespesaOutros: canRhRegistrarDespesaOutros(
      tipoAcesso,
      permissoesAdmin
    ),
    canManageMissoes: canManageMissoes(tipoAcesso, permissoesAdmin),
    canManageEquipamentosUnidade: canManageEquipamentosUnidade(
      tipoAcesso,
      permissoesAdmin
    ),
    canAccessEquipamentos: canAccessEquipamentos(tipoAcesso, permissoesAdmin),
    canAccessRecursosHumanos: canAccessRecursosHumanos(
      tipoAcesso,
      permissoesAdmin
    ),
    canManageRecargas: canManageRecargas(tipoAcesso, permissoesAdmin),
    canViewFinanceiro: canViewFinanceiro(tipoAcesso, permissoesAdmin),
    canViewTodasMultasVeiculo: canViewTodasMultasVeiculo(
      tipoAcesso,
      permissoesAdmin
    ),
  };
}
