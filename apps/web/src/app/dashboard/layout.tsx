"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { MonitoringSocketContext } from "@/components/dashboard/monitoring-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const socket = useMonitoringSocket();

  return (
    <MonitoringSocketContext.Provider value={socket}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center justify-end border-b border-border px-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </Link>
          </div>
          <ScrollArea className="flex-1">
            <div className="min-h-0">{children}</div>
          </ScrollArea>
        </div>
      </div>
    </MonitoringSocketContext.Provider>
  );
}
