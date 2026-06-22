"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { playProximityAlertSound } from "@/lib/alert-sound";
import type { Notificacao } from "@/lib/types";

function toastIdFor(n: Notificacao) {
  const veiculoId = n.payload.veiculoId ?? n.payload.veiculoAlvoId ?? "";
  const unidadeId = n.payload.unidadeId ?? "";
  return `veiculo-prox-${veiculoId}-${unidadeId}`;
}

function isProximidadeNotificacao(n: Notificacao) {
  return n.tipo === "veiculo_proximo_unidade";
}

/** Toast e som para administradores ao receber notificação de proximidade (qualquer rota). */
export function VeiculoProximidadeNotificationMonitor() {
  const { subscribeNotifications } = useMonitoring();

  useEffect(() => {
    return subscribeNotifications((n) => {
      if (!isProximidadeNotificacao(n)) return;
      playProximityAlertSound();
      toast.info(n.titulo, {
        id: toastIdFor(n),
        description: n.mensagem,
        duration: 12_000,
        icon: <Car className="h-4 w-4 text-sky-500" />,
      });
    });
  }, [subscribeNotifications]);

  return null;
}
