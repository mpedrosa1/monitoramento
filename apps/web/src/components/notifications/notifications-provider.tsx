"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isNotificacaoTrocaAcionavel,
  listNotificacoes,
  marcarNotificacaoLida,
  responderTrocaVeiculo,
} from "@/lib/notificacoes";
import type { Notificacao } from "@/lib/types";
import { useMonitoring } from "@/components/dashboard/monitoring-context";

type NotificationsContextValue = {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  refresh: () => Promise<void>;
  marcarLida: (id: string) => Promise<void>;
  responderTroca: (trocaId: string, aceitar: boolean) => Promise<void>;
  pendingTrocaPopup: Notificacao | null;
  dismissTrocaPopup: () => void;
  dismissNotification: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { subscribeNotifications } = useMonitoring();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupQueue, setPopupQueue] = useState<Notificacao[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const enqueuePopup = useCallback((n: Notificacao) => {
    if (!isNotificacaoTrocaAcionavel(n)) return;
    setPopupQueue((prev) => {
      if (prev.some((x) => x.id === n.id)) return prev;
      return [...prev, n];
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await listNotificacoes();
      setNotificacoes(list);
      for (const n of list) {
        if (isNotificacaoTrocaAcionavel(n)) {
          enqueuePopup(n);
        }
      }
    } catch {
      setNotificacoes([]);
    } finally {
      setLoading(false);
    }
  }, [enqueuePopup]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeNotifications((n) => {
      setNotificacoes((prev) => {
        const idx = prev.findIndex((x) => x.id === n.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = n;
          return next;
        }
        return [n, ...prev];
      });
      enqueuePopup(n);
    });
  }, [subscribeNotifications, enqueuePopup]);

  const naoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes]
  );

  const pendingTrocaPopup = useMemo(() => {
    return (
      popupQueue.find(
        (n) => !dismissedIds.has(n.id) && isNotificacaoTrocaAcionavel(n)
      ) ?? null
    );
  }, [popupQueue, dismissedIds]);

  const dismissTrocaPopup = useCallback(() => {
    if (!pendingTrocaPopup) return;
    setDismissedIds((prev) => new Set(prev).add(pendingTrocaPopup.id));
    setPopupQueue((prev) => prev.filter((n) => n.id !== pendingTrocaPopup.id));
  }, [pendingTrocaPopup]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setPopupQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const marcarLida = useCallback(
    async (id: string) => {
      await marcarNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    },
    []
  );

  const responderTroca = useCallback(
    async (trocaId: string, aceitar: boolean) => {
      await responderTrocaVeiculo(trocaId, aceitar);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      notificacoes,
      naoLidas,
      loading,
      refresh,
      marcarLida,
      responderTroca,
      pendingTrocaPopup,
      dismissTrocaPopup,
      dismissNotification,
    }),
    [
      notificacoes,
      naoLidas,
      loading,
      refresh,
      marcarLida,
      responderTroca,
      pendingTrocaPopup,
      dismissTrocaPopup,
      dismissNotification,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications deve ser usado dentro de NotificationsProvider"
    );
  }
  return ctx;
}
