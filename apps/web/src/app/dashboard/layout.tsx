import { DashboardProviders } from "@/components/dashboard/dashboard-providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
