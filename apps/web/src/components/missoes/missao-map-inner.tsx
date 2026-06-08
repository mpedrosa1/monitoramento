"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLng } from "@/lib/geocode";
import { SP_STATE_CENTER } from "@/lib/geocode";

import "leaflet/dist/leaflet.css";

function pinIcon(fill: string, stroke: string) {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true">
      <path fill="${fill}" stroke="${stroke}" stroke-width="1.2" d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z"/>
      <circle fill="#ffffff" cx="14" cy="14" r="5"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
}

const userPinIcon = pinIcon("#3b82f6", "#1d4ed8");
const destinationPinIcon = pinIcon("#ef4444", "#b91c1c");

function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function MapCenterSync({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

function MapFitPoints({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join("|");

  useEffect(() => {
    if (points.length < 2) return;
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, key, points]);

  return null;
}

export default function MissaoMapInner({
  destination,
  destinationLabel,
  userPosition,
  routePath,
}: {
  destination: LatLng | null;
  destinationLabel: string;
  userPosition: LatLng | null;
  routePath: LatLng[] | null;
}) {
  const center = destination ?? {
    lat: SP_STATE_CENTER.lat,
    lng: SP_STATE_CENTER.lng,
  };
  const zoom = destination ? 14 : SP_STATE_CENTER.zoom;

  const fitPoints = useMemo(() => {
    if (routePath && routePath.length >= 2) return routePath;
    const pts: LatLng[] = [];
    if (userPosition) pts.push(userPosition);
    if (destination) pts.push(destination);
    return pts.length >= 2 ? pts : [];
  }, [routePath, userPosition, destination]);

  const polylinePositions = useMemo(
    () =>
      routePath?.map((p) => [p.lat, p.lng] as [number, number]) ?? [],
    [routePath]
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="h-full min-h-[280px] w-full rounded-lg border border-border"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Rota <a href="https://project-osrm.org/">OSRM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInvalidateSize />
      {fitPoints.length >= 2 ? (
        <MapFitPoints points={fitPoints} />
      ) : (
        <MapCenterSync center={center} zoom={zoom} />
      )}

      {polylinePositions.length >= 2 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: "#2563eb",
            weight: 5,
            opacity: 0.85,
          }}
        />
      )}

      {userPosition && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={userPinIcon}
        >
          <Popup>Você está aqui</Popup>
        </Marker>
      )}

      {destination && (
        <Marker
          position={[destination.lat, destination.lng]}
          icon={destinationPinIcon}
        >
          <Popup>{destinationLabel}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
