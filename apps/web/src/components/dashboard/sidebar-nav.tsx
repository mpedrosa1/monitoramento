"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Car,
  Cpu,
  Headphones,
  Home,
  MapPinned,
  Shield,
  Users,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/dashboard",
    label: "Início",
    icon: Home,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/unidades",
    label: "Unidades Prisionais",
    icon: Building2,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/equipamentos",
    label: "Equipamentos",
    icon: Cpu,
    equipamentosOnly: true,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/colaboradores",
    label: "Colaboradores",
    icon: Users,
    equipamentosOnly: false,
    managePadraoOnly: true,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/recursos-humanos",
    label: "Recursos Humanos",
    icon: BriefcaseBusiness,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: true,
  },
  {
    href: "/dashboard/veiculos",
    label: "Veículos",
    icon: Car,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/chamados",
    label: "Chamados",
    icon: Headphones,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
  {
    href: "/dashboard/missoes",
    label: "Missões",
    icon: MapPinned,
    equipamentosOnly: false,
    managePadraoOnly: false,
    recursosHumanosOnly: false,
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const {
    canAccessEquipamentos,
    canManageData,
    canAccessRecursosHumanos,
  } = usePermissions();

  const visibleItems = items.filter(
    (item) =>
      (!item.equipamentosOnly || canAccessEquipamentos) &&
      (!item.managePadraoOnly || canManageData) &&
      (!item.recursosHumanosOnly || canAccessRecursosHumanos)
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <p className="text-sm font-semibold tracking-tight">MMRTEC</p>
          <p className="text-xs text-muted-foreground">Monitoramento</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
