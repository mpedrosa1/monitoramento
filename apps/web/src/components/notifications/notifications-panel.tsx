"use client";

import { useState } from "react";
import { formatDateTimeBR } from "@/lib/time";
import { isNotificacaoTrocaAcionavel } from "@/lib/notificacoes";
import type { Notificacao } from "@/lib/types";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NotificacaoItem({ notificacao }: { notificacao: Notificacao }) {
  const { marcarLida, responderTroca, dismissNotification } = useNotifications();
  const [loading, setLoading] = useState<"aceitar" | "recusar" | "lida" | null>(
    null
  );
  const acionavel = isNotificacaoTrocaAcionavel(notificacao);
  const trocaId = notificacao.payload.trocaId;

  async function handleMarcarLida() {
    if (notificacao.lida || loading) return;
    setLoading("lida");
    try {
      await marcarLida(notificacao.id);
      dismissNotification(notificacao.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao marcar como lida");
    } finally {
      setLoading(null);
    }
  }

  async function handleResponder(aceitar: boolean) {
    if (!trocaId) return;
    setLoading(aceitar ? "aceitar" : "recusar");
    try {
      await responderTroca(trocaId, aceitar);
      await marcarLida(notificacao.id);
      dismissNotification(notificacao.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao responder");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-left transition-colors",
        notificacao.lida
          ? "border-border/60 bg-muted/20"
          : "border-primary/25 bg-primary/5",
        !notificacao.lida && !acionavel && "cursor-pointer hover:bg-primary/10"
      )}
      role={!notificacao.lida && !acionavel ? "button" : undefined}
      tabIndex={!notificacao.lida && !acionavel ? 0 : undefined}
      onClick={() => {
        if (!acionavel && !notificacao.lida) {
          void handleMarcarLida();
        }
      }}
      onKeyDown={(e) => {
        if (
          !acionavel &&
          !notificacao.lida &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          void handleMarcarLida();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{notificacao.titulo}</p>
        {!notificacao.lida ? (
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{notificacao.mensagem}</p>
      <p className="mt-1.5 text-[10px] text-muted-foreground/80">
        {formatDateTimeBR(notificacao.createdAt)}
      </p>

      {acionavel ? (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 flex-1 text-xs"
              disabled={loading !== null}
              onClick={() => void handleResponder(false)}
            >
              Recusar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 flex-1 text-xs"
              disabled={loading !== null}
              onClick={() => void handleResponder(true)}
            >
              Aceitar
            </Button>
          </div>
          {!notificacao.lida ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              disabled={loading !== null}
              onClick={() => void handleMarcarLida()}
            >
              {loading === "lida" ? "Marcando…" : "Marcar como lida"}
            </button>
          ) : null}
        </div>
      ) : !notificacao.lida ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Toque para marcar como lida
        </p>
      ) : null}
    </div>
  );
}

export function NotificationsPanel() {
  const { notificacoes, loading, naoLidas, marcarLida, dismissNotification } =
    useNotifications();
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  async function marcarTodasLidas() {
    const naoLidasList = notificacoes.filter((n) => !n.lida);
    if (naoLidasList.length === 0) return;
    setMarcandoTodas(true);
    try {
      await Promise.all(
        naoLidasList.map(async (n) => {
          await marcarLida(n.id);
          dismissNotification(n.id);
        })
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao marcar notificações");
    } finally {
      setMarcandoTodas(false);
    }
  }

  return (
    <div className="flex max-h-[min(60vh,24rem)] flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-xs text-muted-foreground">
            {naoLidas > 0
              ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`
              : "Tudo em dia"}
          </p>
        </div>
        {naoLidas > 0 ? (
          <button
            type="button"
            className="shrink-0 text-xs text-primary hover:underline disabled:opacity-50"
            disabled={marcandoTodas}
            onClick={() => void marcarTodasLidas()}
          >
            {marcandoTodas ? "Marcando…" : "Marcar todas"}
          </button>
        ) : null}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Carregando…
          </p>
        ) : notificacoes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhuma notificação.
          </p>
        ) : (
          notificacoes.map((n) => (
            <NotificacaoItem key={n.id} notificacao={n} />
          ))
        )}
      </div>
    </div>
  );
}
