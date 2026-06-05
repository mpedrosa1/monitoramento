"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador, ColaboradorStatus, Unidade } from "@/lib/types";
import { colaboradorStatusLabel } from "@/lib/labels";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ColaboradorCard } from "@/components/dashboard/colaborador-card";
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

const statusOptions: ColaboradorStatus[] = [
  "atrasado",
  "em_missao",
  "escritorio",
  "almoco",
  "ferias",
  "atestado",
];

export default function ColaboradoresPage() {
  const { status: socketStatus } = useMonitoring();
  const [list, setList] = useState<Colaborador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [nome, setNome] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [colStatus, setColStatus] = useState<ColaboradorStatus>("escritorio");
  const [unidadeId, setUnidadeId] = useState("");

  const load = useCallback(async () => {
    const [cols, uns] = await Promise.all([
      apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
      apiFetch<Unidade[] | null>("/api/v1/unidades"),
    ]);
    setList(asArray(cols));
    setUnidades(asArray(uns));
    if (!unidadeId && uns[0]) setUnidadeId(uns[0].id);
  }, [unidadeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    await apiFetch<Colaborador>("/api/v1/colaboradores", {
      method: "POST",
      body: JSON.stringify({
        nome,
        fotoUrl:
          fotoUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nome)}`,
        status: colStatus,
        unidadeId,
      }),
    });
    setNome("");
    setFotoUrl("");
    await load();
  }

  return (
    <>
      <DashboardHeader
        title="Colaboradores"
        socketStatus={socketStatus}
      />
      <div className="space-y-6 p-6">
        <div className="flex justify-end">
          <EntityFormDialog
            title="Novo colaborador"
            triggerLabel="Adicionar colaborador"
            onSubmit={create}
          >
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>URL da foto (opcional)</Label>
                <Input
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={colStatus}
                  onValueChange={(v) => setColStatus(v as ColaboradorStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {colaboradorStatusLabel[s]}
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
                    <SelectValue placeholder="Selecione" />
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
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {list.map((c) => (
            <ColaboradorCard key={c.id} colaborador={c} />
          ))}
        </div>
      </div>
    </>
  );
}
