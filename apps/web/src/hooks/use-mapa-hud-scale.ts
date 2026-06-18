"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAPA_HUD_SCALE_DEFAULT,
  clampMapaHudScale,
  loadMapaHudScale,
  saveMapaHudScale,
} from "@/lib/mapa-hud-scale";

export function useMapaHudScale(): [number, (scale: number) => void] {
  const [scale, setScaleState] = useState(MAPA_HUD_SCALE_DEFAULT);

  useEffect(() => {
    setScaleState(loadMapaHudScale());
  }, []);

  const setScale = useCallback((value: number) => {
    const next = clampMapaHudScale(value);
    setScaleState(next);
    saveMapaHudScale(next);
  }, []);

  return [scale, setScale];
}
