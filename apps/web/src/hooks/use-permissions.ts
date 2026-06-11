"use client";

import { useAuth } from "@/components/auth-provider";
import { resolveAuthUserTipoAcesso } from "@/lib/auth-session";
import {
  canAccessEquipamentos,
  canManageData,
  canManageEquipamentosUnidade,
  canManageMissoes,
} from "@/lib/permissions";

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const tipoAcesso = resolveAuthUserTipoAcesso(user);

  return {
    isLoading,
    canManageData: canManageData(tipoAcesso),
    canManageMissoes: canManageMissoes(tipoAcesso),
    canManageEquipamentosUnidade: canManageEquipamentosUnidade(tipoAcesso),
    canAccessEquipamentos: canAccessEquipamentos(tipoAcesso),
  };
}
