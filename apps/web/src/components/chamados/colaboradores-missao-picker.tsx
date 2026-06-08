"use client";

import { Label } from "@/components/ui/label";
import type { Colaborador } from "@/lib/types";

export function ColaboradoresMissaoPicker({
  colaboradores,
  selected,
  onChange,
}: {
  colaboradores: Colaborador[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  }

  if (colaboradores.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum colaborador cadastrado. Adicione em Colaboradores.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <Label className="text-xs">Colaboradores</Label>
      <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
        {colaboradores.map((c) => {
          const semRg = !c.rg?.trim() || !c.rgOrgaoEmissor?.trim();
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${
                selected.includes(c.id)
                  ? "border-primary bg-primary/10"
                  : "border-border"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-input"
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{c.nome}</span>
                {c.rg && c.rgOrgaoEmissor ? (
                  <span className="mt-0.5 block text-muted-foreground">
                    RG: {c.rg} {c.rgOrgaoEmissor}
                  </span>
                ) : (
                  <span className="mt-0.5 block text-destructive">
                    RG não cadastrado
                  </span>
                )}
                {semRg && selected.includes(c.id) && (
                  <span className="mt-0.5 block text-destructive">
                    Complete o RG antes de atribuir
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
