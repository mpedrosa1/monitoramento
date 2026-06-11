"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Pentagon, Undo2 } from "lucide-react";
import {
  formatAreaM2,
  latLngToVertices,
  polygonAreaM2,
  verticesToLatLng,
} from "@/lib/unidade-area";
import { formatCoord, MAP_ZOOM_COORD, parseCoordPair, type LatLng } from "@/lib/geocode";
import type { UnidadeAreaVertice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UnidadeAreaMapLeaflet = dynamic(
  () => import("@/components/unidades/unidade-area-map-leaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(55vh,420px)] items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export function UnidadeAreaMapDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  areaVertices,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: string;
  longitude: string;
  areaVertices: UnidadeAreaVertice[];
  onConfirm: (vertices: UnidadeAreaVertice[], areaM2: number) => void;
}) {
  const unidadeCenter = useMemo(
    () => parseCoordPair(latitude, longitude),
    [latitude, longitude]
  );

  const [vertices, setVertices] = useState<LatLng[]>([]);

  useEffect(() => {
    if (open) {
      setVertices(verticesToLatLng(areaVertices));
    }
  }, [open, areaVertices]);

  const areaM2 = useMemo(() => polygonAreaM2(vertices), [vertices]);
  const podeConfirmar = vertices.length >= 3 && areaM2 > 0;

  function adicionarVertice(pos: LatLng) {
    setVertices((prev) => [...prev, pos]);
  }

  function moverVertice(index: number, pos: LatLng) {
    setVertices((prev) => prev.map((v, i) => (i === index ? pos : v)));
  }

  function desfazerUltimo() {
    setVertices((prev) => prev.slice(0, -1));
  }

  function limpar() {
    setVertices([]);
  }

  function handleConfirm() {
    if (!podeConfirmar) return;
    onConfirm(latLngToVertices(vertices), areaM2);
    onOpenChange(false);
  }

  if (!unidadeCenter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar área da unidade</DialogTitle>
          <DialogDescription>
            O círculo segue o mouse para indicar onde o próximo vértice será
            marcado. Após o primeiro ponto, uma linha tracejada mostra o
            segmento até o clique. Arraste um ponto já plotado para ajuste fino.
            O marcador padrão indica as coordenadas da unidade. São necessários
            pelo menos 3 pontos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={desfazerUltimo}
            disabled={vertices.length === 0}
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Desfazer último
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={limpar}
            disabled={vertices.length === 0}
          >
            Limpar polígono
          </Button>
        </div>

        <UnidadeAreaMapLeaflet
          center={unidadeCenter}
          zoom={MAP_ZOOM_COORD}
          unidadeMarker={unidadeCenter}
          vertices={vertices}
          onVertexAdd={adicionarVertice}
          onVertexMove={moverVertice}
        />

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Unidade: {formatCoord(unidadeCenter.lat)},{" "}
            {formatCoord(unidadeCenter.lng)}
          </p>
          <p>
            Vértices: {vertices.length}
            {vertices.length >= 3
              ? ` · Área: ${formatAreaM2(areaM2)} m²`
              : " — adicione pelo menos 3 pontos"}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!podeConfirmar}>
            Usar área
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SelecionarAreaButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      <Pentagon className="h-4 w-4" />
      Selecionar área no mapa
    </Button>
  );
}
