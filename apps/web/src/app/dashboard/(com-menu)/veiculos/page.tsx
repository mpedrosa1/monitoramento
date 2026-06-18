"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { formatPlaca } from "@/lib/veiculo-placa";
import type { Colaborador, Veiculo } from "@/lib/types";
import { AdicionarVeiculoDialog } from "@/components/veiculos/adicionar-veiculo-dialog";
import { EditarVeiculoDialog } from "@/components/veiculos/editar-veiculo-dialog";
import { ExcluirVeiculoDialog } from "@/components/veiculos/excluir-veiculo-dialog";
import { SolicitarTrocaVeiculoDialog } from "@/components/veiculos/solicitar-troca-veiculo-dialog";
import { TrocaAdminVeiculosDialog } from "@/components/veiculos/troca-admin-veiculos-dialog";
import { VeiculoCard } from "@/components/veiculos/veiculo-card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";

export default function VeiculosPage() {
  const { status: socketStatus } = useMonitoring();
  const { user } = useAuth();
  const {
    canCrudVeiculos,
    canFrotaTrocarVeiculos,
  } = usePermissions();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [busca, setBusca] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<Veiculo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<Veiculo | null>(null);
  const [adminSwapOpen, setAdminSwapOpen] = useState(false);
  const [adminSwapTarget, setAdminSwapTarget] = useState<Veiculo | null>(null);

  const colaboradorPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) {
      map.set(c.id, c);
    }
    return map;
  }, [colaboradores]);

  const load = useCallback(async () => {
    const [veiculosRes, colsRes] = await Promise.all([
      apiFetch<Veiculo[] | null>("/api/v1/veiculos"),
      apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
    ]);
    setVeiculos(asArray(veiculosRes));
    setColaboradores(asArray(colsRes));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit(veiculo: Veiculo) {
    setEditing(veiculo);
    setEditOpen(true);
  }

  function requestDelete(veiculo: Veiculo) {
    setDeletingTarget(veiculo);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingTarget) return;

    setDeleting(true);
    try {
      await apiFetch<void>(`/api/v1/veiculos/${deletingTarget.id}`, {
        method: "DELETE",
      });
      if (editing?.id === deletingTarget.id) {
        setEditOpen(false);
        setEditing(null);
      }
      setDeleteOpen(false);
      setDeletingTarget(null);
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

  const filtered = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return veiculos;
    return veiculos.filter((v) => {
      const condutor =
        colaboradorPorId.get(v.colaboradorId)?.nome?.toLowerCase() ?? "";
      return (
        v.placa.toLowerCase().includes(termo) ||
        formatPlaca(v.placa).toLowerCase().includes(termo) ||
        v.marca.toLowerCase().includes(termo) ||
        v.modelo.toLowerCase().includes(termo) ||
        condutor.includes(termo)
      );
    });
  }, [veiculos, busca, colaboradorPorId]);

  const ordered = useMemo(() => {
    const colaboradorId = user?.id;
    if (!colaboradorId) return filtered;
    return [...filtered].sort((a, b) => {
      const aMine = a.colaboradorId === colaboradorId ? 0 : 1;
      const bMine = b.colaboradorId === colaboradorId ? 0 : 1;
      return aMine - bMine;
    });
  }, [filtered, user?.id]);

  const meusVeiculos = useMemo(() => {
    if (!user?.id) return [];
    return veiculos.filter((v) => v.colaboradorId === user.id);
  }, [veiculos, user?.id]);

  function requestSwap(veiculo: Veiculo) {
    if (canFrotaTrocarVeiculos) {
      setAdminSwapTarget(veiculo);
      setAdminSwapOpen(true);
      return;
    }
    setSwapTarget(veiculo);
    setSwapOpen(true);
  }

  return (
    <>
      <DashboardHeader title="Veículos" socketStatus={socketStatus} />
      <div className="space-y-6 p-6">
        <p className="text-sm text-muted-foreground">
          Frota de veículos para locação. Cadastre placa, dados do veículo e
          condutor responsável.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por placa, marca, modelo ou condutor…"
              className="pl-8"
              aria-label="Buscar veículos"
            />
          </div>
          {canCrudVeiculos ? <AdicionarVeiculoDialog onSuccess={load} /> : null}
        </div>

        {veiculos.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum veículo cadastrado.
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhum veículo encontrado para a busca.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,240px))] gap-5 justify-items-center">
            {ordered.map((v) => (
              <VeiculoCard
                key={v.id}
                veiculo={v}
                colaborador={colaboradorPorId.get(v.colaboradorId)}
                isMeuVeiculo={v.colaboradorId === user?.id}
                showAlertasAdmin={canFrotaTrocarVeiculos}
                trocaComoAdmin={canFrotaTrocarVeiculos}
                onRequestSwap={requestSwap}
                onEdit={canCrudVeiculos ? openEdit : undefined}
                onDelete={canCrudVeiculos ? requestDelete : undefined}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </div>

      <EditarVeiculoDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        veiculo={editing}
        onSuccess={load}
      />

      <ExcluirVeiculoDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingTarget(null);
        }}
        veiculo={deletingTarget}
        onConfirm={confirmDelete}
        loading={deleting}
      />

      <SolicitarTrocaVeiculoDialog
        open={swapOpen}
        onOpenChange={setSwapOpen}
        veiculoAlvo={swapTarget}
        colaboradorAlvo={
          swapTarget
            ? colaboradorPorId.get(swapTarget.colaboradorId)
            : undefined
        }
        meusVeiculos={meusVeiculos}
        onSuccess={load}
      />

      <TrocaAdminVeiculosDialog
        open={adminSwapOpen}
        onOpenChange={setAdminSwapOpen}
        veiculoInicial={adminSwapTarget}
        veiculos={veiculos}
        onSuccess={load}
      />
    </>
  );
}
