"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";

export type MapHudScreenPoint = { x: number; y: number };

type MapHudProjectionContextValue = {
  registerMap: (map: LeafletMap | null) => void;
  registerOverlay: (el: HTMLElement | null) => void;
  projectLatLng: (lat: number, lng: number) => MapHudScreenPoint | null;
  bump: () => void;
  tick: number;
};

const MapHudProjectionContext =
  createContext<MapHudProjectionContextValue | null>(null);

export function MapHudProjectionProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const [tick, setTick] = useState(0);

  const bump = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  const registerMap = useCallback((map: LeafletMap | null) => {
    if (mapRef.current === map) return;
    mapRef.current = map;
    if (map && overlayRef.current) bump();
  }, [bump]);

  const registerOverlay = useCallback((el: HTMLElement | null) => {
    if (overlayRef.current === el) return;
    overlayRef.current = el;
    if (el && mapRef.current) bump();
  }, [bump]);

  const projectLatLng = useCallback(
    (lat: number, lng: number): MapHudScreenPoint | null => {
      const map = mapRef.current;
      const overlay = overlayRef.current;
      if (!map || !overlay) return null;

      const mapPoint = map.latLngToContainerPoint([lat, lng]);
      const overlayRect = overlay.getBoundingClientRect();
      const mapRect = map.getContainer().getBoundingClientRect();

      return {
        x: mapPoint.x + mapRect.left - overlayRect.left,
        y: mapPoint.y + mapRect.top - overlayRect.top,
      };
    },
    []
  );

  const value = useMemo(
    () => ({ registerMap, registerOverlay, projectLatLng, bump, tick }),
    [registerMap, registerOverlay, projectLatLng, bump, tick]
  );

  return (
    <MapHudProjectionContext.Provider value={value}>
      {children}
    </MapHudProjectionContext.Provider>
  );
}

export function useMapHudProjection() {
  return useContext(MapHudProjectionContext);
}

/** Dentro do MapContainer: mantém projeção atualizada ao mover/zoomar o mapa. */
export function MapHudMapProjectionBridge() {
  const map = useMap();
  const ctx = useMapHudProjection();
  const registerMapRef = useRef(ctx?.registerMap);
  const bumpRef = useRef(ctx?.bump);
  registerMapRef.current = ctx?.registerMap;
  bumpRef.current = ctx?.bump;

  useEffect(() => {
    const registerMap = registerMapRef.current;
    if (!registerMap) return;

    registerMap(map);
    const onUpdate = () => bumpRef.current?.();
    map.on("move zoom zoomend moveend viewreset resize", onUpdate);
    window.addEventListener("resize", onUpdate);

    return () => {
      map.off("move zoom zoomend moveend viewreset resize", onUpdate);
      window.removeEventListener("resize", onUpdate);
      registerMapRef.current?.(null);
    };
  }, [map]);

  return null;
}
