"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, asArray } from "@/lib/api";
import { formatPlaca } from "@/lib/veiculo-placa";
import type { Colaborador, Veiculo } from "@/lib/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { VeiculoDetail } from "@/components/veiculos/veiculo-detail";

export default function VeiculoDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { status: socketStatus } = useMonitoring();
  const { user } = useAuth();
  const {
    canCrudVeiculos,
    canFrotaTrocarVeiculos,
    canFrotaRegistrarPeriodo,
    canFrotaRegistrarMulta,
    canFrotaValoresAlugueis,
    canFrotaVisualizarContratos,
  } = usePermissions();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [veiculosRes, colsRes] = await Promise.all([
        apiFetch<Veiculo[] | null>("/api/v1/veiculos"),
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
      ]);
      const lista = asArray(veiculosRes);
      setVeiculos(lista);
      setColaboradores(asArray(colsRes));
      setNotFound(!lista.some((v) => v.id === id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const veiculo = useMemo(
    () => veiculos.find((v) => v.id === id) ?? null,
    [veiculos, id]
  );

  const colaborador = useMemo(
    () =>
      veiculo
        ? (colaboradores.find((c) => c.id === veiculo.colaboradorId) ?? null)
        : null,
    [colaboradores, veiculo]
  );

  const meusVeiculos = useMemo(() => {
    if (!user?.id) return [];
    return veiculos.filter((v) => v.colaboradorId === user.id);
  }, [veiculos, user?.id]);

  const titulo = veiculo
    ? `${formatPlaca(veiculo.placa)} — ${veiculo.marca} ${veiculo.modelo}`.trim()
    : "Veículo";

  return (
    <>
      <DashboardHeader title={titulo} socketStatus={socketStatus} />
      <div className="p-6">
        {loading && (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        )}
        {notFound && !loading && (
          <p className="text-sm text-muted-foreground">
            Veículo não encontrado.
          </p>
        )}
        {veiculo && !loading && (
          <VeiculoDetail
            veiculo={veiculo}
            colaborador={colaborador}
            colaboradores={colaboradores}
            isMeuVeiculo={veiculo.colaboradorId === user?.id}
            canCrudVeiculos={canCrudVeiculos}
            canFrotaTrocarVeiculos={canFrotaTrocarVeiculos}
            canFrotaRegistrarPeriodo={canFrotaRegistrarPeriodo}
            canFrotaRegistrarMulta={canFrotaRegistrarMulta}
            canFrotaValoresAlugueis={canFrotaValoresAlugueis}
            canFrotaVisualizarContratos={canFrotaVisualizarContratos}
            meusVeiculos={meusVeiculos}
            todosVeiculos={veiculos}
            onChanged={load}
          />
        )}
      </div>
    </>
  );
}
