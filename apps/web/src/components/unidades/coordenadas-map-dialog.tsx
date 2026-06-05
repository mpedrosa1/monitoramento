"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  enderecoTemConteudo,
  formatCoord,
  geocodificarEndereco,
  MAP_ZOOM_COORD,
  MAP_ZOOM_ENDERECO,
  parseCoordPair,
  SP_STATE_CENTER,
  type LatLng,
} from "@/lib/geocode";
import type { UnidadeEndereco } from "@/lib/types";

const CoordenadasMapLeaflet = dynamic(
  () => import("@/components/unidades/coordenadas-map-leaflet"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(55vh,420px)] items-center justify-center rounded-lg border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

type MapViewState = {
  center: LatLng;
  zoom: number;
  marker: LatLng | null;
};

export function CoordenadasMapDialog({
  open,
  onOpenChange,
  endereco,
  latitude,
  longitude,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endereco: UnidadeEndereco;
  latitude: string;
  longitude: string;
  onConfirm: (latitude: string, longitude: string) => void;
}) {
  const [view, setView] = useState<MapViewState>({
    center: { lat: SP_STATE_CENTER.lat, lng: SP_STATE_CENTER.lng },
    zoom: SP_STATE_CENTER.zoom,
    marker: null,
  });
  const [loading, setLoading] = useState(false);
  const [geoErro, setGeoErro] = useState<string | null>(null);

  const initMap = useCallback(async () => {
    setLoading(true);
    setGeoErro(null);

    const existente = parseCoordPair(latitude, longitude);
    if (existente) {
      setView({
        center: existente,
        zoom: MAP_ZOOM_COORD,
        marker: existente,
      });
      setLoading(false);
      return;
    }

    if (enderecoTemConteudo(endereco)) {
      try {
        const coords = await geocodificarEndereco(endereco);
        if (coords) {
          setView({
            center: coords,
            zoom: MAP_ZOOM_ENDERECO,
            marker: coords,
          });
          setLoading(false);
          return;
        }
        setGeoErro(
          "Não foi possível localizar o endereço no mapa. Clique no mapa para marcar o ponto."
        );
      } catch {
        setGeoErro(
          "Falha ao buscar o endereço. Clique no mapa para marcar o ponto."
        );
      }
    }

    setView({
      center: { lat: SP_STATE_CENTER.lat, lng: SP_STATE_CENTER.lng },
      zoom: SP_STATE_CENTER.zoom,
      marker: null,
    });
    setLoading(false);
  }, [endereco, latitude, longitude]);

  useEffect(() => {
    if (open) void initMap();
  }, [open, initMap]);

  function handleMarkerChange(pos: LatLng) {
    setView((v) => ({ ...v, marker: pos }));
  }

  function handleConfirm() {
    if (!view.marker) return;
    onConfirm(formatCoord(view.marker.lat), formatCoord(view.marker.lng));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] gap-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar coordenadas</DialogTitle>
          <DialogDescription>
            Clique no mapa ou arraste o marcador para definir latitude e
            longitude. O mapa usa o endereço do formulário quando disponível.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-[min(55vh,420px)] items-center justify-center rounded-lg border border-border bg-muted/30">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Preparando mapa…
            </span>
          </div>
        ) : (
          <>
            {geoErro && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {geoErro}
              </p>
            )}
            <CoordenadasMapLeaflet
              center={view.center}
              zoom={view.zoom}
              marker={view.marker}
              onMarkerChange={handleMarkerChange}
            />
            {view.marker ? (
              <p className="text-xs text-muted-foreground">
                Selecionado: {formatCoord(view.marker.lat)},{" "}
                {formatCoord(view.marker.lng)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhum ponto selecionado — clique no mapa para marcar.
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!view.marker || loading}
          >
            Usar coordenadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SelecionarCoordenadasButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      <MapPin className="h-4 w-4" />
      Selecionar coordenadas
    </Button>
  );
}
