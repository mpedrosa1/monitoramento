"use client";

import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";

function openPainelMonitoramento() {
  const url = `${window.location.origin}/dashboard/painel-monitoramento`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <SidebarNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-border px-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={openPainelMonitoramento}
          >
            <LayoutDashboard className="h-4 w-4" />
            Painel de monitoramento
          </Button>
          {user ? (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.nome}
            </span>
          ) : null}
          <Button variant="ghost" size="sm" className="gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
