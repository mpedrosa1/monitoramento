"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, Loader2, MapPin, Navigation } from "lucide-react";
import { useUserLocation } from "@/hooks/use-user-location";
import { googleMapsDirectionsUrl, type LatLng } from "@/lib/geocode";
import { Button } from "@/components/ui/button";
import {
  fetchOsrmRoute,
  formatRouteDistance,
  formatRouteDuration,
  type OsrmRouteResult,
} from "@/lib/osrm-route";

const MapInner = dynamic(() => import("@/components/missoes/missao-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-border bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function MissaoMap({
  destination,
  label,
}: {
  destination: LatLng | null;
  label: string;
}) {
  const podeRotear = destination != null;
  const { position: userPosition, status: locStatus, error: locError } =
    useUserLocation(podeRotear);

  const [route, setRoute] = useState<OsrmRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  useEffect(() => {
    if (!userPosition || !destination) {
      setRoute(null);
      setRouteError(null);
      setRouteLoading(false);
      return;
    }

    let cancelado = false;
    setRouteLoading(true);
    setRouteError(null);

    fetchOsrmRoute(userPosition, destination)
      .then((result) => {
        if (cancelado) return;
        if (!result) {
          setRoute(null);
          setRouteError("Não foi possível calcular a rota.");
          return;
        }
        setRoute(result);
      })
      .catch(() => {
        if (cancelado) return;
        setRoute(null);
        setRouteError("Erro ao consultar o serviço de rotas.");
      })
      .finally(() => {
        if (!cancelado) setRouteLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [userPosition, destination]);

  const locLoading = podeRotear && locStatus === "loading";

  const googleMapsUrl = useMemo(() => {
    if (!destination) return null;
    return googleMapsDirectionsUrl(destination, userPosition);
  }, [destination, userPosition]);

  return (
    <div className="space-y-2">
      {podeRotear && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {locLoading && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Obtendo sua localização…
            </span>
          )}
          {userPosition && routeLoading && (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculando rota…
            </span>
          )}
          {route && !routeLoading && (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
                {formatRouteDistance(route.distanceMeters)}
              </span>
              <span>{formatRouteDuration(route.durationSeconds)} estimados</span>
              <span className="text-[11px]">(sem trânsito em tempo real)</span>
            </>
          )}
        </div>
      )}

      {(locError || routeError) && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {locError ?? routeError}
        </p>
      )}

      {podeRotear && userPosition && route && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          Sua localização
          <span className="text-foreground/40">→</span>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
          {label}
        </p>
      )}

      <div className="relative h-full min-h-[280px] w-full">
        {googleMapsUrl && (
          <Button
            variant="secondary"
            size="sm"
            nativeButton={false}
            className="absolute top-2 right-2 z-[1000] shadow-md"
            render={
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir rota no Google Maps"
              />
            }
          >
            <ExternalLink data-icon="inline-start" />
            Google Maps
          </Button>
        )}
        <MapInner
          destination={destination}
          destinationLabel={label}
          userPosition={userPosition}
          routePath={route?.path ?? null}
        />
      </div>
    </div>
  );
}
