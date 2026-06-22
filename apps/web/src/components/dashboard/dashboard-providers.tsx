"use client";

import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { MonitoringSocketContext } from "@/components/dashboard/monitoring-context";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { TrocaVeiculoPopup } from "@/components/notifications/troca-veiculo-popup";
import { OfflineAlertMonitor } from "@/components/monitoring/offline-alert-monitor";
import { VeiculoProximidadeNotificationMonitor } from "@/components/monitoring/veiculo-proximidade-notification-monitor";
import { ColaboradorRastreamentoStatusProvider } from "@/components/dashboard/colaborador-rastreamento-context";
import { Toaster } from "@/components/ui/sonner";

/** WebSocket, toasts, notificações e alertas offline — compartilhado por todas as rotas do dashboard. */
export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const socket = useMonitoringSocket();

  return (
    <MonitoringSocketContext.Provider value={socket}>
      <ColaboradorRastreamentoStatusProvider>
      <NotificationsProvider>
        <OfflineAlertMonitor />
        <VeiculoProximidadeNotificationMonitor />
        <TrocaVeiculoPopup />
        <Toaster />
        {children}
      </NotificationsProvider>
      </ColaboradorRastreamentoStatusProvider>
    </MonitoringSocketContext.Provider>
  );
}
