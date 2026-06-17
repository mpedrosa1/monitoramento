import type { Metadata } from "next";
import { PAINEL_MONITORAMENTO_NOME } from "@/lib/brand";

export const metadata: Metadata = {
  title: PAINEL_MONITORAMENTO_NOME,
};

export default function PainelMonitoramentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {children}
    </div>
  );
}
