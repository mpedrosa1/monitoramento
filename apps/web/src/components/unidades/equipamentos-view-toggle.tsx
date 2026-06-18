"use client";

import { LayoutGrid, List } from "lucide-react";
import type {
  EquipamentosFiltro,
  EquipamentosLayout,
} from "@/lib/equipamentos-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EquipamentosViewToggle({
  value,
  onChange,
  className,
}: {
  value: EquipamentosLayout;
  onChange: (layout: EquipamentosLayout) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border p-0.5",
        className
      )}
      role="group"
      aria-label="Modo de exibição dos equipamentos"
    >
      <Button
        type="button"
        variant={value === "grade" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => onChange("grade")}
        aria-label="Exibir em grade"
        aria-pressed={value === "grade"}
        title="Grade"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant={value === "lista" ? "secondary" : "ghost"}
        size="icon-sm"
        onClick={() => onChange("lista")}
        aria-label="Exibir em lista"
        aria-pressed={value === "lista"}
        title="Lista"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

const FILTRO_OPCOES: { id: EquipamentosFiltro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "nobreaks", label: "Nobreaks" },
  { id: "maquinas", label: "Máquinas" },
];

export function EquipamentosFiltroToggle({
  value,
  onChange,
  className,
}: {
  value: EquipamentosFiltro;
  onChange: (filtro: EquipamentosFiltro) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border p-0.5",
        className
      )}
      role="group"
      aria-label="Filtrar equipamentos"
    >
      {FILTRO_OPCOES.map(({ id, label }) => (
        <Button
          key={id}
          type="button"
          variant={value === id ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
