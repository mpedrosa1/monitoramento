import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function DashboardComMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
