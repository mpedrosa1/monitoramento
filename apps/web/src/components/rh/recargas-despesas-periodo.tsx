"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MESES_RECARGAS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type PeriodoContextValue = {
  ano: number;
  mes: number;
  competencia: string;
  mesAnterior: () => void;
  mesSeguinte: () => void;
};

const PeriodoContext = createContext<PeriodoContextValue | null>(null);

export function RecargasDespesasPeriodoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const value = useMemo<PeriodoContextValue>(
    () => ({
      ano,
      mes,
      competencia: `${ano}-${String(mes).padStart(2, "0")}`,
      mesAnterior() {
        if (mes === 1) {
          setMes(12);
          setAno((a) => a - 1);
        } else {
          setMes((m) => m - 1);
        }
      },
      mesSeguinte() {
        if (mes === 12) {
          setMes(1);
          setAno((a) => a + 1);
        } else {
          setMes((m) => m + 1);
        }
      },
    }),
    [ano, mes]
  );

  return (
    <PeriodoContext.Provider value={value}>{children}</PeriodoContext.Provider>
  );
}

export function useRecargasDespesasPeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) {
    throw new Error(
      "useRecargasDespesasPeriodo deve ser usado dentro de RecargasDespesasPeriodoProvider"
    );
  }
  return ctx;
}

export function RecargasDespesasPeriodoNav() {
  const { ano, mes, mesAnterior, mesSeguinte } = useRecargasDespesasPeriodo();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={mesAnterior}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <p className="min-w-36 text-center text-sm font-semibold">
        {MESES_RECARGAS[mes - 1]} de {ano}
      </p>
      <Button variant="outline" size="sm" onClick={mesSeguinte}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
