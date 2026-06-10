"use client";

import { useState } from "react";
import { FlaskConical, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { ModbusPonto } from "@/lib/types";
import {
  modbusRegistroComTipoDado,
  modbusRegistroLabel,
  modbusTipoDadoLabel,
} from "@/lib/modbus-presets";
import { ModbusPontoFormDialog } from "@/components/equipamentos/modbus-ponto-form-dialog";
import { ModbusTestOffsetDialog } from "@/components/equipamentos/modbus-test-offset-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function reorderPontos(
  pontos: ModbusPonto[],
  fromId: string,
  toId: string
): ModbusPonto[] {
  const fromIndex = pontos.findIndex((p) => p._localId === fromId);
  const toIndex = pontos.findIndex((p) => p._localId === toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return pontos;
  const next = [...pontos];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ModbusPontosEditor({
  pontos,
  onChange,
}: {
  pontos: ModbusPonto[];
  onChange: (pontos: ModbusPonto[]) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModbusPonto | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [testingPonto, setTestingPonto] = useState<ModbusPonto | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(ponto: ModbusPonto) {
    setEditing(ponto);
    setFormOpen(true);
  }

  function openTest(ponto: ModbusPonto) {
    setTestingPonto(ponto);
    setTestOpen(true);
  }

  function removePonto(localId: string) {
    onChange(pontos.filter((p) => p._localId !== localId));
  }

  function savePonto(ponto: ModbusPonto) {
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

  function handleDragStart(localId: string, e: React.DragEvent) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", localId);
    setDraggingId(localId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDrop(targetId: string, e: React.DragEvent) {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain");
    if (!fromId || fromId === targetId) return;
    onChange(reorderPontos(pontos, fromId, targetId));
    setDraggingId(null);
    setDragOverId(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Pontos de dados Modbus</p>
          <p className="text-xs text-muted-foreground">
            Adicione offsets pelo formulário; arraste para definir a ordem de
            exibição e coleta.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {pontos.filter((p) => !p.desabilitado).length} ativo(s)
        </Badge>
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={openNew}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar ponto
      </Button>

      {pontos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum ponto configurado. Use &quot;Adicionar ponto&quot; para incluir
          offsets.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {pontos.map((ponto, index) => {
            const localId = ponto._localId!;
            const isDragging = draggingId === localId;
            const isDragOver =
              dragOverId === localId && draggingId !== localId;

            return (
              <li
                key={localId}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverId(localId);
                }}
                onDragLeave={(e) => {
                  if (
                    e.currentTarget.contains(e.relatedTarget as Node | null)
                  ) {
                    return;
                  }
                  setDragOverId((id) => (id === localId ? null : id));
                }}
                onDrop={(e) => handleDrop(localId, e)}
                className={cn(
                  "flex items-center gap-2 px-2 py-2.5 transition-colors sm:gap-3 sm:px-3",
                  ponto.desabilitado && "opacity-60",
                  isDragging && "opacity-40",
                  isDragOver && "bg-accent/50"
                )}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(localId, e)}
                  onDragEnd={handleDragEnd}
                  className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  aria-label={`Reordenar ${ponto.nome.trim() || `ponto ${index + 1}`}`}
                  title="Arrastar para reordenar"
                >
                  <GripVertical className="h-4 w-4" />
                </button>

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
                    Offset {ponto.offset}
                    {` · ${modbusRegistroLabel[ponto.registro ?? "holding_register"]}`}
                    {modbusRegistroComTipoDado(
                      ponto.registro ?? "holding_register"
                    ) && ponto.tipoDado
                      ? ` · ${modbusTipoDadoLabel[ponto.tipoDado]}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openTest(ponto)}
                    aria-label={`Testar offset ${ponto.nome || ponto.offset}`}
                    title="Testar offset"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(ponto)}
                    aria-label={`Editar ${ponto.nome || `offset ${ponto.offset}`}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePonto(localId)}
                    aria-label={`Remover ${ponto.nome || `offset ${ponto.offset}`}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ModbusPontoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSave={savePonto}
      />

      <ModbusTestOffsetDialog
        open={testOpen}
        onOpenChange={setTestOpen}
        ponto={testingPonto}
      />
    </div>
  );
}
