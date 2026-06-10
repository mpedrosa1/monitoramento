"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  newSnmpMultiEstadoItem,
  SNMP_MULTI_ESTADO_COR_PADRAO,
} from "@/lib/snmp-presets";
import type { SnmpMultiEstadoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SnmpMultiEstadoEditor({
  estados,
  onChange,
  descricao = "Informe o valor retornado pelo OID, o texto a exibir e a cor.",
}: {
  estados: SnmpMultiEstadoItem[];
  onChange: (estados: SnmpMultiEstadoItem[]) => void;
  descricao?: string;
}) {
  function patchItem(localId: string, partial: Partial<SnmpMultiEstadoItem>) {
    onChange(
      estados.map((e) =>
        e._localId === localId ? { ...e, ...partial } : e
      )
    );
  }

  function removeItem(localId: string) {
    onChange(estados.filter((e) => e._localId !== localId));
  }

  function addItem() {
    onChange([...estados, newSnmpMultiEstadoItem()]);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
      <div>
        <p className="text-sm font-medium">Estados (chave → exibição)</p>
        <p className="text-xs text-muted-foreground">
          {descricao}
        </p>
      </div>

      {estados.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum estado configurado.
        </p>
      ) : (
        <ul className="space-y-2">
          {estados.map((estado) => (
            <li
              key={estado._localId}
              className="grid gap-2 rounded-md border border-border bg-card p-2 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <div className="grid gap-1">
                <Label className="text-xs">Chave</Label>
                <Input
                  value={estado.chave}
                  onChange={(e) =>
                    patchItem(estado._localId!, { chave: e.target.value })
                  }
                  placeholder="Ex.: 1"
                  className="h-8"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Exibição</Label>
                <Input
                  value={estado.exibicao}
                  onChange={(e) =>
                    patchItem(estado._localId!, { exibicao: e.target.value })
                  }
                  placeholder="Ex.: Normal"
                  className="h-8"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Cor</Label>
                <input
                  type="color"
                  value={estado.cor || SNMP_MULTI_ESTADO_COR_PADRAO}
                  onChange={(e) =>
                    patchItem(estado._localId!, { cor: e.target.value })
                  }
                  className="h-8 w-full min-w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                  title="Cor de exibição"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(estado._localId!)}
                  aria-label="Remover estado"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar estado
      </Button>
    </div>
  );
}
