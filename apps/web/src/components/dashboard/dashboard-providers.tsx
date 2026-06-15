"use client";

import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { MonitoringSocketContext } from "@/components/dashboard/monitoring-context";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { TrocaVeiculoPopup } from "@/components/notifications/troca-veiculo-popup";
import { OfflineAlertMonitor } from "@/components/monitoring/offline-alert-monitor";
import { Toaster } from "@/components/ui/sonner";

/** WebSocket, toasts, notificações e alertas offline — compartilhado por todas as rotas do dashboard. */
export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const socket = useMonitoringSocket();

  return (
    <MonitoringSocketContext.Provider value={socket}>
      <NotificationsProvider>
        <OfflineAlertMonitor />
        <TrocaVeiculoPopup />
        <Toaster />
        {children}
      </NotificationsProvider>
    </MonitoringSocketContext.Provider>
  );
}
