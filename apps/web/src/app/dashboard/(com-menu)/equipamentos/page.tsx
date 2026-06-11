"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "@/lib/labels";
import { labelTipoSensor } from "@/lib/equipamento-sensor";
import {
  normalizeModbusPontos,
  serializeModbusPontos,
} from "@/lib/modbus-presets";
import {
  normalizeSnmpPontos,
  serializeSnmpPontos,
} from "@/lib/snmp-presets";
import { rotuloEquipamento } from "@/lib/unidade-form";
import type {
  Equipamento,
  ModbusPonto,
  SnmpPonto,
  TipoEquipamento,
  TipoMonitoramento,
} from "@/lib/types";
import { EquipamentoFormFields } from "@/components/equipamentos/equipamento-form-fields";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function snmpPontosCount(eq: Equipamento): number {
  const pontos = eq.config?.pontos;
  if (Array.isArray(pontos) && pontos.length > 0) {
    return pontos.filter((p) => !p.desabilitado).length;
  }
  const oids = eq.config?.oids;
  return Array.isArray(oids) ? oids.length : 0;
}

function modbusPontosCount(eq: Equipamento): number {
  const pontos = normalizeModbusPontos(eq.config);
  return pontos.filter((p) => !p.desabilitado).length;
}

function buildConfig(
  tipoMonitoramento: TipoMonitoramento,
  community: string,
  pontos: SnmpPonto[],
  pontosModbus: ModbusPonto[]
) {
  if (tipoMonitoramento === "snmp") {
    const cfg: NonNullable<Equipamento["config"]> = {
      pontos: serializeSnmpPontos(pontos),
    };
    const comm = community.trim();
    if (comm) cfg.community = comm;
    return cfg;
  }
  const modbus = serializeModbusPontos(pontosModbus);
  return {
    pontosModbus: modbus.pontosModbus,
    registradores: modbus.registradores.length
      ? modbus.registradores
      : [0],
  };
}

function equipamentoPayload(
  form: typeof emptyForm
): Pick<
  Equipamento,
  "nome" | "marca" | "tipoEquipamento" | "tipoSensor" | "tipoMonitoramento" | "config"
> {
  return {
    nome: form.nome,
    marca: form.marca,
    tipoEquipamento: form.tipoEquipamento,
    tipoSensor:
      form.tipoEquipamento === "sensor" ? form.tipoSensor || undefined : undefined,
    tipoMonitoramento: form.tipoMonitoramento,
    config: buildConfig(
      form.tipoMonitoramento,
      form.community,
      form.pontos,
      form.pontosModbus
    ),
  };
}

function cloneEquipamentoBody(eq: Equipamento) {
  const pontos = normalizeSnmpPontos(eq.config).map((p) => ({
    ...p,
    _localId: crypto.randomUUID(),
    estadosMulti: p.estadosMulti?.map((e) => ({
      ...e,
      _localId: crypto.randomUUID(),
    })),
  }));
  const pontosModbus = normalizeModbusPontos(eq.config).map((p) => ({
    ...p,
    _localId: crypto.randomUUID(),
    estadosMulti: p.estadosMulti?.map((e) => ({
      ...e,
      _localId: crypto.randomUUID(),
    })),
  }));
  const modelo = eq.nome?.trim();
  return {
    nome: modelo ? `${modelo} (cópia)` : "(cópia)",
    marca: eq.marca ?? "",
    tipoEquipamento: eq.tipoEquipamento,
    tipoSensor: eq.tipoSensor,
    tipoMonitoramento: eq.tipoMonitoramento,
    config: buildConfig(
      eq.tipoMonitoramento,
      eq.config?.community ?? "",
      pontos,
      pontosModbus
    ),
  };
}

const emptyForm = {
  nome: "",
  marca: "",
  tipoEquipamento: "sensor" as TipoEquipamento,
  tipoSensor: "",
  tipoMonitoramento: "modbus" as TipoMonitoramento,
  community: "",
  pontos: [] as SnmpPonto[],
  pontosModbus: [] as ModbusPonto[],
};

export default function EquipamentosPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Equipamento[]>([]);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Equipamento | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<Equipamento[] | null>("/api/v1/equipamentos");
    setList(asArray(data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(eq: Equipamento) {
    setEditing(eq);
    setEditForm({
      nome: eq.nome,
      marca: eq.marca ?? "",
      tipoEquipamento: eq.tipoEquipamento,
      tipoSensor: eq.tipoSensor ?? "",
      tipoMonitoramento: eq.tipoMonitoramento,
      community: eq.config?.community ?? "",
      pontos: normalizeSnmpPontos(eq.config),
      pontosModbus: normalizeModbusPontos(eq.config),
    });
    setEditOpen(true);
  }

  async function create() {
    await apiFetch<Equipamento>("/api/v1/equipamentos", {
      method: "POST",
      body: JSON.stringify(equipamentoPayload(createForm)),
    });
    setCreateForm(emptyForm);
    await load();
  }

  async function update() {
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch<Equipamento>(`/api/v1/equipamentos/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(equipamentoPayload(editForm)),
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function clone(eq: Equipamento) {
    setCloningId(eq.id);
    try {
      await apiFetch<Equipamento>("/api/v1/equipamentos", {
        method: "POST",
        body: JSON.stringify(cloneEquipamentoBody(eq)),
      });
      await load();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao clonar equipamento."
      );
    } finally {
      setCloningId(null);
    }
  }

  async function remove(eq: Equipamento) {
    const ok = window.confirm(
      `Excluir o equipamento "${rotuloEquipamento(eq)}"? Ele será desvinculado das unidades.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/equipamentos/${eq.id}`, {
        method: "DELETE",
      });
      if (editing?.id === eq.id) {
        setEditOpen(false);
        setEditing(null);
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao excluir";
      window.alert(
        msg === "Method Not Allowed"
          ? "A API em execução não suporta exclusão. Reinicie o backend (go run ./cmd/api ou scripts/run-api.ps1)."
          : msg
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <DashboardHeader title="Equipamentos" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Catálogo de equipamentos. O <strong>IP</strong> e o{" "}
          <strong>intervalo de coleta</strong> são definidos na unidade
          prisional, junto com a porta de cada equipamento vinculado. Clique em
          um item da lista para editar.
        </p>
        <div className="flex justify-end">
          <EntityFormDialog
            title="Novo equipamento"
            triggerLabel="Adicionar equipamento"
            onSubmit={create}
            contentClassName="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <EquipamentoFormFields
              marca={createForm.marca}
              onMarcaChange={(marca) =>
                setCreateForm((f) => ({ ...f, marca }))
              }
              modelo={createForm.nome}
              onModeloChange={(nome) =>
                setCreateForm((f) => ({ ...f, nome }))
              }
              tipoEquipamento={createForm.tipoEquipamento}
              onTipoEquipamentoChange={(tipoEquipamento) =>
                setCreateForm((f) => ({
                  ...f,
                  tipoEquipamento,
                  tipoSensor:
                    tipoEquipamento === "sensor" ? f.tipoSensor : "",
                }))
              }
              tipoSensor={createForm.tipoSensor}
              onTipoSensorChange={(tipoSensor) =>
                setCreateForm((f) => ({ ...f, tipoSensor: tipoSensor ?? "" }))
              }
              tipoMonitoramento={createForm.tipoMonitoramento}
              onTipoMonitoramentoChange={(tipoMonitoramento) =>
                setCreateForm((f) => ({ ...f, tipoMonitoramento }))
              }
              pontos={createForm.pontos}
              onPontosChange={(pontos) =>
                setCreateForm((f) => ({ ...f, pontos }))
              }
              pontosModbus={createForm.pontosModbus}
              onPontosModbusChange={(pontosModbus) =>
                setCreateForm((f) => ({ ...f, pontosModbus }))
              }
              onMonitoramentoChange={(t) => {
                if (t === "snmp") {
                  setCreateForm((f) => ({
                    ...f,
                    pontos: [],
                  }));
                }
                if (t === "modbus") {
                  setCreateForm((f) => ({
                    ...f,
                    pontosModbus: [],
                  }));
                }
              }}
            />
          </EntityFormDialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead className="w-[132px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum equipamento no catálogo.
                </TableCell>
              </TableRow>
            ) : (
              list.map((eq) => (
                <TableRow
                  key={eq.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => openEdit(eq)}
                >
                  <TableCell className="font-medium">{eq.marca || "—"}</TableCell>
                  <TableCell>{eq.nome || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant="outline">
                        {tipoEquipamentoLabel[eq.tipoEquipamento] ??
                          eq.tipoEquipamento}
                      </Badge>
                      {eq.tipoEquipamento === "sensor" && eq.tipoSensor ? (
                        <span className="text-xs text-muted-foreground">
                          {labelTipoSensor(eq.tipoSensor)}
                        </span>
                      ) : null}
                    </div>
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
                        {snmpPontosCount(eq)} ponto(s) SNMP
                      </span>
                    ) : eq.tipoMonitoramento === "modbus" ? (
                      <span className="text-sm">
                        {modbusPontosCount(eq)} ponto(s) Modbus
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className="flex justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(eq)}
                        aria-label={`Editar ${rotuloEquipamento(eq)}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => clone(eq)}
                        disabled={cloningId === eq.id}
                        aria-label={`Clonar ${rotuloEquipamento(eq)}`}
                        title="Clonar equipamento"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(eq)}
                        disabled={deleting}
                        aria-label={`Excluir ${rotuloEquipamento(eq)}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar equipamento
              {editing ? ` — ${rotuloEquipamento(editing)}` : ""}
            </DialogTitle>
          </DialogHeader>
          <EquipamentoFormFields
            marca={editForm.marca}
            onMarcaChange={(marca) =>
              setEditForm((f) => ({ ...f, marca }))
            }
            modelo={editForm.nome}
            onModeloChange={(nome) =>
              setEditForm((f) => ({ ...f, nome }))
            }
            tipoEquipamento={editForm.tipoEquipamento}
            onTipoEquipamentoChange={(tipoEquipamento) =>
              setEditForm((f) => ({
                ...f,
                tipoEquipamento,
                tipoSensor:
                  tipoEquipamento === "sensor" ? f.tipoSensor : "",
              }))
            }
            tipoSensor={editForm.tipoSensor}
            onTipoSensorChange={(tipoSensor) =>
              setEditForm((f) => ({ ...f, tipoSensor: tipoSensor ?? "" }))
            }
            tipoMonitoramento={editForm.tipoMonitoramento}
            onTipoMonitoramentoChange={(tipoMonitoramento) =>
              setEditForm((f) => ({ ...f, tipoMonitoramento }))
            }
            pontos={editForm.pontos}
            onPontosChange={(pontos) =>
              setEditForm((f) => ({ ...f, pontos }))
            }
            pontosModbus={editForm.pontosModbus}
            onPontosModbusChange={(pontosModbus) =>
              setEditForm((f) => ({ ...f, pontosModbus }))
            }
          />
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => editing && remove(editing)}
              disabled={deleting || !editing}
            >
              {deleting ? "Excluindo…" : "Excluir equipamento"}
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={update}
                disabled={
                  saving ||
                  !editForm.marca.trim() ||
                  !editForm.nome.trim()
                }
              >
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
