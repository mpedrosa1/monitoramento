import { redirect } from "next/navigation";
import { RH_COLABORADORES_PATH } from "@/lib/dashboard-paths";

export default function ColaboradoresRedirectPage() {
  redirect(RH_COLABORADORES_PATH);
}
