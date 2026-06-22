"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cpu,
  Droplets,
  Loader2,
  MapPin,
  Network,
  Sun,
  Wind,
  X,
  LocateFixed,
} from "lucide-react";
import { asArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contarEquipamentosUnidade } from "@/components/unidades/unidade-equipamentos-grid";
import { PainelMapaHudEquipamentosFlutuantes } from "@/components/painel/painel-mapa-hud-equipamentos-flutuantes";
import { PainelMapaHudControlesFullscreen } from "@/components/painel/painel-mapa-hud-controls";
import type { MapaTileVisao } from "@/lib/mapa-tile-layers";
import { formatCoord } from "@/lib/geocode";
import {
  climaWeatherLabel,
  climaWindDirectionLabel,
} from "@/lib/open-meteo";
import {
  unidadeConnectivityLabel,
  unidadeConnectivityStatus,
} from "@/lib/unidade-form";
import { mapaHudCornerScaleStyle } from "@/lib/mapa-hud-scale";
import {
  MAPA_HUD_CONTROLS_RAIL_CLASS,
} from "@/lib/mapa-hud-layout";
import { useMapaHudScale } from "@/hooks/use-mapa-hud-scale";
import { veiculoCardStorageKeyUnidade } from "@/lib/mapa-hud-layout-storage";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { monitorTargetId, monitorUnidadeHostTargetId } from "@/lib/types";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";
import { useUnidadeClima } from "@/hooks/use-unidade-clima";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import { PainelMapaHudPresencaColaboradores } from "@/components/painel/painel-mapa-hud-presenca-colaboradores";
import {
  PainelMapaHudVeiculoCard,
  type VeiculoHudSelecao,
} from "@/components/painel/painel-mapa-hud-veiculo-card";
import type { PresencaColaboradorHud } from "@/lib/veiculo-presenca-unidade";

const MAPA_HUD_ROUND_BTN_CLASS =
  "pointer-events-auto h-9 w-9 rounded-full border border-white/15 bg-background/70 shadow-lg backdrop-blur-xl";

function statusBadgeClass(
  status: ReturnType<typeof unidadeConnectivityStatus>
): string {
  switch (status) {
    case "online":
      return "border-emerald-400/50 bg-emerald-500/20 text-emerald-100";
    case "offline":
      return "border-destructive/50 bg-destructive/20 text-red-100";
    case "sem_ip":
      return "border-white/20 bg-white/10 text-foreground/90";
  }
}

function resumoEquipamentos(
  unidade: Unidade,
  metricMap: Map<string, DeviceMetric>
) {
  const links = unidade.equipamentos ?? [];
  let online = 0;
  let comMetrica = 0;
  for (const link of links) {
    const metric = metricMap.get(
      monitorTargetId(unidade.id, link.equipamentoId, link.porta)
    );
    if (!metric) continue;
    comMetrica++;
    if (metric.online) online++;
  }
  return { online, comMetrica, total: links.length };
}

function weatherIcon(code: number, className?: string) {
  const cls = cn("h-8 w-8 shrink-0", className);
  if (code === 0) return <Sun className={cn(cls, "text-amber-400")} />;
  if (code <= 2) return <CloudSun className={cn(cls, "text-amber-300")} />;
  if (code === 3) return <Cloud className={cn(cls, "text-slate-300")} />;
  if (code === 45 || code === 48) return <CloudFog className={cn(cls, "text-slate-400")} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={cn(cls, "text-sky-400")} />;
  if (code >= 61 && code <= 67) return <CloudRain className={cn(cls, "text-sky-500")} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cn(cls, "text-sky-200")} />;
  if (code >= 80 && code <= 82) return <CloudRain className={cn(cls, "text-sky-500")} />;
  if (code >= 95) return <CloudLightning className={cn(cls, "text-violet-400")} />;
  return <Cloud className={cls} />;
}

function formatClimaHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function PainelMapaClimaHud({
  lat,
  lng,
  localLabel,
}: {
  lat: number;
  lng: number;
  localLabel?: string;
}) {
  const clima = useUnidadeClima(lat, lng);

  return (
    <PainelMapaHudGlass
      accent="weather"
      className="slide-in-from-top-2 w-[min(100%,14rem)] max-w-full animate-in delay-75 sm:w-[min(100%,16rem)]"
    >
      <div className="p-3.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Clima local
        </p>
        {localLabel ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{localLabel}</p>
        ) : null}

        {clima.status === "loading" || clima.status === "idle" ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Consultando…
          </div>
        ) : clima.status === "error" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Clima indisponível no momento.
          </p>
        ) : clima.status === "no-coords" ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Sem coordenadas para previsão.
          </p>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              {weatherIcon(clima.data.weatherCode)}
              <div className="min-w-0">
                <p className="font-mono text-3xl font-semibold tabular-nums leading-none">
                  {Math.round(clima.data.temperatureC)}
                  <span className="text-lg font-normal text-muted-foreground">°C</span>
                </p>
                <p className="mt-1 truncate text-xs text-foreground/90">
                  {climaWeatherLabel(clima.data.weatherCode)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-background/30 px-2 py-1.5">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Droplets className="h-3 w-3" />
                  Umidade
                </span>
                <p className="mt-0.5 font-mono font-medium tabular-nums">
                  {clima.data.humidityPct}%
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-background/30 px-2 py-1.5">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Wind className="h-3 w-3" />
                  Vento
                </span>
                <p className="mt-0.5 font-mono font-medium tabular-nums">
                  {Math.round(clima.data.windSpeedKmh)} km/h{" "}
                  <span className="text-muted-foreground">
                    {climaWindDirectionLabel(clima.data.windDirectionDeg)}
                  </span>
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-background/30 px-2 py-1.5">
                <span className="text-muted-foreground">Sensação térmica</span>
                <p className="mt-0.5 font-mono font-medium tabular-nums">
                  {Math.round(clima.data.apparentTemperatureC)}°C
                  {clima.data.precipitationMm > 0 ? (
                    <span className="ml-2 text-sky-400">
                      · {clima.data.precipitationMm.toFixed(1)} mm
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground">
              Atualizado às {formatClimaHora(clima.data.observedAt)} · Open-Meteo
            </p>
          </>
        )}
      </div>
    </PainelMapaHudGlass>
  );
}

export function PainelMapaUnidadeHud({
  unidade,
  catalogo,
  metricMap,
  presencasColaboradores = [],
  fullscreen = false,
  onClose,
  onIrParaAbaEquipamentos,
  onExitFullscreen,
  onVoltarHudGeral,
  onZoomParaLocalizacao,
  plotsAgrupados,
  onPlotsAgrupadosChange,
  mapTileVisao,
  onMapTileVisaoChange,
  linhasCoordenadasVisiveis,
  onLinhasCoordenadasVisiveisChange,
  veiculosInfoVisiveis,
  onVeiculosInfoVisiveisChange,
  veiculoSelecionado,
  onFecharVeiculoSelecionado,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  presencasColaboradores?: PresencaColaboradorHud[];
  fullscreen?: boolean;
  onClose: () => void;
  /** Fora da tela cheia: abre a aba Equipamentos. */
  onIrParaAbaEquipamentos?: () => void;
  onExitFullscreen?: () => void;
  onVoltarHudGeral?: () => void;
  /** Aproxima o zoom do mapa na localização da unidade. */
  onZoomParaLocalizacao?: () => void;
  plotsAgrupados: boolean;
  onPlotsAgrupadosChange: (agrupados: boolean) => void;
  mapTileVisao: MapaTileVisao;
  onMapTileVisaoChange: (visao: MapaTileVisao) => void;
  linhasCoordenadasVisiveis: boolean;
  onLinhasCoordenadasVisiveisChange: (visiveis: boolean) => void;
  veiculosInfoVisiveis: boolean;
  onVeiculosInfoVisiveisChange: (visiveis: boolean) => void;
  veiculoSelecionado: VeiculoHudSelecao | null;
  onFecharVeiculoSelecionado: () => void;
}) {
  const [hudScale, setHudScale] = useMapaHudScale();
  const [dockEquipamentosAberta, setDockEquipamentosAberta] = useState(false);
  const [modoEquipamentosHud, setModoEquipamentosHud] = useState(false);

  useEffect(() => {
    setDockEquipamentosAberta(false);
    setModoEquipamentosHud(false);
  }, [unidade.id]);

  const equipamentos = asArray(unidade.equipamentos);
  const hostOnline = unidade.ip?.trim()
    ? (metricMap.get(monitorUnidadeHostTargetId(unidade.id))?.online ?? false)
    : false;
  const connectivity = unidadeConnectivityStatus(unidade, hostOnline);
  const coords = coordsFromUnidade(unidade);
  const grupos = contarEquipamentosUnidade(unidade);
  const equip = resumoEquipamentos(unidade, metricMap);
  const cidade = unidade.endereco?.cidade?.trim();
  const estado = unidade.endereco?.estado?.trim();
  const localLabel = [cidade, estado].filter(Boolean).join(" · ");

  const connectivityAccent =
    connectivity === "online"
      ? "online"
      : connectivity === "offline"
        ? "offline"
        : "sem_ip";

  function handleEquipamentosClick() {
    if (fullscreen) {
      if (!modoEquipamentosHud) {
        setModoEquipamentosHud(true);
        setDockEquipamentosAberta(true);
        return;
      }
      if (dockEquipamentosAberta) {
        setDockEquipamentosAberta(false);
        return;
      }
      setDockEquipamentosAberta(true);
      return;
    }
    onIrParaAbaEquipamentos?.();
  }

  const escala = fullscreen ? hudScale : 1;

  const painelIdentidade = (
    <PainelMapaHudGlass
      accent={connectivityAccent}
      className="slide-in-from-left-3 w-[min(100%,20rem)] shrink-0 animate-in sm:w-[min(100%,22rem)]"
    >
      <div className="p-3.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Unidade monitorada
        </p>
        <h3 className="mt-1 truncate text-base font-semibold leading-tight sm:text-lg">
          {unidade.nome}
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          ID {unidade.codigo}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 border text-[10px] uppercase tracking-wide",
              statusBadgeClass(connectivity)
            )}
          >
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                connectivity === "online"
                  ? "animate-pulse bg-emerald-400"
                  : connectivity === "offline"
                    ? "bg-destructive"
                    : "bg-muted-foreground"
              )}
            />
            {unidadeConnectivityLabel(connectivity)}
          </Badge>
          {unidade.ip?.trim() ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-background/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
              <Network className="h-3 w-3 shrink-0" />
              {unidade.ip}
            </span>
          ) : null}
        </div>
      </div>
    </PainelMapaHudGlass>
  );

  const painelGrupos = (
    <PainelMapaHudGlass className="slide-in-from-bottom-3 w-[min(100%,16rem)] shrink-0 animate-in delay-100">
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <div className="bg-background/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Cpu className="h-3 w-3" />
            Grupos
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {grupos}
          </p>
        </div>
        <div className="bg-background/40 p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Activity className="h-3 w-3" />
            Online
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
            {equip.online}
            <span className="text-sm font-normal text-muted-foreground">
              /{equip.comMetrica || equip.total}
            </span>
          </p>
        </div>
      </div>
      {(fullscreen || onIrParaAbaEquipamentos) && equipamentos.length > 0 ? (
        <div className="border-t border-white/10 bg-background/40 p-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto w-full bg-background/50 backdrop-blur-sm"
            onClick={handleEquipamentosClick}
          >
            {fullscreen && dockEquipamentosAberta
              ? "Fechar lista"
              : "Ver equipamentos"}
          </Button>
        </div>
      ) : null}
    </PainelMapaHudGlass>
  );

  const painelCoordenadas = (
    <div className="flex items-center gap-2">
      <PainelMapaHudGlass className="slide-in-from-bottom-3 w-[22rem] max-w-[calc(100vw-1.5rem)] shrink-0 animate-in delay-150 sm:w-[26rem]">
        <div className="p-3.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Coordenadas
              </p>
              <p className="mt-0.5 font-mono text-xs leading-snug">
                {coords
                  ? `${formatCoord(coords.lat)}, ${formatCoord(coords.lng)}`
                  : "Não cadastradas"}
              </p>
              {localLabel ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {localLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </PainelMapaHudGlass>
      {coords && onZoomParaLocalizacao ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className={cn(MAPA_HUD_ROUND_BTN_CLASS, "shrink-0")}
          onClick={onZoomParaLocalizacao}
          aria-label="Aproximar no mapa"
          title="Aproximar no mapa"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );

  const painelPresenca =
    presencasColaboradores.length > 0 ? (
      <PainelMapaHudPresencaColaboradores presencas={presencasColaboradores} />
    ) : null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1000]"
      role="dialog"
      aria-label={`HUD de ${unidade.nome}`}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/55"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_100%)] opacity-40"
        aria-hidden
      />

      {fullscreen && onExitFullscreen && onVoltarHudGeral ? (
        <PainelMapaHudControlesFullscreen
          hudScale={hudScale}
          onHudScaleChange={setHudScale}
          onExitFullscreen={onExitFullscreen}
          onVoltarHudGeral={onVoltarHudGeral}
          plotsAgrupados={plotsAgrupados}
          onPlotsAgrupadosChange={onPlotsAgrupadosChange}
          mapTileVisao={mapTileVisao}
          onMapTileVisaoChange={onMapTileVisaoChange}
          linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
          onLinhasCoordenadasVisiveisChange={onLinhasCoordenadasVisiveisChange}
          veiculosInfoVisiveis={veiculosInfoVisiveis}
          onVeiculosInfoVisiveisChange={onVeiculosInfoVisiveisChange}
        />
      ) : null}

      {modoEquipamentosHud ? (
        <PainelMapaHudEquipamentosFlutuantes
          key={unidade.id}
          unidade={unidade}
          catalogo={catalogo}
          metricMap={metricMap}
          dockAberta={dockEquipamentosAberta}
          hudScale={fullscreen ? hudScale : 1}
          linhasCoordenadasVisiveis={linhasCoordenadasVisiveis}
        />
      ) : null}

      <div className="absolute inset-3 sm:inset-4">
        {fullscreen ? (
          <>
            <div
              className="pointer-events-auto absolute top-0 left-0 flex max-h-[calc(100%-1rem)] flex-col gap-3 overflow-y-auto pr-1"
              style={mapaHudCornerScaleStyle(escala, "top left")}
            >
              {painelIdentidade}
              {painelPresenca}
            </div>

            {coords ? (
              <div
                className={cn(
                  "pointer-events-auto absolute top-0 right-0",
                  MAPA_HUD_CONTROLS_RAIL_CLASS
                )}
                style={mapaHudCornerScaleStyle(escala, "top right")}
              >
                <PainelMapaClimaHud
                  lat={coords.lat}
                  lng={coords.lng}
                  localLabel={localLabel || undefined}
                />
              </div>
            ) : null}

            <div
              className="pointer-events-auto absolute bottom-0 left-0"
              style={mapaHudCornerScaleStyle(escala, "bottom left")}
            >
              {painelGrupos}
            </div>

            <div
              className="pointer-events-auto absolute right-0 bottom-0"
              style={mapaHudCornerScaleStyle(escala, "bottom right")}
            >
              {painelCoordenadas}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-3">
                {painelIdentidade}
                {painelPresenca}
              </div>
              <div className="flex min-w-0 shrink items-start justify-end gap-2">
                {coords ? (
                  <PainelMapaClimaHud
                    lat={coords.lat}
                    lng={coords.lng}
                    localLabel={localLabel || undefined}
                  />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className={MAPA_HUD_ROUND_BTN_CLASS}
                  onClick={onClose}
                  aria-label="Fechar HUD"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1" aria-hidden />

            <div className="mt-auto flex w-full min-w-0 shrink-0 items-end justify-between gap-3">
              {painelGrupos}
              {painelCoordenadas}
            </div>
          </div>
        )}
      </div>

      {veiculoSelecionado ? (
        <PainelMapaHudVeiculoCard
          selecao={veiculoSelecionado}
          hudScale={escala}
          paddingRight={fullscreen ? 56 : 8}
          positionStorageKey={veiculoCardStorageKeyUnidade(unidade.id)}
          onClose={onFecharVeiculoSelecionado}
        />
      ) : null}
    </div>
  );
}
