"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "@/lib/labels";
import {
  normalizeSnmpPontos,
  serializeSnmpPontos,
} from "@/lib/snmp-presets";
import type {
  Equipamento,
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

function buildConfig(
  tipoMonitoramento: TipoMonitoramento,
  community: string,
  pontos: SnmpPonto[]
) {
  if (tipoMonitoramento === "snmp") {
    return {
      community: community.trim() || "public",
      pontos: serializeSnmpPontos(pontos),
    };
  }
  return { slaveId: 1, registradores: [0] };
}

const emptyForm = {
  nome: "",
  marca: "",
  tipoEquipamento: "sensor" as TipoEquipamento,
  tipoMonitoramento: "modbus" as TipoMonitoramento,
  community: "public",
  pontos: [] as SnmpPonto[],
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
      tipoMonitoramento: eq.tipoMonitoramento,
      community: eq.config?.community ?? "public",
      pontos: normalizeSnmpPontos(eq.config),
    });
    setEditOpen(true);
  }

  async function create() {
    await apiFetch<Equipamento>("/api/v1/equipamentos", {
      method: "POST",
      body: JSON.stringify({
        nome: createForm.nome,
        marca: createForm.marca,
        tipoEquipamento: createForm.tipoEquipamento,
        tipoMonitoramento: createForm.tipoMonitoramento,
        config: buildConfig(
          createForm.tipoMonitoramento,
          createForm.community,
          createForm.pontos
        ),
      }),
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
        body: JSON.stringify({
          nome: editForm.nome,
          marca: editForm.marca,
          tipoEquipamento: editForm.tipoEquipamento,
          tipoMonitoramento: editForm.tipoMonitoramento,
          config: buildConfig(
            editForm.tipoMonitoramento,
            editForm.community,
            editForm.pontos
          ),
        }),
      });
      setEditOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(eq: Equipamento) {
    const ok = window.confirm(
      `Excluir o equipamento "${eq.nome}"? Ele será desvinculado das unidades.`
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
              nome={createForm.nome}
              onNomeChange={(nome) =>
                setCreateForm((f) => ({ ...f, nome }))
              }
              marca={createForm.marca}
              onMarcaChange={(marca) =>
                setCreateForm((f) => ({ ...f, marca }))
              }
              tipoEquipamento={createForm.tipoEquipamento}
              onTipoEquipamentoChange={(tipoEquipamento) =>
                setCreateForm((f) => ({ ...f, tipoEquipamento }))
              }
              tipoMonitoramento={createForm.tipoMonitoramento}
              onTipoMonitoramentoChange={(tipoMonitoramento) =>
                setCreateForm((f) => ({ ...f, tipoMonitoramento }))
              }
              community={createForm.community}
              onCommunityChange={(community) =>
                setCreateForm((f) => ({ ...f, community }))
              }
              pontos={createForm.pontos}
              onPontosChange={(pontos) =>
                setCreateForm((f) => ({ ...f, pontos }))
              }
              onMonitoramentoChange={(t) => {
                if (t === "snmp") {
                  setCreateForm((f) => ({
                    ...f,
                    community: "public",
                    pontos: [],
                  }));
                }
              }}
            />
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
              <TableHead className="w-[100px] text-right">Ações</TableHead>
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
                        aria-label={`Editar ${eq.nome}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(eq)}
                        disabled={deleting}
                        aria-label={`Excluir ${eq.nome}`}
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
              {editing ? ` — ${editing.nome}` : ""}
            </DialogTitle>
          </DialogHeader>
          <EquipamentoFormFields
            nome={editForm.nome}
            onNomeChange={(nome) =>
              setEditForm((f) => ({ ...f, nome }))
            }
            marca={editForm.marca}
            onMarcaChange={(marca) =>
              setEditForm((f) => ({ ...f, marca }))
            }
            tipoEquipamento={editForm.tipoEquipamento}
            onTipoEquipamentoChange={(tipoEquipamento) =>
              setEditForm((f) => ({ ...f, tipoEquipamento }))
            }
            tipoMonitoramento={editForm.tipoMonitoramento}
            onTipoMonitoramentoChange={(tipoMonitoramento) =>
              setEditForm((f) => ({ ...f, tipoMonitoramento }))
            }
            community={editForm.community}
            onCommunityChange={(community) =>
              setEditForm((f) => ({ ...f, community }))
            }
            pontos={editForm.pontos}
            onPontosChange={(pontos) =>
              setEditForm((f) => ({ ...f, pontos }))
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
                disabled={saving || !editForm.nome.trim()}
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
