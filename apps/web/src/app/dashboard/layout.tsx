import { DashboardAuthGuard } from "@/components/dashboard/dashboard-auth-guard";
import { DashboardProviders } from "@/components/dashboard/dashboard-providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAuthGuard>
      <DashboardProviders>{children}</DashboardProviders>
    </DashboardAuthGuard>
  );
}
