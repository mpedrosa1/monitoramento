"use client";

import { tipoEquipamentoLabel, tipoMonitoramentoLabel } from "@/lib/labels";
import type { SnmpPonto, TipoEquipamento, TipoMonitoramento } from "@/lib/types";
import { SnmpPontosEditor } from "@/components/equipamentos/snmp-pontos-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tiposEquipamento: TipoEquipamento[] = ["nobreak", "sensor"];
const tiposMonitoramento: TipoMonitoramento[] = ["modbus", "snmp"];

const tipoEquipamentoItems = tiposEquipamento.map((t) => ({
  value: t,
  label: tipoEquipamentoLabel[t],
}));

const tipoMonitoramentoItems = tiposMonitoramento.map((t) => ({
  value: t,
  label: tipoMonitoramentoLabel[t],
}));

export function EquipamentoFormFields({
  marca,
  onMarcaChange,
  modelo,
  onModeloChange,
  tipoEquipamento,
  onTipoEquipamentoChange,
  tipoMonitoramento,
  onTipoMonitoramentoChange,
  pontos,
  onPontosChange,
  onMonitoramentoChange,
}: {
  /** Marca do equipamento (campo `marca` na API). */
  marca: string;
  onMarcaChange: (v: string) => void;
  /** Modelo do equipamento (campo `nome` na API). */
  modelo: string;
  onModeloChange: (v: string) => void;
  tipoEquipamento: TipoEquipamento;
  onTipoEquipamentoChange: (v: TipoEquipamento) => void;
  tipoMonitoramento: TipoMonitoramento;
  onTipoMonitoramentoChange: (v: TipoMonitoramento) => void;
  pontos: SnmpPonto[];
  onPontosChange: (p: SnmpPonto[]) => void;
  onMonitoramentoChange?: (tipo: TipoMonitoramento) => void;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Marca</Label>
          <Input
            value={marca}
            onChange={(e) => onMarcaChange(e.target.value)}
            placeholder="Ex.: APC, Siemens"
          />
        </div>
        <div className="grid gap-2">
          <Label>Modelo</Label>
          <Input
            value={modelo}
            onChange={(e) => onModeloChange(e.target.value)}
            placeholder="Ex.: Smart-UPS 1500"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Tipo de equipamento</Label>
          <Select
            items={tipoEquipamentoItems}
            value={tipoEquipamento}
            onValueChange={(v) => onTipoEquipamentoChange(v as TipoEquipamento)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposEquipamento.map((t) => (
                <SelectItem key={t} value={t}>
                  {tipoEquipamentoLabel[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Protocolo</Label>
          <Select
            items={tipoMonitoramentoItems}
            value={tipoMonitoramento}
            onValueChange={(v) => {
              const t = v as TipoMonitoramento;
              onTipoMonitoramentoChange(t);
              onMonitoramentoChange?.(t);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposMonitoramento.map((t) => (
                <SelectItem key={t} value={t}>
                  {tipoMonitoramentoLabel[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {tipoMonitoramento === "snmp" && (
        <SnmpPontosEditor pontos={pontos} onChange={onPontosChange} />
      )}
    </div>
  );
}
