"use client";

import { ArrowLeft, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import {
  MAPA_HUD_SCALE_MAX,
  MAPA_HUD_SCALE_MIN,
} from "@/lib/mapa-hud-scale";
import { cn } from "@/lib/utils";

const MAPA_HUD_ROUND_BTN_CLASS =
  "pointer-events-auto h-9 w-9 rounded-full border border-white/15 bg-background/70 shadow-lg backdrop-blur-xl";

export function PainelMapaHudEscalaTrilha({
  value,
  onChange,
}: {
  value: number;
  onChange: (scale: number) => void;
}) {
  const pct =
    ((value - MAPA_HUD_SCALE_MIN) / (MAPA_HUD_SCALE_MAX - MAPA_HUD_SCALE_MIN)) *
    100;

  return (
    <PainelMapaHudGlass className="flex flex-col items-center gap-1.5 px-2 py-2.5">
      <span className="text-[9px] font-medium text-muted-foreground">+</span>
      <div className="relative flex h-24 w-7 items-center justify-center">
        <div
          className="absolute inset-x-[11px] inset-y-1 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="absolute bottom-1 top-1 w-1 rounded-full bg-primary/35"
          style={{ top: `${100 - pct}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={MAPA_HUD_SCALE_MIN * 100}
          max={MAPA_HUD_SCALE_MAX * 100}
          step={5}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className={cn(
            "relative z-10 h-24 w-7 cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-24 [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:-ml-[7px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/25 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-md",
            "[&::-moz-range-track]:h-24 [&::-moz-range-track]:w-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white/25 [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-md"
          )}
          style={{
            WebkitAppearance: "slider-vertical",
            writingMode: "vertical-lr",
            direction: "rtl",
          }}
          aria-label="Escala do HUD"
          title={`Escala ${Math.round(value * 100)}%`}
        />
      </div>
      <span className="text-[9px] font-medium text-muted-foreground">−</span>
    </PainelMapaHudGlass>
  );
}

export function PainelMapaHudControlesColuna({
  hudScale,
  onHudScaleChange,
  onExitFullscreen,
  onVoltarHudGeral,
}: {
  hudScale: number;
  onHudScaleChange: (scale: number) => void;
  onExitFullscreen: () => void;
  onVoltarHudGeral?: () => void;
}) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className={MAPA_HUD_ROUND_BTN_CLASS}
        onClick={onExitFullscreen}
        aria-label="Sair da tela cheia"
        title="Sair da tela cheia"
      >
        <Minimize2 className="h-4 w-4" />
      </Button>
      {onVoltarHudGeral ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className={MAPA_HUD_ROUND_BTN_CLASS}
          onClick={onVoltarHudGeral}
          aria-label="Voltar ao HUD geral"
          title="Voltar ao HUD geral"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : null}
      <PainelMapaHudEscalaTrilha value={hudScale} onChange={onHudScaleChange} />
    </div>
  );
}

export function PainelMapaHudControlesFullscreen({
  hudScale,
  onHudScaleChange,
  onExitFullscreen,
  onVoltarHudGeral,
}: {
  hudScale: number;
  onHudScaleChange: (scale: number) => void;
  onExitFullscreen: () => void;
  onVoltarHudGeral?: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-[1200] flex w-10 flex-col items-center gap-2 sm:right-4 sm:top-4">
      <PainelMapaHudControlesColuna
        hudScale={hudScale}
        onHudScaleChange={onHudScaleChange}
        onExitFullscreen={onExitFullscreen}
        onVoltarHudGeral={onVoltarHudGeral}
      />
    </div>
  );
}
