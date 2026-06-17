"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RecargasDespesasPeriodoNav,
  RecargasDespesasPeriodoProvider,
} from "@/components/rh/recargas-despesas-periodo";
import { cn } from "@/lib/utils";

const subTabs = [
  {
    href: "/dashboard/recursos-humanos/recargas-e-despesas/visao-geral",
    label: "Visão geral",
    exact: true,
  },
  {
    href: "/dashboard/recursos-humanos/recargas-e-despesas",
    label: "Por colaborador",
    exact: true,
  },
];

export default function RecargasDespesasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RecargasDespesasPeriodoProvider>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Recargas e despesas</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Gerencie recargas e despesas por colaborador ou consulte o resumo de
            todos no período selecionado.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {subTabs.map((t) => {
              const active = t.exact
                ? pathname === t.href
                : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <RecargasDespesasPeriodoNav />
        </div>

        {children}
      </div>
    </RecargasDespesasPeriodoProvider>
  );
}
