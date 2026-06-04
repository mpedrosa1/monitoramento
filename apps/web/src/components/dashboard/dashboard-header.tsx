"use client";

import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SocketStatus } from "@/hooks/useMonitoringSocket";

export function DashboardHeader({
  title,
  socketStatus,
}: {
  title: string;
  socketStatus?: SocketStatus;
}) {
  const statusConfig = {
    connected: {
      label: "Tempo real",
      icon: Wifi,
      variant: "default" as const,
    },
    connecting: {
      label: "Conectando…",
      icon: Loader2,
      variant: "secondary" as const,
    },
    disconnected: {
      label: "Offline",
      icon: WifiOff,
      variant: "destructive" as const,
    },
  };

  const cfg = socketStatus
    ? statusConfig[socketStatus]
    : null;
  const Icon = cfg?.icon;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {cfg && Icon && (
        <Badge variant={cfg.variant} className="gap-1.5">
          <Icon
            className={`h-3.5 w-3.5 ${socketStatus === "connecting" ? "animate-spin" : ""}`}
          />
          {cfg.label}
        </Badge>
      )}
    </header>
  );
}
