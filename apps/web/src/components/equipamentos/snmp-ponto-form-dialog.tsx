"use client";

import { useEffect, useState } from "react";
import { snmpTipoDadoLabel } from "@/lib/labels";
import { SNMP_TIPOS_DADO, newSnmpPonto } from "@/lib/snmp-presets";
import type { SnmpPonto, SnmpTipoDado } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SnmpPontoFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SnmpPonto | null;
  onSave: (ponto: SnmpPonto) => void;
}) {
  const [draft, setDraft] = useState<SnmpPonto>(() => newSnmpPonto());
  const isEdit = !!initial?._localId;

  useEffect(() => {
    if (open) {
      setDraft(initial ? { ...initial } : newSnmpPonto());
    }
  }, [open, initial]);

  const isNumerico = (draft.tipoDado ?? "numerico") === "numerico";

  function patch(partial: Partial<SnmpPonto>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleSave() {
    const oid = draft.oid.trim().replace(/^\./, "");
    if (!oid) return;
    onSave({
      ...draft,
      oid,
      nome: draft.nome.trim() || oid,
      multiplicador: isNumerico ? (draft.multiplicador ?? 1) : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar ponto SNMP" : "Novo ponto SNMP"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label>Nome do ponto</Label>
            <Input
              value={draft.nome}
              onChange={(e) => patch({ nome: e.target.value })}
              placeholder="Ex.: Temperatura bateria"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>OID</Label>
            <Input
              value={draft.oid}
              onChange={(e) => patch({ oid: e.target.value })}
              placeholder="1.3.6.1.4.1.…"
              className="font-mono text-xs"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Tipo de dado</Label>
              <Select
                value={draft.tipoDado ?? "numerico"}
                onValueChange={(v) => {
                  const tipoDado = v as SnmpTipoDado;
                  patch({
                    tipoDado,
                    multiplicador:
                      tipoDado === "numerico"
                        ? (draft.multiplicador ?? 1)
                        : undefined,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  {SNMP_TIPOS_DADO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {snmpTipoDadoLabel[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isNumerico ? (
              <div className="grid gap-1.5">
                <Label>Multiplicador</Label>
                <Input
                  type="number"
                  step="any"
                  value={draft.multiplicador ?? 1}
                  onChange={(e) => {
                    const raw = e.target.value;
                    patch({
                      multiplicador:
                        raw === "" ? 1 : Number.parseFloat(raw) || 1,
                    });
                  }}
                  placeholder="1"
                />
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Unidade de engenharia</Label>
              <Input
                value={draft.unidade ?? ""}
                onChange={(e) => patch({ unidade: e.target.value })}
                placeholder="°C, V, %…"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={draft.descricao ?? ""}
                onChange={(e) => patch({ descricao: e.target.value })}
                placeholder="Notas sobre este ponto de leitura"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={!!draft.desabilitado}
                onChange={(e) => patch({ desabilitado: e.target.checked })}
                className="rounded border-input"
              />
              Ponto desabilitado
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!draft.oid.trim()}>
            Salvar ponto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
