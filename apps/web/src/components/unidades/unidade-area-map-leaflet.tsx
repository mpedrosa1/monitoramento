"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLng } from "@/lib/geocode";

import "leaflet/dist/leaflet.css";

const VERTEX_RADIUS = 6;
const VERTEX_HANDLE_SIZE = VERTEX_RADIUS * 2 + 4;

const vertexHandleIcon = L.divIcon({
  className: "unidade-area-vertex-handle",
  html: `<div class="unidade-area-vertex-handle__dot" aria-hidden="true"></div>`,
  iconSize: [VERTEX_HANDLE_SIZE, VERTEX_HANDLE_SIZE],
  iconAnchor: [VERTEX_HANDLE_SIZE / 2, VERTEX_HANDLE_SIZE / 2],
});

const PREVIEW_VERTEX_STYLE = {
  color: "#1d4ed8",
  fillColor: "#93c5fd",
  fillOpacity: 0.55,
  weight: 2,
} as const;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapViewSync({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: false });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

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

/** Oculta o cursor padrão; o círculo de pré-visualização substitui o ponteiro. */
function MapHideDefaultCursor() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const prev = el.style.cursor;
    el.style.cursor = "none";
    return () => {
      el.style.cursor = prev;
    };
  }, [map]);
  return null;
}

function MapDrawingHandler({
  onPick,
  onHoverChange,
}: {
  onPick: (pos: LatLng) => void;
  onHoverChange: (pos: LatLng | null) => void;
}) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mousemove(e) {
      onHoverChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    mouseout() {
      onHoverChange(null);
    },
  });
  return null;
}

function DraggableVertex({
  index,
  position,
  onMove,
}: {
  index: number;
  position: LatLng;
  onMove: (index: number, pos: LatLng) => void;
}) {
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={vertexHandleIcon}
      draggable
      zIndexOffset={1000}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
        },
        mousedown: (e) => {
          L.DomEvent.stopPropagation(e);
        },
        dragstart: (e) => {
          L.DomEvent.stopPropagation(e);
        },
        drag: (e) => {
          const ll = e.target.getLatLng();
          onMove(index, {
            lat: Number(ll.lat.toFixed(6)),
            lng: Number(ll.lng.toFixed(6)),
          });
        },
        dragend: (e) => {
          const ll = e.target.getLatLng();
          onMove(index, {
            lat: Number(ll.lat.toFixed(6)),
            lng: Number(ll.lng.toFixed(6)),
          });
        },
      }}
    />
  );
}

export default function UnidadeAreaMapLeaflet({
  center,
  zoom,
  unidadeMarker,
  vertices,
  onVertexAdd,
  onVertexMove,
}: {
  center: LatLng;
  zoom: number;
  unidadeMarker: LatLng;
  vertices: LatLng[];
  onVertexAdd: (pos: LatLng) => void;
  onVertexMove: (index: number, pos: LatLng) => void;
}) {
  const [hoverPos, setHoverPos] = useState<LatLng | null>(null);
  const positions = vertices.map((v) => [v.lat, v.lng] as [number, number]);
  const ultimoVertice = vertices.length > 0 ? vertices[vertices.length - 1] : null;

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
      <MapHideDefaultCursor />
      <MapDrawingHandler onPick={onVertexAdd} onHoverChange={setHoverPos} />

      <Marker position={[unidadeMarker.lat, unidadeMarker.lng]} />

      {vertices.length >= 2 ? (
        <Polyline
          positions={positions}
          pathOptions={{ color: "#3b82f6", weight: 2, dashArray: "6 4" }}
        />
      ) : null}

      {vertices.length >= 3 ? (
        <Polygon
          positions={positions}
          pathOptions={{
            color: "#2563eb",
            weight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.25,
          }}
        />
      ) : null}

      {ultimoVertice && hoverPos ? (
        <Polyline
          positions={[
            [ultimoVertice.lat, ultimoVertice.lng],
            [hoverPos.lat, hoverPos.lng],
          ]}
          pathOptions={{
            color: "#60a5fa",
            weight: 2,
            dashArray: "5 7",
            opacity: 0.95,
          }}
        />
      ) : null}

      {vertices.map((v, i) => (
        <DraggableVertex
          key={`vertex-${i}`}
          index={i}
          position={v}
          onMove={onVertexMove}
        />
      ))}

      {hoverPos ? (
        <CircleMarker
          center={[hoverPos.lat, hoverPos.lng]}
          radius={VERTEX_RADIUS}
          pathOptions={PREVIEW_VERTEX_STYLE}
          interactive={false}
        />
      ) : null}
    </MapContainer>
  );
}
