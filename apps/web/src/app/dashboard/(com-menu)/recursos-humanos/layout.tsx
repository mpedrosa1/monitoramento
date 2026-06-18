"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { usePermissions } from "@/hooks/use-permissions";
import { RH_COLABORADORES_PATH } from "@/lib/dashboard-paths";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/dashboard/recursos-humanos", label: "Visão geral", exact: true },
  {
    href: RH_COLABORADORES_PATH,
    label: "Colaboradores",
    manageOnly: true,
  },
  {
    href: "/dashboard/recursos-humanos/escalas",
    label: "Escalas de trabalho",
    permission: "rhEscalaTrabalho" as const,
  },
  {
    href: "/dashboard/recursos-humanos/sobreaviso",
    label: "Calendário de sobreaviso",
    permission: "rhCalendarioSobreaviso" as const,
  },
  {
    href: "/dashboard/recursos-humanos/recargas-e-despesas",
    label: "Recargas e despesas",
    permission: "rhRecargasDespesas" as const,
  },
];

export default function RecursosHumanosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useMonitoring();
  const {
    canAccessRecursosHumanos,
    canCrudColaboradores,
    canRhEscalaTrabalho,
    canRhCalendarioSobreaviso,
    canRhRegistrarDespesaOutros,
    canManageRecargas,
    canViewFinanceiro,
    isLoading,
  } = usePermissions();

  useEffect(() => {
    if (!isLoading && !canAccessRecursosHumanos) {
      router.replace("/dashboard");
    }
  }, [canAccessRecursosHumanos, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessRecursosHumanos) {
    return null;
  }

  const apenasRecargasDespesas =
    (canRhRegistrarDespesaOutros || canManageRecargas) &&
    !canRhCalendarioSobreaviso &&
    !canViewFinanceiro &&
    !canRhEscalaTrabalho &&
    !canCrudColaboradores;

  const visibleTabs = tabs.filter((t) => {
    if (t.exact && apenasRecargasDespesas) return false;
    if (t.manageOnly && !canCrudColaboradores) return false;
    if (t.permission === "rhEscalaTrabalho") return canRhEscalaTrabalho;
    if (t.permission === "rhCalendarioSobreaviso") {
      return canRhCalendarioSobreaviso;
    }
    if (t.permission === "rhRecargasDespesas") {
      return canRhRegistrarDespesaOutros || canManageRecargas;
    }
    return true;
  });

  return (
    <>
      <DashboardHeader title="Recursos Humanos" socketStatus={status} />
      <div className="border-b border-border bg-background/80 px-6">
        <nav className="flex flex-wrap gap-1">
          {visibleTabs.map((t) => {
            const active = t.exact
              ? pathname === t.href
              : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "relative px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </>
  );
}
