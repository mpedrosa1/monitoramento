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

const tipoDadoItems = SNMP_TIPOS_DADO.map((t) => ({
  value: t,
  label: snmpTipoDadoLabel[t],
}));

const MULT_INPUT_DEFAULT = "1";

function multiplicadorToInput(value: number | undefined): string {
  if (value == null) return MULT_INPUT_DEFAULT;
  return String(value);
}

function parseMultiplicadorInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "" || trimmed === "." || trimmed === "-") return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isValidMultiplicadorInput(raw: string): boolean {
  return /^-?\d*[,.]?\d*$/.test(raw);
}

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
  const [multInput, setMultInput] = useState(MULT_INPUT_DEFAULT);
  const isEdit = !!initial?._localId;

  useEffect(() => {
    if (open) {
      const next = initial ? { ...initial } : newSnmpPonto();
      setDraft(next);
      setMultInput(
        next.tipoDado === "numerico" || !next.tipoDado
          ? multiplicadorToInput(next.multiplicador)
          : MULT_INPUT_DEFAULT
      );
    }
  }, [open, initial]);

  const isNumerico = (draft.tipoDado ?? "numerico") === "numerico";

  function patch(partial: Partial<SnmpPonto>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleSave() {
    const oid = draft.oid.trim().replace(/^\./, "");
    if (!oid) return;
    const multParsed = isNumerico ? parseMultiplicadorInput(multInput) : null;
    if (isNumerico && multParsed == null) return;
    onSave({
      ...draft,
      oid,
      nome: draft.nome.trim() || oid,
      multiplicador: isNumerico ? (multParsed ?? 1) : undefined,
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
                items={tipoDadoItems}
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
                  if (tipoDado === "numerico") {
                    setMultInput(multiplicadorToInput(draft.multiplicador));
                  }
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
                  type="text"
                  inputMode="decimal"
                  value={multInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (!isValidMultiplicadorInput(raw)) return;
                    setMultInput(raw);
                    const parsed = parseMultiplicadorInput(raw);
                    if (parsed != null) {
                      patch({ multiplicador: parsed });
                    }
                  }}
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
          <Button
            onClick={handleSave}
            disabled={
              !draft.oid.trim() ||
              (isNumerico && parseMultiplicadorInput(multInput) == null)
            }
          >
            Salvar ponto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
