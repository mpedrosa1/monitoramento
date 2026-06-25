"use client";

import { LayoutGrid, Map, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export type PainelMonitoramentoTab = "equipamentos" | "mapa" | "logs";

export function PainelMonitoramentoSubheader({
  activeTab,
  onTabChange,
}: {
  activeTab: PainelMonitoramentoTab;
  onTabChange: (tab: PainelMonitoramentoTab) => void;
}) {
  const tabs: {
    id: PainelMonitoramentoTab;
    label: string;
    icon: typeof LayoutGrid;
  }[] = [
    { id: "equipamentos", label: "Equipamentos", icon: LayoutGrid },
    { id: "mapa", label: "Mapa", icon: Map },
    { id: "logs", label: "Registros", icon: ScrollText },
  ];

  return (
    <div className="flex h-11 shrink-0 items-end gap-1 border-b border-border bg-background/80 px-4 backdrop-blur">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
