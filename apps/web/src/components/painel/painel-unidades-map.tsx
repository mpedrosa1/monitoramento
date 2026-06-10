"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { DeviceMetric, Unidade } from "@/lib/types";

const MapInner = dynamic(
  () => import("@/components/painel/painel-unidades-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-muted/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function PainelUnidadesMap({
  unidades,
  metricMap,
  selectedId,
  onSelectUnidade,
}: {
  unidades: Unidade[];
  metricMap: Map<string, DeviceMetric>;
  selectedId: string | null;
  onSelectUnidade?: (id: string) => void;
}) {
  return (
    <div className="h-full min-h-0 w-full">
      <MapInner
        unidades={unidades}
        metricMap={metricMap}
        selectedId={selectedId}
        onSelectUnidade={onSelectUnidade}
      />
    </div>
  );
}
