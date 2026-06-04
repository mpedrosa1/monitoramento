"use client";

import { createContext, useContext } from "react";
import type { useMonitoringSocket } from "@/hooks/useMonitoringSocket";

type MonitoringValue = ReturnType<typeof useMonitoringSocket>;

export const MonitoringSocketContext = createContext<MonitoringValue | null>(
  null
);

export function useMonitoring() {
  const ctx = useContext(MonitoringSocketContext);
  if (!ctx) {
    throw new Error("useMonitoring deve ser usado dentro do DashboardLayout");
  }
  return ctx;
}
