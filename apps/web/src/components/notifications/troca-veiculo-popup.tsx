"use client";

import { useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { toast } from "sonner";
import { formatPlaca } from "@/lib/veiculo-placa";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TrocaVeiculoPopup() {
  const { pendingTrocaPopup, responderTroca, dismissTrocaPopup, marcarLida, dismissNotification } =
    useNotifications();
  const [loading, setLoading] = useState<"aceitar" | "recusar" | null>(null);

  if (!pendingTrocaPopup) return null;

  const { payload, mensagem, titulo } = pendingTrocaPopup;
  const trocaId = payload.trocaId;
  const placaAlvo = payload.veiculoAlvoPlaca
    ? formatPlaca(payload.veiculoAlvoPlaca)
    : "—";
  const placaOfertada = payload.veiculoOfertadoPlaca
    ? formatPlaca(payload.veiculoOfertadoPlaca)
    : null;
  const solicitante = payload.solicitanteNome?.trim() || "Um colaborador";

  async function handleResponder(aceitar: boolean) {
    if (!trocaId) return;
    setLoading(aceitar ? "aceitar" : "recusar");
    try {
      await responderTroca(trocaId, aceitar);
      await marcarLida(pendingTrocaPopup!.id);
      dismissNotification(pendingTrocaPopup!.id);
      toast.success(
        aceitar ? "Troca confirmada com sucesso." : "Solicitação recusada."
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao responder";
      toast.error(msg);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] w-[min(100vw-2rem,22rem)]",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
      role="alertdialog"
      aria-labelledby="troca-popup-title"
      aria-describedby="troca-popup-desc"
    >
      <div className="overflow-hidden rounded-xl border border-primary/30 bg-card shadow-xl ring-1 ring-primary/20">
        <div className="flex items-start gap-3 border-b border-border bg-primary/5 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              id="troca-popup-title"
              className="text-sm font-semibold leading-tight"
            >
              {titulo}
            </p>
            <p
              id="troca-popup-desc"
              className="mt-1 text-xs text-muted-foreground"
            >
              {mensagem}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={dismissTrocaPopup}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 px-4 py-3 text-sm">
          <p>
            <span className="text-muted-foreground">Solicitante: </span>
            <span className="font-medium">{solicitante}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Veículo desejado: </span>
            <span className="font-mono font-semibold">{placaAlvo}</span>
          </p>
          {placaOfertada ? (
            <p>
              <span className="text-muted-foreground">Oferece em troca: </span>
              <span className="font-mono font-semibold">{placaOfertada}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              O solicitante deseja assumir este veículo sem oferecer outro em
              troca.
            </p>
          )}
        </div>
        <div className="flex gap-2 border-t border-border bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => void handleResponder(false)}
          >
            {loading === "recusar" ? "Recusando…" : "Recusar"}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={loading !== null}
            onClick={() => void handleResponder(true)}
          >
            {loading === "aceitar" ? "Confirmando…" : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
