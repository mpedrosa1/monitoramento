"use client";

import { useEffect, useState } from "react";
import type { ClimaAtual } from "@/lib/open-meteo";
import { fetchClimaAtual } from "@/lib/open-meteo";

export type UnidadeClimaState =
  | { status: "idle" }
  | { status: "no-coords" }
  | { status: "loading" }
  | { status: "ok"; data: ClimaAtual }
  | { status: "error" };

export function useUnidadeClima(
  lat: number | null | undefined,
  lng: number | null | undefined
): UnidadeClimaState {
  const [state, setState] = useState<UnidadeClimaState>({ status: "idle" });

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setState({ status: "no-coords" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    void fetchClimaAtual(lat, lng)
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return state;
}
