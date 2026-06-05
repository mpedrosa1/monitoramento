"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "@/lib/geocode";
import { SP_STATE_CENTER } from "@/lib/geocode";

import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 300);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map]);
  return null;
}

export default function UnidadeDetailMapInner({
  position,
  label,
}: {
  position: LatLng | null;
  label: string;
}) {
  const center = position ?? {
    lat: SP_STATE_CENTER.lat,
    lng: SP_STATE_CENTER.lng,
  };
  const zoom = position ? 16 : SP_STATE_CENTER.zoom;

  return (
    <div className="relative h-full min-h-[min(70vh,520px)] w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full min-h-[min(70vh,520px)] w-full rounded-lg border border-border z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInvalidateSize />
        {position && (
          <Marker position={[position.lat, position.lng]} title={label} />
        )}
      </MapContainer>
      {!position && (
        <p className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-md bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground ring-1 ring-border">
          Coordenadas não cadastradas — mapa centrado em São Paulo.
        </p>
      )}
    </div>
  );
}
