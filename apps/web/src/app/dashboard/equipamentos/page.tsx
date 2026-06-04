"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "@/lib/labels";
import {
  SNMP_MIB2_PRESETS,
  newSnmpPonto,
  serializeSnmpPontos,
} from "@/lib/snmp-presets";
import type { Equipamento, SnmpPonto, TipoEquipamento, TipoMonitoramento } from "@/lib/types";
import { SnmpPontosEditor } from "@/components/equipamentos/snmp-pontos-editor";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const tiposEquipamento: TipoEquipamento[] = ["nobreak", "sensor"];
const tiposMonitoramento: TipoMonitoramento[] = ["modbus", "snmp"];

function snmpPontosCount(eq: Equipamento): number {
  if (eq.config?.pontos?.length) {
    return eq.config.pontos.filter((p) => !p.desabilitado).length;
  }
  return eq.config?.oids?.length ?? 0;
}

export default function EquipamentosPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Equipamento[]>([]);
  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [tipoEquipamento, setTipoEquipamento] =
    useState<TipoEquipamento>("sensor");
  const [tipoMonitoramento, setTipoMonitoramento] =
    useState<TipoMonitoramento>("modbus");
  const [community, setCommunity] = useState("public");
  const [pontos, setPontos] = useState<SnmpPonto[]>(() => [
    newSnmpPonto(SNMP_MIB2_PRESETS[1]),
  ]);

  const load = useCallback(async () => {
    setList(await apiFetch<Equipamento[]>("/api/v1/equipamentos"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetSnmpDefaults() {
    setCommunity("public");
    setPontos([newSnmpPonto(SNMP_MIB2_PRESETS[1])]);
  }

  async function create() {
    const payload: Record<string, unknown> = {
      nome,
      marca,
      tipoEquipamento,
      tipoMonitoramento,
    };

    if (tipoMonitoramento === "snmp") {
      const serialized = serializeSnmpPontos(pontos);
      payload.config = {
        community: community.trim() || "public",
        pontos: serialized.length ? serialized : [SNMP_MIB2_PRESETS[1]],
      };
    } else {
      payload.config = { slaveId: 1, registradores: [0] };
    }

    await apiFetch<Equipamento>("/api/v1/equipamentos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setNome("");
    setMarca("");
    resetSnmpDefaults();
    await load();
  }

  return (
    <>
      <DashboardHeader title="Equipamentos" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Catálogo de equipamentos. O <strong>IP</strong> e o{" "}
          <strong>intervalo de coleta</strong> são definidos na unidade
          prisional, junto com a porta de cada equipamento vinculado.
        </p>
        <div className="flex justify-end">
          <EntityFormDialog
            title="Novo equipamento"
            triggerLabel="Adicionar equipamento"
            onSubmit={create}
            contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Marca</Label>
                  <Input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Ex.: APC, Siemens"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Tipo de equipamento</Label>
                  <Select
                    value={tipoEquipamento}
                    onValueChange={(v) =>
                      setTipoEquipamento(v as TipoEquipamento)
                    }
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
                  <Label>Tipo de monitoramento</Label>
                  <Select
                    value={tipoMonitoramento}
                    onValueChange={(v) => {
                      const t = v as TipoMonitoramento;
                      setTipoMonitoramento(t);
                      if (t === "snmp") resetSnmpDefaults();
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
                <SnmpPontosEditor
                  community={community}
                  onCommunityChange={setCommunity}
                  pontos={pontos}
                  onChange={setPontos}
                />
              )}
            </div>
          </EntityFormDialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Monitoramento</TableHead>
              <TableHead>Pontos SNMP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum equipamento no catálogo.
                </TableCell>
              </TableRow>
            ) : (
              list.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell className="font-medium">{eq.nome}</TableCell>
                  <TableCell>{eq.marca || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoEquipamentoLabel[eq.tipoEquipamento] ??
                        eq.tipoEquipamento}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {tipoMonitoramentoLabel[eq.tipoMonitoramento] ??
                        eq.tipoMonitoramento}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {eq.tipoMonitoramento === "snmp" ? (
                      <span className="text-sm">
                        {snmpPontosCount(eq)} ponto(s)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
