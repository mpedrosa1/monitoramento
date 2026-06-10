"use client";

import { useEffect, useRef } from "react";
import { playOfflineAlertSound } from "@/lib/alert-sound";
import type { DeviceMetric, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";

function unidadeHostOnline(
  u: Unidade,
  metricMap: Map<string, DeviceMetric>
): boolean {
  if (!u.ip?.trim()) return false;
  return metricMap.get(monitorUnidadeHostTargetId(u.id))?.online ?? false;
}

/** Toca som quando uma unidade com IP passa de online para offline (aba mapa). */
export function PainelMapaOfflineSound({
  active,
  unidades,
  metricMap,
}: {
  active: boolean;
  unidades: Unidade[];
  metricMap: Map<string, DeviceMetric>;
}) {
  const prevOnlineRef = useRef<Map<string, boolean>>(new Map());
  const seededRef = useRef(false);

  useEffect(() => {
    if (!active) {
      seededRef.current = false;
      prevOnlineRef.current.clear();
      return;
    }

    for (const u of unidades) {
      if (!u.ip?.trim()) continue;

      const online = unidadeHostOnline(u, metricMap);
      const prev = prevOnlineRef.current.get(u.id);

      if (!seededRef.current) {
        prevOnlineRef.current.set(u.id, online);
        continue;
      }

      if (prev === true && !online) {
        playOfflineAlertSound();
      }

      prevOnlineRef.current.set(u.id, online);
    }

    seededRef.current = true;
  }, [active, unidades, metricMap]);

  return null;
}
