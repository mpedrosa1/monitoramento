"use client";

import { useEffect, useRef, useState } from "react";
import type { HudEquipamentoPos } from "@/lib/mapa-hud-equipamentos-pos";
import {
  loadGeralEquipamentosPos,
  saveGeralEquipamentosPos,
} from "@/lib/mapa-hud-layout-storage";

export type GeralEquipamentosMapState = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  posicoesNoMapa: Record<string, HudEquipamentoPos>;
  setPosicoesNoMapa: React.Dispatch<
    React.SetStateAction<Record<string, HudEquipamentoPos>>
  >;
  zPorCard: Record<string, number>;
  setZPorCard: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  topZ: number;
  setTopZ: React.Dispatch<React.SetStateAction<number>>;
};

export function useGeralEquipamentosMapState(): GeralEquipamentosMapState {
  const containerRef = useRef<HTMLDivElement>(null);
  const [posicoesNoMapa, setPosicoesNoMapa] = useState<
    Record<string, HudEquipamentoPos>
  >(() => loadGeralEquipamentosPos());
  const [zPorCard, setZPorCard] = useState<Record<string, number>>({});
  const [topZ, setTopZ] = useState(30);
  const persistSkipRef = useRef(true);

  useEffect(() => {
    if (persistSkipRef.current) {
      persistSkipRef.current = false;
      return;
    }
    saveGeralEquipamentosPos(posicoesNoMapa);
  }, [posicoesNoMapa]);

  return {
    containerRef,
    posicoesNoMapa,
    setPosicoesNoMapa,
    zPorCard,
    setZPorCard,
    topZ,
    setTopZ,
  };
}
