"use client";

import { useAuth } from "@/components/auth-provider";
import {
  resolveAuthUserPermissoes,
  resolveAuthUserTipoAcesso,
} from "@/lib/auth-session";
import {
  canAccessEquipamentos,
  canAccessRecursosHumanos,
  canManageData,
  canManageEquipamentosUnidade,
  canManageMissoes,
  canManageRecargas,
  canViewFinanceiro,
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
    canManageData: canManageData(tipoAcesso, permissoesAdmin),
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
    isDesenvolvedor: isDesenvolvedor(tipoAcesso, permissoesAdmin),
    isMaster: isMaster(tipoAcesso, permissoesAdmin),
  };
}
