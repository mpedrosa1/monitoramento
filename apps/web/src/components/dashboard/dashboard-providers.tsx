"use client";

import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { MonitoringSocketContext } from "@/components/dashboard/monitoring-context";
import { OfflineAlertMonitor } from "@/components/monitoring/offline-alert-monitor";
import { Toaster } from "@/components/ui/sonner";

/** WebSocket, toasts e alertas offline — compartilhado por todas as rotas do dashboard. */
export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const socket = useMonitoringSocket();

  return (
    <MonitoringSocketContext.Provider value={socket}>
      <OfflineAlertMonitor />
      <Toaster />
      {children}
    </MonitoringSocketContext.Provider>
  );
}
