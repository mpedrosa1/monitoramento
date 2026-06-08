"use client";

import { useAuth } from "@/components/auth-provider";
import {
  canAccessEquipamentos,
  canManageData,
  canManageMissoes,
} from "@/lib/permissions";

export function usePermissions() {
  const { user, isLoading } = useAuth();
  const tipoAcesso = user?.tipoAcesso;

  return {
    isLoading,
    canManageData: canManageData(tipoAcesso),
    canManageMissoes: canManageMissoes(tipoAcesso),
    canAccessEquipamentos: canAccessEquipamentos(tipoAcesso),
  };
}
