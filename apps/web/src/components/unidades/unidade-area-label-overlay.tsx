"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import type { LatLng } from "@/lib/geocode";
import {
  AREA_LABEL_FONT_WEIGHT,
  fitAreaLabelFontSize,
  insetScreenPoints,
} from "@/lib/unidade-area";

type AreaLabelLayout = {
  left: number;
  top: number;
  width: number;
  height: number;
  clipPath: string;
  fontSize: number;
};

export function UnidadeAreaLabelOverlay({
  vertices,
  text,
  visible,
}: {
  vertices: LatLng[];
  text: string;
  visible: boolean;
}) {
  const map = useMap();
  const [layout, setLayout] = useState<AreaLabelLayout | null>(null);
  const verticesKey = useMemo(
    () => vertices.map((v) => `${v.lat},${v.lng}`).join("|"),
    [vertices]
  );

  useEffect(() => {
    if (!visible || vertices.length < 3) {
      setLayout(null);
      return;
    }

    const atualizar = () => {
      const screenPts = vertices.map((v) => {
        const p = map.latLngToContainerPoint([v.lat, v.lng]);
        return { x: p.x, y: p.y };
      });
      const labelPts = insetScreenPoints(screenPts);
      const xs = labelPts.map((p) => p.x);
      const ys = labelPts.map((p) => p.y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const width = Math.max(...xs) - left;
      const height = Math.max(...ys) - top;

      if (width < 8 || height < 8) {
        setLayout(null);
        return;
      }

      const clipPath = `polygon(${labelPts
        .map((p) => `${p.x - left}px ${p.y - top}px`)
        .join(", ")})`;
      const fontSize = fitAreaLabelFontSize(text, width, height);

      setLayout({ left, top, width, height, clipPath, fontSize });
    };

    atualizar();
    map.on("zoom zoomend move moveend resize viewreset", atualizar);
    return () => {
      map.off("zoom zoomend move moveend resize viewreset", atualizar);
    };
  }, [map, visible, text, verticesKey, vertices]);

  if (!visible || !layout) return null;

  return createPortal(
    <div
      className="unidade-area-label-overlay"
      style={{
        position: "absolute",
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        clipPath: layout.clipPath,
      }}
    >
      <span
        className="unidade-area-label-overlay__text"
        style={{ fontSize: layout.fontSize, fontWeight: AREA_LABEL_FONT_WEIGHT }}
      >
        {text}
      </span>
    </div>,
    map.getContainer()
  );
}
