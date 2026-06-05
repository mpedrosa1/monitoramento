"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { Chamado, ChamadoStatus, Unidade } from "@/lib/types";
import { chamadoStatusLabel } from "@/lib/labels";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { EntityFormDialog } from "@/components/crud/entity-form-dialog";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusOptions: ChamadoStatus[] = [
  "aberto",
  "em_andamento",
  "encerrado",
];

export default function ChamadosPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [chamadoStatus, setChamadoStatus] = useState<ChamadoStatus>("aberto");
  const [unidadeId, setUnidadeId] = useState("");

  const load = useCallback(async () => {
    const [ch, uns] = await Promise.all([
      apiFetch<Chamado[] | null>("/api/v1/chamados"),
      apiFetch<Unidade[] | null>("/api/v1/unidades"),
    ]);
    setList(asArray(ch));
    setUnidades(asArray(uns));
    if (!unidadeId && uns[0]) setUnidadeId(uns[0].id);
  }, [unidadeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    await apiFetch<Chamado>("/api/v1/chamados", {
      method: "POST",
      body: JSON.stringify({
        titulo,
        descricao,
        status: chamadoStatus,
        unidadeId,
      }),
    });
    setTitulo("");
    setDescricao("");
    await load();
  }

  return (
    <>
      <DashboardHeader title="Chamados" socketStatus={socketStatus} />
      <div className="space-y-4 p-6">
        <div className="flex justify-end">
          <EntityFormDialog
            title="Novo chamado"
            triggerLabel="Abrir chamado"
            onSubmit={create}
          >
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Título</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={chamadoStatus}
                  onValueChange={(v) => setChamadoStatus(v as ChamadoStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {chamadoStatusLabel[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Select
                  value={unidadeId}
                  onValueChange={(v) => setUnidadeId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </EntityFormDialog>
        </div>
        <ChamadosTable chamados={list} />
      </div>
    </>
  );
}
