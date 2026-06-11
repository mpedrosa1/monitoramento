import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function UnidadesListaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
