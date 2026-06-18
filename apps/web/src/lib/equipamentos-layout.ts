"use client";

import { useCallback, useEffect, useState } from "react";

export type EquipamentosLayout = "grade" | "lista";
export type EquipamentosFiltro = "todos" | "nobreaks" | "maquinas";

const STORAGE_KEY = "painel-equipamentos-layout";
const FILTRO_STORAGE_KEY = "painel-equipamentos-filtro";

export function useEquipamentosLayout(): [
  EquipamentosLayout,
  (layout: EquipamentosLayout) => void,
] {
  const [layout, setLayoutState] = useState<EquipamentosLayout>("grade");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "grade" || stored === "lista") {
      setLayoutState(stored);
    }
  }, []);

  const setLayout = useCallback((value: EquipamentosLayout) => {
    setLayoutState(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return [layout, setLayout];
}

export function useEquipamentosFiltro(): [
  EquipamentosFiltro,
  (filtro: EquipamentosFiltro) => void,
] {
  const [filtro, setFiltroState] = useState<EquipamentosFiltro>("todos");

  useEffect(() => {
    const stored = localStorage.getItem(FILTRO_STORAGE_KEY);
    if (stored === "todos" || stored === "nobreaks" || stored === "maquinas") {
      setFiltroState(stored);
    }
  }, []);

  const setFiltro = useCallback((value: EquipamentosFiltro) => {
    setFiltroState(value);
    localStorage.setItem(FILTRO_STORAGE_KEY, value);
  }, []);

  return [filtro, setFiltro];
}
