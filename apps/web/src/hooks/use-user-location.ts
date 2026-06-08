"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "@/lib/geocode";

export type UserLocationStatus =
  | "idle"
  | "loading"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

function mensagemErroGeolocalizacao(code: number): string {
  switch (code) {
    case 1:
      return "Permissão de localização negada. Ative no navegador para ver a rota até a unidade.";
    case 2:
      return "Localização indisponível no momento.";
    case 3:
      return "Tempo esgotado ao obter sua localização.";
    default:
      return "Não foi possível obter sua localização.";
  }
}

export function useUserLocation(enabled: boolean) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPosition(null);
      setStatus("idle");
      setError(null);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      setError("Geolocalização não suportada neste navegador.");
      return;
    }

    let cancelado = false;
    setStatus("loading");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelado) return;
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus("granted");
      },
      (err) => {
        if (cancelado) return;
        setPosition(null);
        setStatus(err.code === 1 ? "denied" : "error");
        setError(mensagemErroGeolocalizacao(err.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      }
    );

    return () => {
      cancelado = true;
    };
  }, [enabled]);

  return { position, status, error };
}
