"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { LatLng } from "@/lib/geocode";

const MapInner = dynamic(() => import("@/components/unidades/unidade-detail-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function UnidadeDetailMap({
  position,
  label,
}: {
  position: LatLng | null;
  label: string;
}) {
  return (
    <div className="h-full min-h-[min(70vh,520px)] w-full">
      <MapInner position={position} label={label} />
    </div>
  );
}
