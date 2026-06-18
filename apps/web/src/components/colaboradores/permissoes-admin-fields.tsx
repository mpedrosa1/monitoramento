"use client";

import type { PermissoesAdmin } from "@/lib/types";
import {
  PERMISSOES_ADMIN_GRUPOS,
  togglePermissaoAdminDetalhada,
  type PermissaoAdminDetalhadaKey,
} from "@/lib/permissoes-admin";
import { Separator } from "@/components/ui/separator";

type PermissoesAdminFieldsProps = {
  value: PermissoesAdmin;
  onChange: (permissoes: PermissoesAdmin) => void;
  disabled?: boolean;
  /** Se definido, só permite marcar permissões que o editor também possui. */
  editorPermissoes?: PermissoesAdmin | null;
};

export function PermissoesAdminFields({
  value,
  onChange,
  disabled = false,
  editorPermissoes,
}: PermissoesAdminFieldsProps) {
  return (
    <div className="grid gap-4 rounded-lg border border-border p-4">
      {PERMISSOES_ADMIN_GRUPOS.map((grupo, index) => (
        <div key={grupo.titulo} className="grid gap-3">
          {index > 0 ? <Separator /> : null}
          <p className="text-sm font-semibold tracking-tight">{grupo.titulo}</p>
          <div className="grid gap-1">
            {grupo.itens.map((item) => {
              const itemDisabled =
                disabled ||
                (editorPermissoes != null &&
                  !editorPermissoes[item.key as PermissaoAdminDetalhadaKey]);
              return (
              <label
                key={item.key}
                className={`flex items-start gap-3 rounded-md p-2 ${
                  itemDisabled
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                  checked={Boolean(value[item.key])}
                  disabled={itemDisabled}
                  onChange={(e) =>
                    onChange(
                      togglePermissaoAdminDetalhada(
                        value,
                        item.key,
                        e.target.checked
                      )
                    )
                  }
                />
                <span className="text-sm leading-snug">{item.label}</span>
              </label>
            );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
