"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { playProximityAlertSound } from "@/lib/alert-sound";
import type { VeiculoProximidadeAlerta } from "@/lib/types";

function toastIdFor(alerta: VeiculoProximidadeAlerta) {
  return `veiculo-prox-${alerta.veiculoId}-${alerta.unidadeId}`;
}

function formatPlaca(placa: string) {
  return placa.trim() || "—";
}

function buildDescription(alerta: VeiculoProximidadeAlerta) {
  return `Veículo ${formatPlaca(alerta.placa)} entrou no raio de ${alerta.raioKm.toFixed(0)} km da unidade ${alerta.unidadeNome} (${alerta.distanciaKm.toFixed(1)} km de distância).`;
}

/** Exibe toast e som quando um veículo entra no raio de uma unidade. */
export function PainelMapaVeiculoProximidadeAlertas({ active }: { active: boolean }) {
  const { subscribeProximityAlerts } = useMonitoring();

  useEffect(() => {
    if (!active) return;

    return subscribeProximityAlerts((alerta) => {
      playProximityAlertSound();
      toast.info("Veículo próximo da unidade", {
        id: toastIdFor(alerta),
        description: buildDescription(alerta),
        duration: 12_000,
        icon: <Car className="h-4 w-4 text-sky-500" />,
      });
    });
  }, [active, subscribeProximityAlerts]);

  return null;
}
