"use client";

import { ChevronLeft, ChevronRight, Loader2, Radio, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  agruparPorOperadora,
  agruparPorTecnologia,
  type LegendaItem,
} from "@/lib/antenas";
import type { AntenaProxima } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Transparência do painel — ajuste o sufixo `/NN` nas classes abaixo (0–100).
 * Quanto menor o número, mais transparente o fundo.
 * Ex.: bg-background/50 = 50% opaco · bg-background/40 = mais transparente
 */
const CLASSE_FUNDO_PAINEL =
  "border-border/50 bg-background/50 shadow-lg backdrop-blur-md";
const CLASSE_FUNDO_ABA =
  "border-border/50 bg-background/50 shadow-sm backdrop-blur-md";

function LegendaSecao({
  titulo,
  itens,
}: {
  titulo: string;
  itens: LegendaItem[];
}) {
  if (itens.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <ul className="space-y-1">
        {itens.map((item) => (
          <li
            key={item.rotulo}
            className="flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-border"
                style={{ backgroundColor: item.cor }}
              />
              <span className="truncate">{item.rotulo}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {item.quantidade}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToggleLinha({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-2 text-xs"
    >
      <span className="text-muted-foreground">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked && "translate-x-4"
          )}
        />
      </button>
    </label>
  );
}

export function AntenasMapPainel({
  aberto,
  onAbertoChange,
  raioKm,
  onRaioKmChange,
  showRaio,
  onShowRaioChange,
  showAntenas,
  onShowAntenasChange,
  antenas,
  loading,
  erro,
}: {
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
  raioKm: number;
  onRaioKmChange: (v: number) => void;
  showRaio: boolean;
  onShowRaioChange: (v: boolean) => void;
  showAntenas: boolean;
  onShowAntenasChange: (v: boolean) => void;
  antenas: AntenaProxima[];
  loading: boolean;
  erro: string | null;
}) {
  const legendaOperadoras = agruparPorOperadora(antenas);
  const legendaTecnologias = agruparPorTecnologia(antenas);

  if (!aberto) {
    return (
      <div className="absolute right-0 top-3 z-[1000]">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className={cn(
            "h-9 w-8 rounded-l-md rounded-r-none border border-r-0",
            CLASSE_FUNDO_ABA
          )}
          onClick={() => onAbertoChange(true)}
          title="Abrir painel de antenas"
          aria-label="Abrir painel de antenas"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute right-3 top-3 z-[1000] flex w-[min(100%-1.5rem,15rem)] flex-col overflow-hidden rounded-lg border",
        CLASSE_FUNDO_PAINEL
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-semibold">Antenas</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 shrink-0"
          onClick={() => onAbertoChange(false)}
          title="Recolher painel"
          aria-label="Recolher painel"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3 px-3 py-2.5 text-xs">
        <div className="rounded-md bg-muted/25 px-2 py-1.5 ring-1 ring-border/30">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando…
            </span>
          ) : erro ? (
            <span className="text-destructive">{erro}</span>
          ) : (
            <span>
              <strong className="text-foreground">{antenas.length}</strong>{" "}
              <span className="text-muted-foreground">
                antena{antenas.length === 1 ? "" : "s"} em {raioKm} km
              </span>
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="raio-km" className="text-[11px] text-muted-foreground">
            Raio: {raioKm} km
          </Label>
          <input
            id="raio-km"
            type="range"
            min={1}
            max={20}
            step={1}
            value={raioKm}
            onChange={(e) => onRaioKmChange(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 km</span>
            <span>20 km</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/40 pt-2">
          <ToggleLinha
            id="toggle-raio"
            label="Exibir raio"
            checked={showRaio}
            onChange={onShowRaioChange}
          />
          <ToggleLinha
            id="toggle-antenas"
            label="Exibir antenas"
            checked={showAntenas}
            onChange={onShowAntenasChange}
          />
        </div>

        {!loading && !erro && antenas.length > 0 && (
          <div className="max-h-[min(28vh,220px)] space-y-3 overflow-y-auto border-t border-border/40 pt-2 pr-0.5">
            <LegendaSecao titulo="Operadoras" itens={legendaOperadoras} />
            <LegendaSecao titulo="Tecnologias" itens={legendaTecnologias} />
          </div>
        )}

        {!loading && !erro && antenas.length === 0 && (
          <p className="flex items-center gap-1.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
            <Radio className="h-3 w-3 shrink-0" />
            Nenhuma antena neste raio.
          </p>
        )}
      </div>
    </div>
  );
}
