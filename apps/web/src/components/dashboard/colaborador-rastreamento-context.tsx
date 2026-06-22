"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, asArray } from "@/lib/api";
import {
  colaboradorStatusEfetivo,
  withColaboradorStatusEfetivo,
  withColaboradoresStatusEfetivo,
} from "@/lib/colaborador-status-rastreamento";
import {
  presencasNaUnidade,
  processRastreamentoColaboradores,
  type PresencaColaboradorHud,
  type VehicleTrack,
} from "@/lib/veiculo-presenca-unidade";
import type { Colaborador, ColaboradorStatus, Unidade, Veiculo } from "@/lib/types";
import { useMonitoring } from "@/components/dashboard/monitoring-context";

type RastreamentoCatalog = {
  unidades: Unidade[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
};

type ColaboradorRastreamentoContextValue = {
  presencasPorUnidade: Map<string, PresencaColaboradorHud[]>;
  statusPorColaborador: Map<string, ColaboradorStatus>;
  getStatusEfetivo: (colaborador: Colaborador) => ColaboradorStatus;
  withStatusEfetivo: (colaborador: Colaborador) => Colaborador;
  withStatusEfetivoList: (colaboradores: Colaborador[]) => Colaborador[];
  presencasNaUnidade: (unidadeId: string) => PresencaColaboradorHud[];
};

const emptyMapStatus = new Map<string, ColaboradorStatus>();
const emptyMapPresenca = new Map<string, PresencaColaboradorHud[]>();

const fallback: ColaboradorRastreamentoContextValue = {
  presencasPorUnidade: emptyMapPresenca,
  statusPorColaborador: emptyMapStatus,
  getStatusEfetivo: (c) => c.status,
  withStatusEfetivo: (c) => c,
  withStatusEfetivoList: (list) => list,
  presencasNaUnidade: () => [],
};

const ColaboradorRastreamentoContext =
  createContext<ColaboradorRastreamentoContextValue>(fallback);

const RastreamentoCatalogSyncContext = createContext<
  ((catalog: RastreamentoCatalog) => void) | null
>(null);

function catalogTemDados(c: RastreamentoCatalog | null): c is RastreamentoCatalog {
  return Boolean(
    c &&
      (c.unidades.length > 0 || c.veiculos.length > 0 || c.colaboradores.length > 0)
  );
}

export function ColaboradorRastreamentoStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { veiculoPosicoes } = useMonitoring();
  const [fetchedUnidades, setFetchedUnidades] = useState<Unidade[]>([]);
  const [fetchedVeiculos, setFetchedVeiculos] = useState<Veiculo[]>([]);
  const [fetchedColaboradores, setFetchedColaboradores] = useState<Colaborador[]>(
    []
  );
  const syncedCatalogRef = useRef<RastreamentoCatalog | null>(null);
  const [syncedCatalogVersion, setSyncedCatalogVersion] = useState(0);
  const trackerRef = useRef<Map<string, VehicleTrack>>(new Map());

  const syncCatalog = useCallback((catalog: RastreamentoCatalog) => {
    syncedCatalogRef.current = catalog;
    setSyncedCatalogVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogo = async () => {
      try {
        const [uRes, vRes, cRes] = await Promise.all([
          apiFetch("/api/v1/unidades"),
          apiFetch("/api/v1/veiculos"),
          apiFetch("/api/v1/colaboradores"),
        ]);
        if (cancelled) return;
        setFetchedUnidades(asArray<Unidade>(await uRes.json()));
        setFetchedVeiculos(asArray<Veiculo>(await vRes.json()));
        setFetchedColaboradores(asArray<Colaborador>(await cRes.json()));
      } catch {
        if (!cancelled) {
          setFetchedUnidades([]);
          setFetchedVeiculos([]);
          setFetchedColaboradores([]);
        }
      }
    };
    void loadCatalogo();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    void syncedCatalogVersion;
    if (catalogTemDados(syncedCatalogRef.current)) {
      return syncedCatalogRef.current;
    }
    return {
      unidades: fetchedUnidades,
      veiculos: fetchedVeiculos,
      colaboradores: fetchedColaboradores,
    };
  }, [
    syncedCatalogVersion,
    fetchedUnidades,
    fetchedVeiculos,
    fetchedColaboradores,
  ]);

  const { presencasPorUnidade, statusPorColaborador } = useMemo(
    () =>
      processRastreamentoColaboradores(
        trackerRef.current,
        veiculoPosicoes,
        catalog.unidades,
        catalog.veiculos,
        catalog.colaboradores
      ),
    [veiculoPosicoes, catalog]
  );

  const getStatusEfetivo = useCallback(
    (colaborador: Colaborador) =>
      colaboradorStatusEfetivo(colaborador, statusPorColaborador),
    [statusPorColaborador]
  );

  const withStatusEfetivo = useCallback(
    (colaborador: Colaborador) =>
      withColaboradorStatusEfetivo(colaborador, statusPorColaborador),
    [statusPorColaborador]
  );

  const withStatusEfetivoList = useCallback(
    (list: Colaborador[]) =>
      withColaboradoresStatusEfetivo(list, statusPorColaborador),
    [statusPorColaborador]
  );

  const getPresencasNaUnidade = useCallback(
    (unidadeId: string) => presencasNaUnidade(presencasPorUnidade, unidadeId),
    [presencasPorUnidade]
  );

  const value = useMemo(
    () => ({
      presencasPorUnidade,
      statusPorColaborador,
      getStatusEfetivo,
      withStatusEfetivo,
      withStatusEfetivoList,
      presencasNaUnidade: getPresencasNaUnidade,
    }),
    [
      presencasPorUnidade,
      statusPorColaborador,
      getStatusEfetivo,
      withStatusEfetivo,
      withStatusEfetivoList,
      getPresencasNaUnidade,
    ]
  );

  return (
    <RastreamentoCatalogSyncContext.Provider value={syncCatalog}>
      <ColaboradorRastreamentoContext.Provider value={value}>
        {children}
      </ColaboradorRastreamentoContext.Provider>
    </RastreamentoCatalogSyncContext.Provider>
  );
}

export function useRastreamentoCatalogSync() {
  const sync = useContext(RastreamentoCatalogSyncContext);
  if (!sync) {
    return () => {};
  }
  return sync;
}

export function useColaboradorRastreamento() {
  return useContext(ColaboradorRastreamentoContext);
}

export function useColaboradorStatusEfetivo(colaborador: Colaborador) {
  const { getStatusEfetivo } = useColaboradorRastreamento();
  return getStatusEfetivo(colaborador);
}
