"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { getWsBaseUrl } from "@/lib/api-base-url";
import type { DeviceMetric, Notificacao, VeiculoPosicao, VeiculoProximidadeAlerta, WSMessage } from "@/lib/types";

function wsUrlWithToken(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  const base = getWsBaseUrl();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}

export type SocketStatus = "connecting" | "connected" | "disconnected";

type NotificationListener = (notification: Notificacao) => void;
type ProximityAlertListener = (alerta: VeiculoProximidadeAlerta) => void;

export function useMonitoringSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [metrics, setMetrics] = useState<DeviceMetric[]>([]);
  const [veiculoPosicoes, setVeiculoPosicoes] = useState<VeiculoPosicao[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationListenersRef = useRef<Set<NotificationListener>>(new Set());
  const proximityListenersRef = useRef<Set<ProximityAlertListener>>(new Set());

  const subscribeNotifications = useCallback(
    (listener: NotificationListener) => {
      notificationListenersRef.current.add(listener);
      return () => {
        notificationListenersRef.current.delete(listener);
      };
    },
    []
  );

  const subscribeProximityAlerts = useCallback(
    (listener: ProximityAlertListener) => {
      proximityListenersRef.current.add(listener);
      return () => {
        proximityListenersRef.current.delete(listener);
      };
    },
    []
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = wsUrlWithToken();
    if (!url) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as WSMessage<
          | DeviceMetric[]
          | DeviceMetric
          | Notificacao
          | VeiculoPosicao[]
          | VeiculoProximidadeAlerta
        >;
        if (msg.type === "snapshot" && Array.isArray(msg.payload)) {
          setMetrics(msg.payload as DeviceMetric[]);
        } else if (msg.type === "veiculo_posicoes_snapshot" && Array.isArray(msg.payload)) {
          setVeiculoPosicoes(msg.payload as VeiculoPosicao[]);
        } else if (msg.type === "veiculo_posicoes_update" && Array.isArray(msg.payload)) {
          setVeiculoPosicoes(msg.payload as VeiculoPosicao[]);
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
        } else if (msg.type === "notification" && msg.payload) {
          const notification = msg.payload as Notificacao;
          for (const listener of notificationListenersRef.current) {
            listener(notification);
          }
        } else if (msg.type === "veiculo_proximidade_alerta" && msg.payload) {
          const alerta = msg.payload as VeiculoProximidadeAlerta;
          for (const listener of proximityListenersRef.current) {
            listener(alerta);
          }
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

  return { status, metrics, veiculoPosicoes, subscribeNotifications, subscribeProximityAlerts };
}
