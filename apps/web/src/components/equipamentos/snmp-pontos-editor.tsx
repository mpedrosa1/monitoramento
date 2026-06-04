"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { SnmpPonto } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SnmpPontoFormDialog } from "@/components/equipamentos/snmp-ponto-form-dialog";

export function SnmpPontosEditor({
  community,
  onCommunityChange,
  pontos,
  onChange,
}: {
  community: string;
  onCommunityChange: (v: string) => void;
  pontos: SnmpPonto[];
  onChange: (pontos: SnmpPonto[]) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SnmpPonto | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(ponto: SnmpPonto) {
    setEditing(ponto);
    setFormOpen(true);
  }

  function removePonto(localId: string) {
    onChange(pontos.filter((p) => p._localId !== localId));
  }

  function savePonto(ponto: SnmpPonto) {
    const id = ponto._localId;
    if (!id) return;
    const exists = pontos.some((p) => p._localId === id);
    if (exists) {
      onChange(pontos.map((p) => (p._localId === id ? ponto : p)));
    } else {
      onChange([...pontos, ponto]);
    }
    setEditing(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pontos de dados SNMP</p>
          <p className="text-xs text-muted-foreground">
            Adicione OIDs pelo formulário; a lista mostra nome e OID para
            localizar, editar ou remover.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {pontos.filter((p) => !p.desabilitado).length} ativo(s)
        </Badge>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="snmp-community">Community (SNMP v2c)</Label>
        <Input
          id="snmp-community"
          value={community}
          onChange={(e) => onCommunityChange(e.target.value)}
          placeholder="public"
          className="max-w-xs"
        />
      </div>

      <Separator />

      <Button type="button" variant="secondary" size="sm" onClick={openNew}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar ponto
      </Button>

      {pontos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum ponto configurado. Use &quot;Adicionar ponto&quot; para incluir
          OIDs.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {pontos.map((ponto, index) => (
            <li
              key={ponto._localId}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                ponto.desabilitado ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {ponto.nome.trim() || `Ponto ${index + 1}`}
                  {ponto.desabilitado && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (desabilitado)
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {ponto.oid}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(ponto)}
                  aria-label={`Editar ${ponto.nome || ponto.oid}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removePonto(ponto._localId!)}
                  aria-label={`Remover ${ponto.nome || ponto.oid}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SnmpPontoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSave={savePonto}
      />
    </div>
  );
}
