"use client";

import { useEffect, useState } from "react";
import {
  isModbusTipoDadoNumerico,
  modbusRegistroComEstados,
  modbusRegistroComTipoDado,
  modbusRegistroLabel,
  modbusTipoDadoLabel,
  MODBUS_REGISTROS,
  MODBUS_TIPOS_DADO,
  newModbusPonto,
} from "@/lib/modbus-presets";
import type { ModbusPonto, ModbusRegistro, ModbusTipoDado } from "@/lib/types";
import { SnmpMultiEstadoEditor } from "@/components/equipamentos/snmp-multi-estado-editor";
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

const registroItems = MODBUS_REGISTROS.map((r) => ({
  value: r,
  label: modbusRegistroLabel[r],
}));

const tipoDadoItems = MODBUS_TIPOS_DADO.map((t) => ({
  value: t,
  label: modbusTipoDadoLabel[t],
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

function parseOffsetInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) return null;
  return n;
}

export function ModbusPontoFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ModbusPonto | null;
  onSave: (ponto: ModbusPonto) => void;
}) {
  const [draft, setDraft] = useState<ModbusPonto>(() => newModbusPonto());
  const [multInput, setMultInput] = useState(MULT_INPUT_DEFAULT);
  const [offsetInput, setOffsetInput] = useState("0");
  const isEdit = !!initial?._localId;

  useEffect(() => {
    if (open) {
      const next = initial ? { ...initial } : newModbusPonto();
      setDraft(next);
      setOffsetInput(String(next.offset ?? 0));
      setMultInput(
        isModbusTipoDadoNumerico(next.tipoDado)
          ? multiplicadorToInput(next.multiplicador)
          : MULT_INPUT_DEFAULT
      );
    }
  }, [open, initial]);

  const registro = draft.registro ?? "holding_register";
  const mostraTipoDado = modbusRegistroComTipoDado(registro);
  const mostraEstados = modbusRegistroComEstados(registro);
  const isNumerico = isModbusTipoDadoNumerico(draft.tipoDado);
  const offsetParsed = parseOffsetInput(offsetInput);

  function patch(partial: Partial<ModbusPonto>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function handleRegistroChange(value: ModbusRegistro) {
    if (modbusRegistroComEstados(value)) {
      patch({
        registro: value,
        tipoDado: undefined,
        multiplicador: undefined,
        estadosMulti: draft.estadosMulti ?? [],
      });
      return;
    }

    if (modbusRegistroComTipoDado(value)) {
      const tipoDado = draft.tipoDado ?? "uint16";
      patch({
        registro: value,
        tipoDado,
        estadosMulti: undefined,
        multiplicador: isModbusTipoDadoNumerico(tipoDado)
          ? (draft.multiplicador ?? 1)
          : undefined,
      });
      if (isModbusTipoDadoNumerico(tipoDado)) {
        setMultInput(multiplicadorToInput(draft.multiplicador));
      }
      return;
    }

    patch({
      registro: value,
      tipoDado: undefined,
      multiplicador: undefined,
      estadosMulti: undefined,
    });
  }

  function handleTipoDadoChange(value: ModbusTipoDado) {
    patch({
      tipoDado: value,
      multiplicador: isModbusTipoDadoNumerico(value)
        ? (draft.multiplicador ?? 1)
        : undefined,
    });
    if (isModbusTipoDadoNumerico(value)) {
      setMultInput(multiplicadorToInput(draft.multiplicador));
    }
  }

  function handleSave() {
    if (offsetParsed == null) return;
    const multParsed = isNumerico ? parseMultiplicadorInput(multInput) : null;
    if (isNumerico && multParsed == null) return;
    onSave({
      ...draft,
      offset: offsetParsed,
      registro,
      nome: draft.nome.trim() || `Offset ${offsetParsed}`,
      tipoDado: mostraTipoDado ? draft.tipoDado ?? "uint16" : undefined,
      multiplicador: isNumerico ? (multParsed ?? 1) : undefined,
      estadosMulti: mostraEstados ? draft.estadosMulti ?? [] : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[60] max-h-[92vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ponto Modbus" : "Novo ponto Modbus"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label>Nome do ponto</Label>
            <Input
              value={draft.nome}
              onChange={(e) => patch({ nome: e.target.value })}
              placeholder="Ex.: Temperatura ambiente"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Offset</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={offsetInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^\d*$/.test(raw)) return;
                  setOffsetInput(raw);
                  const parsed = parseOffsetInput(raw);
                  if (parsed != null) patch({ offset: parsed });
                }}
                placeholder="0"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Registro</Label>
              <Select
                items={registroItems}
                value={registro}
                onValueChange={(v) => handleRegistroChange(v as ModbusRegistro)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {MODBUS_REGISTROS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {modbusRegistroLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {mostraTipoDado ? (
              <div className="grid gap-1.5">
                <Label>Tipo de dado</Label>
                <Select
                  items={tipoDadoItems}
                  value={draft.tipoDado ?? "uint16"}
                  onValueChange={(v) =>
                    handleTipoDadoChange(v as ModbusTipoDado)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {MODBUS_TIPOS_DADO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {modbusTipoDadoLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
            {mostraTipoDado && isNumerico ? (
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
            {mostraEstados && (
              <SnmpMultiEstadoEditor
                estados={draft.estadosMulti ?? []}
                onChange={(estadosMulti) => patch({ estadosMulti })}
                descricao="Informe o valor lido no offset (ex.: 0, 1, true, false), o texto a exibir e a cor."
              />
            )}
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Sufixo</Label>
              <Input
                value={draft.unidade ?? ""}
                onChange={(e) => patch({ unidade: e.target.value })}
                placeholder="Ex.: °C, %, V"
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
              offsetParsed == null ||
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
