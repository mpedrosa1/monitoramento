"use client";

import { tipoEquipamentoLabel, tipoMonitoramentoLabel } from "@/lib/labels";
import type {
  ModbusPonto,
  SnmpPonto,
  TipoEquipamento,
  TipoMonitoramento,
} from "@/lib/types";
import { ModbusPontosEditor } from "@/components/equipamentos/modbus-pontos-editor";
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
  tipoSensor,
  onTipoSensorChange,
  tipoMonitoramento,
  onTipoMonitoramentoChange,
  pontos,
  onPontosChange,
  pontosModbus,
  onPontosModbusChange,
  onMonitoramentoChange,
}: {
  marca: string;
  onMarcaChange: (v: string) => void;
  modelo: string;
  onModeloChange: (v: string) => void;
  tipoEquipamento: TipoEquipamento;
  onTipoEquipamentoChange: (v: TipoEquipamento) => void;
  tipoSensor: string;
  onTipoSensorChange: (v: string | undefined) => void;
  tipoMonitoramento: TipoMonitoramento;
  onTipoMonitoramentoChange: (v: TipoMonitoramento) => void;
  pontos: SnmpPonto[];
  onPontosChange: (p: SnmpPonto[]) => void;
  pontosModbus: ModbusPonto[];
  onPontosModbusChange: (p: ModbusPonto[]) => void;
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
            onValueChange={(v) => {
              const t = v as TipoEquipamento;
              onTipoEquipamentoChange(t);
              if (t !== "sensor") onTipoSensorChange(undefined);
            }}
          >
            <SelectTrigger className="w-full">
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
            <SelectTrigger className="w-full">
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
      {tipoEquipamento === "sensor" && (
        <div className="grid gap-2">
          <Label>Tipo de sensor</Label>
          <Input
            value={tipoSensor}
            onChange={(e) =>
              onTipoSensorChange(e.target.value || undefined)
            }
            placeholder="Ex.: Temperatura, Pressão, Luminosidade"
          />
        </div>
      )}
      {tipoMonitoramento === "snmp" && (
        <SnmpPontosEditor pontos={pontos} onChange={onPontosChange} />
      )}
      {tipoMonitoramento === "modbus" && (
        <ModbusPontosEditor
          pontos={pontosModbus}
          onChange={onPontosModbusChange}
        />
      )}
    </div>
  );
}
