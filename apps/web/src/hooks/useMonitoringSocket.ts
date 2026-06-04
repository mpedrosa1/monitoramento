"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceMetric, WSMessage } from "@/lib/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws";

export type SocketStatus = "connecting" | "connected" | "disconnected";

export function useMonitoringSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [metrics, setMetrics] = useState<DeviceMetric[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WSMessage<
          DeviceMetric[] | DeviceMetric
        >;
        if (msg.type === "snapshot" && Array.isArray(msg.payload)) {
          setMetrics(msg.payload);
        } else if (msg.type === "update" && msg.payload) {
          const update = msg.payload as DeviceMetric;
          const key = update.targetId || update.dispositivoId;
          setMetrics((prev) => {
            const idx = prev.findIndex(
              (m) => (m.targetId || m.dispositivoId) === key
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = update;
              return next;
            }
            return [...prev, update];
          });
        }
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, metrics };
}
