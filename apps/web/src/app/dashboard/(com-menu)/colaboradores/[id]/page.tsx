import { redirect } from "next/navigation";
import { rhColaboradorDetailPath } from "@/lib/dashboard-paths";

export default async function ColaboradorDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(rhColaboradorDetailPath(id));
}
