"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wifi, WifiOff, Activity } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { EventoMonitoramento, Unidade } from "@/lib/types";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Badge } from "@/components/ui/badge";

const EVENTOS_LIMIT = 200;
/** Limite de eventos mantidos em memória ao receber novos ao vivo. */
const MAX_EVENTOS = 300;

type EventoStatus = "online" | "offline" | "outro";
type Escopo = "geral" | "unidade";

function eventoStatus(e: EventoMonitoramento): EventoStatus {
  const s = typeof e.dados?.status === "string" ? e.dados.status : "";
  if (s === "online" || s === "offline") return s;
  return e.severidade === "alta" ? "offline" : "outro";
}

function eventoHost(e: EventoMonitoramento): string | null {
  const host = typeof e.dados?.host === "string" ? e.dados.host : "";
  if (!host) return null;
  const porta = typeof e.dados?.porta === "number" ? e.dados.porta : 0;
  return porta > 0 ? `${host}:${porta}` : host;
}

function eventoUnidadeId(e: EventoMonitoramento): string | null {
  return typeof e.dados?.unidadeId === "string" ? e.dados.unidadeId : null;
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const FILTROS: { id: "todos" | EventoStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "offline", label: "Offline" },
  { id: "online", label: "Restabelecido" },
];

export function PainelLogsView({
  selectedUnidade,
}: {
  selectedUnidade: Unidade | null;
}) {
  const { status, subscribeEventos } = useMonitoring();
  const [eventos, setEventos] = useState<EventoMonitoramento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | EventoStatus>("todos");
  const [escopo, setEscopo] = useState<Escopo>("geral");

  // Carrega o histórico uma vez; novas ocorrências chegam pelo WebSocket.
  const load = useCallback(async () => {
    try {
      const list = await apiFetch<EventoMonitoramento[] | null>(
        `/api/v1/eventos?limit=${EVENTOS_LIMIT}`
      );
      setEventos(asArray(list));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar registros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Recebe novos eventos em tempo real (offline / restabelecido).
  useEffect(() => {
    const unsubscribe = subscribeEventos((evento) => {
      setEventos((prev) => {
        if (prev.some((e) => e.id === evento.id)) return prev;
        return [evento, ...prev].slice(0, MAX_EVENTOS);
      });
    });
    return unsubscribe;
  }, [subscribeEventos]);

  const visiveis = useMemo(() => {
    let base = eventos;
    if (escopo === "unidade") {
      base = selectedUnidade
        ? base.filter((e) => eventoUnidadeId(e) === selectedUnidade.id)
        : [];
    }
    if (filtro !== "todos") {
      base = base.filter((e) => eventoStatus(e) === filtro);
    }
    return base;
  }, [eventos, escopo, selectedUnidade, filtro]);

  const aoVivo = status === "connected";
  const semUnidade = escopo === "unidade" && !selectedUnidade;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Registros de conectividade
            <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  aoVivo ? "animate-pulse bg-emerald-500" : "bg-amber-500"
                )}
              />
              {aoVivo ? "Ao vivo" : "Reconectando…"}
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {escopo === "unidade"
              ? selectedUnidade
                ? `Registros de ${selectedUnidade.nome}.`
                : "Selecione uma unidade no menu lateral."
              : "Histórico de quando equipamentos e unidades ficaram offline e voltaram online."}
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filtro === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-abas: Geral × Unidade selecionada */}
      <div className="flex shrink-0 items-end gap-1 border-b border-border px-6">
        {(
          [
            { id: "geral", label: "Geral" },
            { id: "unidade", label: "Unidade" },
          ] as const
        ).map((aba) => {
          const active = escopo === aba.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setEscopo(aba.id)}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {aba.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {erro ? (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erro}
          </p>
        ) : semUnidade ? (
          <p className="text-sm text-muted-foreground">
            Selecione uma unidade no menu lateral para ver seus registros.
          </p>
        ) : loading && eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carregando registros…</p>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum registro {filtro === "todos" ? "" : "para este filtro "}até o
            momento.
          </p>
        ) : (
          <ul className="space-y-2">
            {visiveis.map((e) => {
              const evStatus = eventoStatus(e);
              const host = eventoHost(e);
              const offline = evStatus === "offline";
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      offline
                        ? "bg-destructive/15 text-destructive"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {offline ? (
                      <WifiOff className="h-4 w-4" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.mensagem}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {host ? `${host} · ` : ""}
                      {e.tipo.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={offline ? "destructive" : "secondary"}
                      className={cn(
                        !offline &&
                          "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {offline ? "Offline" : "Online"}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatarDataHora(e.createdAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
