"use client";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardOperacionalHome } from "@/components/dashboard/dashboard-operacional-home";
import { useMonitoring } from "@/components/dashboard/monitoring-context";

export default function DashboardHomePage() {
  const { status: socketStatus } = useMonitoring();

  return (
    <>
      <DashboardHeader title="Painel operacional" socketStatus={socketStatus} />
      <DashboardOperacionalHome />
    </>
  );
}
