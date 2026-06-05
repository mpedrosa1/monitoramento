"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch, asArray } from "@/lib/api";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { nomeEquipamentoVinculo } from "@/lib/unidade-form";

type OfflineTrack = {
  since: number;
  notified: boolean;
};

function toastIdFor(targetId: string) {
  return `offline-${targetId}`;
}

function isHostPing(m: DeviceMetric): boolean {
  const key = m.targetId || m.dispositivoId;
  return (
    m.tipo === "ping" &&
    !m.porta &&
    (key.endsWith(":host") || m.targetId?.endsWith(":host") === true)
  );
}

function buildAlertMessage(
  m: DeviceMetric,
  unidade: Unidade | undefined,
  equip: Equipamento | undefined,
  thresholdSec: number
): { title: string; description: string } {
  const unidadeLabel = unidade
    ? `${unidade.codigo} — ${unidade.nome}`
    : m.unidadeId;

  if (isHostPing(m)) {
    return {
      title: "IP sem resposta",
      description: `Unidade ${unidadeLabel}: host ${m.host} offline há mais de ${thresholdSec} s.`,
    };
  }

  const link = unidade?.equipamentos?.find(
    (l) => l.equipamentoId === m.equipamentoId
  );
  const nome =
    link && equip
      ? nomeEquipamentoVinculo(link, equip)
      : equip?.nome ?? m.equipamentoId;

  const protocolo =
    m.tipo === "snmp" ? "SNMP/OID" : m.tipo === "modbus" ? "Modbus" : m.tipo;

  return {
    title: "Equipamento sem resposta",
    description: `${nome} (${protocolo}) na unidade ${unidadeLabel} — sem resposta há mais de ${thresholdSec} s.`,
  };
}

export function OfflineAlertMonitor() {
  const { metrics } = useMonitoring();
  const [tick, setTick] = useState(0);
  const unidadesRef = useRef<Map<string, Unidade>>(new Map());
  const equipRef = useRef<Map<string, Equipamento>>(new Map());
  const trackRef = useRef<Map<string, OfflineTrack>>(new Map());

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [uns, eqs] = await Promise.all([
        apiFetch<Unidade[] | null>("/api/v1/unidades"),
        apiFetch<Equipamento[] | null>("/api/v1/equipamentos"),
      ]);
      unidadesRef.current = new Map(asArray(uns).map((u) => [u.id, u]));
      equipRef.current = new Map(asArray(eqs).map((e) => [e.id, e]));
    } catch {
      /* mantém cache anterior */
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    const t = setInterval(() => void loadCatalog(), 60_000);
    return () => clearInterval(t);
  }, [loadCatalog]);

  useEffect(() => {
    const now = Date.now();
    const seen = new Set<string>();

    for (const m of metrics) {
      const targetId = m.targetId || m.dispositivoId;
      if (!targetId) continue;
      seen.add(targetId);

      const unidade = unidadesRef.current.get(m.unidadeId);
      const thresholdSec = unidade?.alertaOfflineS ?? 60;
      const thresholdMs = thresholdSec * 1000;

      if (m.online) {
        const prev = trackRef.current.get(targetId);
        if (prev) {
          trackRef.current.delete(targetId);
          toast.dismiss(toastIdFor(targetId));
        }
        continue;
      }

      let track = trackRef.current.get(targetId);
      if (!track) {
        track = { since: now, notified: false };
        trackRef.current.set(targetId, track);
      }

      if (track.notified) continue;
      if (now - track.since < thresholdMs) continue;

      const equip = equipRef.current.get(m.equipamentoId);
      const { title, description } = buildAlertMessage(
        m,
        unidade,
        equip,
        thresholdSec
      );

      toast.error(title, {
        id: toastIdFor(targetId),
        description,
        duration: Infinity,
        dismissible: true,
        closeButton: true,
        onDismiss: () => {
          const t = trackRef.current.get(targetId);
          if (t) t.notified = true;
        },
      });
      track.notified = true;
    }

    for (const [targetId, track] of trackRef.current) {
      if (!seen.has(targetId)) {
        trackRef.current.delete(targetId);
        toast.dismiss(toastIdFor(targetId));
      }
    }
  }, [metrics, tick]);

  return null;
}
