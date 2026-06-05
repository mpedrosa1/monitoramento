"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLng } from "@/lib/geocode";

import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapViewSync({
  center,
  zoom,
}: {
  center: LatLng;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

/** Corrige tiles cortados quando o mapa abre dentro de um modal. */
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

function MapClickHandler({ onPick }: { onPick: (pos: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function CoordenadasMapLeaflet({
  center,
  zoom,
  marker,
  onMarkerChange,
}: {
  center: LatLng;
  zoom: number;
  marker: LatLng | null;
  onMarkerChange: (pos: LatLng) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="h-[min(55vh,420px)] w-full rounded-lg border border-border z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewSync center={center} zoom={zoom} />
      <MapInvalidateSize />
      <MapClickHandler onPick={onMarkerChange} />
      {marker && (
        <Marker
          position={[marker.lat, marker.lng]}
          draggable
          eventHandlers={{
            dragend(e) {
              const { lat, lng } = e.target.getLatLng();
              onMarkerChange({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
