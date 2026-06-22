"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GripHorizontal, GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  UnidadeEquipamentoGrupoCard,
  getGrupoEquipamentoKey,
  getGrupoEquipamentoNome,
  getGrupoEquipamentoOnline,
  type GrupoEquipamentoUnidade,
} from "@/components/unidades/unidade-equipamentos-grid";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";
import { useMapHudProjection } from "@/components/painel/mapa-hud-projection";
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import { agruparEquipamentosUnidade } from "@/lib/unidade-form";
import {
  clampHudEquipamentoPos,
  clientToContainerPos,
  globalEquipamentoKey,
  hudEquipamentoCardAnchorBottom,
  parseGlobalEquipamentoKey,
  type HudEquipamentoPos,
} from "@/lib/mapa-hud-equipamentos-pos";
import {
  loadUnidadeEquipamentosPos,
  saveUnidadeEquipamentosPos,
} from "@/lib/mapa-hud-layout-storage";
import type { GeralEquipamentosMapState } from "@/hooks/use-geral-equipamentos-map-state";
import {
  mapaHudCornerScaleStyle,
  mapaHudDockBottomOffset,
} from "@/lib/mapa-hud-scale";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD_WIDTH = 288;
const CARD_WIDTH_MAQUINA = 352;
const CARD_MIN_HEIGHT = 120;
const CARD_MIN_HEIGHT_MAQUINA = 220;

function cardDimensions(grupo: GrupoEquipamentoUnidade) {
  const isMaquina = grupo.tipo === "maquina";
  return {
    width: isMaquina ? CARD_WIDTH_MAQUINA : CARD_WIDTH,
    height: isMaquina ? CARD_MIN_HEIGHT_MAQUINA : CARD_MIN_HEIGHT,
  };
}

function pontoDentroRect(
  x: number,
  y: number,
  rect: DOMRect,
  margem = 0
): boolean {
  return (
    x >= rect.left - margem &&
    x <= rect.right + margem &&
    y >= rect.top - margem &&
    y <= rect.bottom + margem
  );
}

function StatusDot({ online }: { online: boolean | null }) {
  if (online === null) return null;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        online ? "bg-emerald-500" : "bg-destructive"
      )}
      aria-hidden
    />
  );
}

function PainelMapaHudEquipamentoFloat({
  grupo,
  unidade,
  equipById,
  metricMap,
  position,
  zIndex,
  hudScale,
  dockRef,
  dockUnidadeId,
  unidadeLabel,
  onPositionChange,
  onBringToFront,
  onRemoverDoMapa,
  onArrasteSobreDock,
}: {
  grupo: GrupoEquipamentoUnidade;
  unidade: Unidade;
  equipById: Map<string, Equipamento>;
  metricMap: Map<string, DeviceMetric>;
  position: HudEquipamentoPos;
  zIndex: number;
  hudScale: number;
  dockRef: React.RefObject<HTMLDivElement | null>;
  /** Quando definido, só devolve à lista ao soltar sobre a dock da mesma unidade. */
  dockUnidadeId?: string | null;
  unidadeLabel?: string;
  onPositionChange: (pos: HudEquipamentoPos) => void;
  onBringToFront: () => void;
  onRemoverDoMapa: () => void;
  onArrasteSobreDock: (ativo: boolean) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const isMaquina = grupo.tipo === "maquina";

  function atualizarSobreDock(clientX: number, clientY: number) {
    const dock = dockRef.current;
    if (!dock || (dockUnidadeId != null && dockUnidadeId !== unidade.id)) {
      onArrasteSobreDock(false);
      return;
    }
    onArrasteSobreDock(
      pontoDentroRect(clientX, clientY, dock.getBoundingClientRect(), 8)
    );
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onBringToFront();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: position.x,
      origY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const container = cardRef.current?.offsetParent as HTMLElement | null;
    const containerWidth = container?.clientWidth ?? window.innerWidth;
    const containerHeight = container?.clientHeight ?? window.innerHeight;
    const cardWidth = cardRef.current?.offsetWidth ?? CARD_WIDTH;
    const cardHeight = cardRef.current?.offsetHeight ?? CARD_MIN_HEIGHT;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const next = clampHudEquipamentoPos(
      drag.origX + dx,
      drag.origY + dy,
      cardWidth,
      cardHeight,
      containerWidth,
      containerHeight,
      8,
      hudScale
    );
    onPositionChange(next);
    atualizarSobreDock(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    onArrasteSobreDock(false);

    const dock = dockRef.current;
    const podeDevolverNaDock =
      dock &&
      (dockUnidadeId == null || dockUnidadeId === unidade.id) &&
      pontoDentroRect(
        event.clientX,
        event.clientY,
        dock.getBoundingClientRect(),
        8
      );
    if (podeDevolverNaDock) {
      onRemoverDoMapa();
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      ref={cardRef}
      className="pointer-events-auto absolute max-w-[min(100%,20rem)] animate-in fade-in zoom-in-95 duration-300"
      style={{
        left: position.x,
        top: position.y,
        width: isMaquina ? "min(100%, 22rem)" : "min(100%, 18rem)",
        zIndex,
        ...mapaHudCornerScaleStyle(hudScale, "top left"),
      }}
    >
      <PainelMapaHudGlass
        className={cn(
          "shadow-xl transition-shadow",
          isMaquina && "w-[min(100%,22rem)]"
        )}
      >
        <div className="flex items-center border-b border-white/10 bg-background/30">
          <button
            type="button"
            className="flex flex-1 cursor-grab items-center justify-center py-1.5 text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastar card de equipamento"
            title="Arrastar (solte na lista para devolver)"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <GripHorizontal className="h-4 w-4" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mr-1 h-7 w-7 shrink-0 rounded-full"
            onClick={onRemoverDoMapa}
            aria-label={
              dockUnidadeId === unidade.id
                ? "Devolver à lista"
                : "Remover do mapa"
            }
            title={
              dockUnidadeId === unidade.id
                ? "Devolver à lista"
                : "Remover do mapa"
            }
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {unidadeLabel ? (
          <div className="border-b border-white/10 bg-background/25 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Unidade
            </p>
            <p className="truncate text-xs font-medium leading-tight">
              {unidadeLabel}
            </p>
          </div>
        ) : null}
        <div className="p-3">
          <UnidadeEquipamentoGrupoCard
            grupo={grupo}
            unidade={unidade}
            equipById={equipById}
            metricMap={metricMap}
            layout="lista"
            surface="hud"
          />
        </div>
      </PainelMapaHudGlass>
    </div>
  );
}

type ArrasteDockState = {
  key: string;
  nome: string;
  pointerId: number;
  ghostX: number;
  ghostY: number;
};

function PainelMapaHudEquipamentoLinhas({
  floats,
  hudScale,
}: {
  floats: Array<{
    key: string;
    pos: HudEquipamentoPos;
    unidade: Unidade;
    grupo: GrupoEquipamentoUnidade;
  }>;
  hudScale: number;
}) {
  const projection = useMapHudProjection();
  void projection?.tick;

  if (!projection || floats.length === 0) return null;

  const segments = floats
    .map(({ key, pos, unidade, grupo }) => {
      const coords = coordsFromUnidade(unidade);
      if (!coords) return null;

      const target = projection.projectLatLng(coords.lat, coords.lng);
      if (!target) return null;

      const { width, height } = cardDimensions(grupo);
      const anchor = hudEquipamentoCardAnchorBottom(pos, width, height, hudScale);

      return { key, anchor, target };
    })
    .filter(Boolean) as Array<{
    key: string;
    anchor: HudEquipamentoPos;
    target: HudEquipamentoPos;
  }>;

  if (segments.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
      aria-hidden
    >
      {segments.map(({ key, anchor, target }) => (
        <line
          key={key}
          x1={anchor.x}
          y1={anchor.y}
          x2={target.x}
          y2={target.y}
          stroke="#000000"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

type MapLayerMode = "full" | "dock-only" | "map-only";

export function PainelMapaHudEquipamentosFlutuantes({
  unidade,
  unidades,
  catalogo,
  metricMap,
  dockAberta,
  hudScale = 1,
  builtInDock = true,
  overlayClassName,
  children,
  mapLayer = "full",
  geralState,
  externalDockRef,
  activeDockRef,
  activeDockUnidadeId,
  showUnidadeLabel = false,
  linhasCoordenadasVisiveis = true,
}: {
  unidade?: Unidade;
  unidades?: Unidade[];
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  dockAberta?: boolean;
  hudScale?: number;
  /** Dock fixa no canto inferior esquerdo (HUD da unidade). */
  builtInDock?: boolean;
  overlayClassName?: string;
  /** Incorpora a lista de equipamentos em outro painel (ex.: card do HUD geral). */
  children?: (dockPanel: React.ReactNode) => React.ReactNode;
  mapLayer?: MapLayerMode;
  geralState?: GeralEquipamentosMapState;
  externalDockRef?: React.RefObject<HTMLDivElement | null>;
  activeDockRef?: React.RefObject<HTMLDivElement | null>;
  activeDockUnidadeId?: string | null;
  showUnidadeLabel?: boolean;
  linhasCoordenadasVisiveis?: boolean;
}) {
  const isGeral = Boolean(geralState);
  const isDockOnly = mapLayer === "dock-only";
  const isMapOnly = mapLayer === "map-only";
  const isFull = mapLayer === "full";

  if (isFull && !unidade) {
    throw new Error("PainelMapaHudEquipamentosFlutuantes: unidade é obrigatória.");
  }
  if (isDockOnly && (!unidade || !geralState)) {
    throw new Error(
      "PainelMapaHudEquipamentosFlutuantes: dock-only exige unidade e geralState."
    );
  }
  if (isMapOnly && (!unidades || !geralState)) {
    throw new Error(
      "PainelMapaHudEquipamentosFlutuantes: map-only exige unidades e geralState."
    );
  }

  const unidadeDock = isMapOnly ? undefined : unidade;
  const dockAbertaEff = dockAberta ?? isMapOnly;
  const projection = useMapHudProjection();
  const registerOverlayRef = useRef(projection?.registerOverlay);
  registerOverlayRef.current = projection?.registerOverlay;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = isGeral
    ? geralState!.containerRef
    : containerRef;

  const handleMapContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      (
        mapContainerRef as React.MutableRefObject<HTMLDivElement | null>
      ).current = node;
      registerOverlayRef.current?.(node);
    },
    [mapContainerRef]
  );
  const internalDockRef = useRef<HTMLDivElement>(null);
  const dockRef = externalDockRef ?? internalDockRef;

  const [localPosicoes, setLocalPosicoes] = useState<
    Record<string, HudEquipamentoPos>
  >({});
  const [localZPorCard, setLocalZPorCard] = useState<Record<string, number>>({});
  const [localTopZ, setLocalTopZ] = useState(30);
  const persistUnidadeSkipRef = useRef(true);

  const unidadeStorageId =
    !isGeral && !isMapOnly && unidadeDock ? unidadeDock.id : null;

  useEffect(() => {
    if (!unidadeStorageId) return;
    setLocalPosicoes(loadUnidadeEquipamentosPos(unidadeStorageId));
    persistUnidadeSkipRef.current = true;
  }, [unidadeStorageId]);

  useEffect(() => {
    if (!unidadeStorageId) return;
    if (persistUnidadeSkipRef.current) {
      persistUnidadeSkipRef.current = false;
      return;
    }
    saveUnidadeEquipamentosPos(unidadeStorageId, localPosicoes);
  }, [unidadeStorageId, localPosicoes]);

  const posicoesNoMapa = isGeral
    ? geralState!.posicoesNoMapa
    : localPosicoes;
  const setPosicoesNoMapa = isGeral
    ? geralState!.setPosicoesNoMapa
    : setLocalPosicoes;
  const zPorCard = isGeral ? geralState!.zPorCard : localZPorCard;
  const setZPorCard = isGeral ? geralState!.setZPorCard : setLocalZPorCard;
  const topZ = isGeral ? geralState!.topZ : localTopZ;
  const setTopZ = isGeral ? geralState!.setTopZ : setLocalTopZ;

  const [arrasteDock, setArrasteDock] = useState<ArrasteDockState | null>(
    null
  );
  const arrasteDockRef = useRef<ArrasteDockState | null>(null);
  const [dockDestaque, setDockDestaque] = useState(false);

  useEffect(() => {
    if (!dockAbertaEff) setDockDestaque(false);
  }, [dockAbertaEff]);

  const equipById = useMemo(
    () => new Map(catalogo.map((eq) => [eq.id, eq])),
    [catalogo]
  );

  const unidadesPorId = useMemo(
    () => new Map((unidades ?? (unidade ? [unidade] : [])).map((u) => [u.id, u])),
    [unidades, unidade]
  );

  const grupos = useMemo(
    () =>
      unidadeDock
        ? agruparEquipamentosUnidade(unidadeDock.equipamentos ?? [])
        : [],
    [unidadeDock]
  );

  const gruposPorKey = useMemo(() => {
    const map = new Map<string, GrupoEquipamentoUnidade>();
    if (isMapOnly) {
      for (const u of unidadesPorId.values()) {
        for (const grupo of agruparEquipamentosUnidade(u.equipamentos ?? [])) {
          map.set(
            globalEquipamentoKey(u.id, getGrupoEquipamentoKey(grupo)),
            grupo
          );
        }
      }
      return map;
    }
    for (const grupo of grupos) {
      const key = isGeral && unidadeDock
        ? globalEquipamentoKey(unidadeDock.id, getGrupoEquipamentoKey(grupo))
        : getGrupoEquipamentoKey(grupo);
      map.set(key, grupo);
    }
    return map;
  }, [grupos, isGeral, isMapOnly, unidadeDock, unidadesPorId]);

  const gruposPorKeyLocal = useMemo(() => {
    const map = new Map<string, GrupoEquipamentoUnidade>();
    for (const grupo of grupos) {
      map.set(getGrupoEquipamentoKey(grupo), grupo);
    }
    return map;
  }, [grupos]);

  const storageKey = useCallback(
    (grupoKey: string) =>
      isGeral && unidadeDock
        ? globalEquipamentoKey(unidadeDock.id, grupoKey)
        : grupoKey,
    [isGeral, unidadeDock]
  );

  const gruposNaLista = useMemo(
    () =>
      grupos.filter(
        (grupo) => !posicoesNoMapa[storageKey(getGrupoEquipamentoKey(grupo))]
      ),
    [grupos, posicoesNoMapa, storageKey]
  );

  const floatsNoMapa = useMemo(() => {
    if (isMapOnly) {
      return Object.entries(posicoesNoMapa)
        .map(([key, pos]) => {
          const parsed = parseGlobalEquipamentoKey(key);
          if (!parsed) return null;
          const u = unidadesPorId.get(parsed.unidadeId);
          const grupo = gruposPorKey.get(key);
          if (!u || !grupo) return null;
          return { key, pos, unidade: u, grupo };
        })
        .filter(Boolean) as Array<{
        key: string;
        pos: HudEquipamentoPos;
        unidade: Unidade;
        grupo: GrupoEquipamentoUnidade;
      }>;
    }
    return grupos
      .filter((grupo) => posicoesNoMapa[storageKey(getGrupoEquipamentoKey(grupo))])
      .map((grupo) => {
        const grupoKey = getGrupoEquipamentoKey(grupo);
        const key = storageKey(grupoKey);
        return {
          key,
          pos: posicoesNoMapa[key]!,
          unidade: unidadeDock!,
          grupo,
        };
      });
  }, [
    grupos,
    gruposPorKey,
    isMapOnly,
    posicoesNoMapa,
    storageKey,
    unidadeDock,
    unidadesPorId,
  ]);

  const reclampPosicoes = useCallback(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setPosicoesNoMapa((prev) => {
      const next: Record<string, HudEquipamentoPos> = {};
      let changed = false;
      for (const [key, pos] of Object.entries(prev)) {
        const grupo = gruposPorKey.get(key);
        if (!grupo) continue;
        const { width, height } = cardDimensions(grupo);
        const clamped = clampHudEquipamentoPos(
          pos.x,
          pos.y,
          width,
          height,
          rect.width,
          rect.height,
          8,
          hudScale
        );
        next[key] = clamped;
        if (clamped.x !== pos.x || clamped.y !== pos.y) changed = true;
      }
      return changed ? next : prev;
    });
  }, [gruposPorKey, hudScale, setPosicoesNoMapa]);

  useEffect(() => {
    if (isDockOnly) return;
    const container = mapContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => reclampPosicoes());
    observer.observe(container);
    return () => observer.disconnect();
  }, [isDockOnly, reclampPosicoes]);

  const atualizarPosicao = useCallback(
    (key: string, pos: HudEquipamentoPos) => {
      setPosicoesNoMapa((prev) => ({ ...prev, [key]: pos }));
    },
    [setPosicoesNoMapa]
  );

  const trazerParaFrente = useCallback(
    (key: string) => {
      setTopZ((z) => {
        const nextZ = z + 1;
        setZPorCard((prev) => ({ ...prev, [key]: nextZ }));
        return nextZ;
      });
    },
    [setTopZ, setZPorCard]
  );

  const removerDoMapa = useCallback(
    (key: string) => {
      setPosicoesNoMapa((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setZPorCard((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setPosicoesNoMapa, setZPorCard]
  );

  const colocarNoMapa = useCallback(
    (grupoKey: string, clientX: number, clientY: number) => {
      const container = mapContainerRef.current;
      const grupo = gruposPorKeyLocal.get(grupoKey);
      if (!container || !grupo) return;

      const { width, height } = cardDimensions(grupo);
      const raw = clientToContainerPos(
        clientX,
        clientY,
        container,
        width / 2,
        24
      );
      const pos = clampHudEquipamentoPos(
        raw.x,
        raw.y,
        width,
        height,
        container.clientWidth,
        container.clientHeight,
        8,
        hudScale
      );

      const mapKey = isGeral ? storageKey(grupoKey) : grupoKey;
      setPosicoesNoMapa((prev) => ({ ...prev, [mapKey]: pos }));
      trazerParaFrente(mapKey);
    },
    [
      gruposPorKeyLocal,
      hudScale,
      isGeral,
      storageKey,
      setPosicoesNoMapa,
      trazerParaFrente,
    ]
  );

  const iniciarArrasteDock = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      key: string,
      nome: string
    ) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const next: ArrasteDockState = {
        key,
        nome,
        pointerId: event.pointerId,
        ghostX: event.clientX,
        ghostY: event.clientY,
      };
      arrasteDockRef.current = next;
      setArrasteDock(next);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const moverArrasteDock = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const prev = arrasteDockRef.current;
      if (!prev || prev.pointerId !== event.pointerId) return;
      const next = { ...prev, ghostX: event.clientX, ghostY: event.clientY };
      arrasteDockRef.current = next;
      setArrasteDock(next);
    },
    []
  );

  const finalizarArrasteDock = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const pointerId = event.pointerId;
      const clientX = event.clientX;
      const clientY = event.clientY;
      const prev = arrasteDockRef.current;

      if (!prev || prev.pointerId !== pointerId) {
        return;
      }

      let grupoKeyParaMapa: string | null = null;
      const dock = dockRef.current;
      const container = mapContainerRef.current;
      if (dock && container) {
        const dockRect = dock.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const foraDaLista = !pontoDentroRect(clientX, clientY, dockRect);
        const dentroDoMapa = pontoDentroRect(
          clientX,
          clientY,
          containerRect
        );

        if (foraDaLista && dentroDoMapa) {
          grupoKeyParaMapa = prev.key;
        }
      }

      arrasteDockRef.current = null;
      setArrasteDock(null);

      if (grupoKeyParaMapa) {
        colocarNoMapa(grupoKeyParaMapa, clientX, clientY);
      }

      event.currentTarget.releasePointerCapture(pointerId);
    },
    [colocarNoMapa, mapContainerRef]
  );

  const useBuiltInDock = builtInDock && !children;

  const listaEquipamentos = (
    <ul
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        useBuiltInDock ? "p-1.5" : "p-[calc(0.375rem*var(--mapa-hud-scale,1))]"
      )}
    >
      {gruposNaLista.length === 0 ? (
        <li
          className={cn(
            "text-center text-muted-foreground",
            useBuiltInDock
              ? "px-1 py-1.5 text-[10px]"
              : "px-[calc(0.25rem*var(--mapa-hud-scale,1))] py-[calc(0.375rem*var(--mapa-hud-scale,1))] text-[length:calc(0.625rem*var(--mapa-hud-scale,1))]"
          )}
        >
          Todos no mapa
        </li>
      ) : (
        gruposNaLista.map((grupo) => {
          const key = getGrupoEquipamentoKey(grupo);
          const nome = getGrupoEquipamentoNome(grupo, equipById);
          const online = getGrupoEquipamentoOnline(grupo, unidadeDock!.id, metricMap);

          return (
            <li
              key={key}
              className={cn(useBuiltInDock ? "mb-1 last:mb-0" : "mb-[calc(0.25rem*var(--mapa-hud-scale,1))] last:mb-0")}
            >
              <button
                type="button"
                className={cn(
                  "flex w-full cursor-grab items-center rounded-md border border-white/10 bg-background/50 text-left active:cursor-grabbing hover:bg-background/70",
                  useBuiltInDock
                    ? "gap-1.5 px-2 py-1.5 text-[11px]"
                    : "gap-[calc(0.375rem*var(--mapa-hud-scale,1))] px-[calc(0.5rem*var(--mapa-hud-scale,1))] py-[calc(0.375rem*var(--mapa-hud-scale,1))] text-[length:calc(0.6875rem*var(--mapa-hud-scale,1))]"
                )}
                onPointerDown={(e) => iniciarArrasteDock(e, key, nome)}
                onPointerMove={moverArrasteDock}
                onPointerUp={finalizarArrasteDock}
                onPointerCancel={finalizarArrasteDock}
              >
                <GripVertical
                  className={cn(
                    "shrink-0 text-muted-foreground",
                    useBuiltInDock ? "h-3.5 w-3.5" : "h-[calc(0.875rem*var(--mapa-hud-scale,1))] w-[calc(0.875rem*var(--mapa-hud-scale,1))]"
                  )}
                />
                <span className="min-w-0 flex-1 truncate font-medium leading-tight">
                  {nome}
                </span>
                <StatusDot online={online} />
              </button>
            </li>
          );
        })
      )}
    </ul>
  );

  const dockPanel =
    !isMapOnly && dockAbertaEff && grupos.length > 0 ? (
      <div
        ref={dockRef}
        className={cn(
          "pointer-events-auto",
          useBuiltInDock
            ? cn(
                "absolute left-0 z-40 w-40 sm:w-44",
                dockDestaque &&
                  "ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent"
              )
            : cn(
                "relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/10 bg-background/30",
                dockDestaque && "ring-2 ring-inset ring-primary/60"
              )
        )}
        style={
          useBuiltInDock
            ? {
                bottom: mapaHudDockBottomOffset(hudScale),
                ...mapaHudCornerScaleStyle(hudScale, "bottom left"),
              }
            : undefined
        }
      >
        {useBuiltInDock ? (
          <PainelMapaHudGlass className="flex max-h-44 flex-col overflow-hidden sm:max-h-48">
            <div className="shrink-0 border-b border-white/10 bg-background/40 px-2.5 py-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Equipamentos
              </p>
              <p className="text-[10px] text-muted-foreground">Arraste ↔ mapa</p>
            </div>
            {listaEquipamentos}
          </PainelMapaHudGlass>
        ) : (
          <>
            <div className="shrink-0 border-b border-white/10 bg-background/40 px-[calc(0.625rem*var(--mapa-hud-scale,1))] py-[calc(0.5rem*var(--mapa-hud-scale,1))]">
              <p className="font-medium uppercase tracking-[0.14em] text-[length:calc(0.625rem*var(--mapa-hud-scale,1))] text-muted-foreground">
                Equipamentos
              </p>
              <p className="text-[length:calc(0.625rem*var(--mapa-hud-scale,1))] text-muted-foreground">
                Arraste para o mapa
              </p>
            </div>
            {listaEquipamentos}
          </>
        )}
      </div>
    ) : null;

  const mapFloats = floatsNoMapa.map(({ key, pos, unidade: u, grupo }) => (
    <PainelMapaHudEquipamentoFloat
      key={key}
      grupo={grupo}
      unidade={u}
      equipById={equipById}
      metricMap={metricMap}
      position={pos}
      zIndex={zPorCard[key] ?? 20}
      hudScale={hudScale}
      dockRef={activeDockRef ?? dockRef}
      dockUnidadeId={activeDockUnidadeId}
      unidadeLabel={showUnidadeLabel ? u.nome : undefined}
      onPositionChange={(next) => atualizarPosicao(key, next)}
      onBringToFront={() => trazerParaFrente(key)}
      onRemoverDoMapa={() => removerDoMapa(key)}
      onArrasteSobreDock={
        dockAbertaEff && activeDockUnidadeId === u.id
          ? setDockDestaque
          : () => {}
      }
    />
  ));

  if (isDockOnly) {
    return (
      <>
        {children ? children(dockPanel) : null}
        {arrasteDock ? (
          <div
            className="pointer-events-none fixed z-[2000] -translate-x-1/2 -translate-y-1/2"
            style={{ left: arrasteDock.ghostX, top: arrasteDock.ghostY }}
          >
            <div className="rounded-lg border border-white/20 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md">
              {arrasteDock.nome}
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          overlayClassName ?? "z-[15]"
        )}
        aria-label="Equipamentos no mapa"
      >
        <div
          ref={handleMapContainerRef}
          className="pointer-events-none absolute inset-3 sm:inset-4"
        >
          {linhasCoordenadasVisiveis ? (
            <PainelMapaHudEquipamentoLinhas
              floats={floatsNoMapa}
              hudScale={hudScale}
            />
          ) : null}
          {useBuiltInDock ? dockPanel : null}
          {mapFloats}
        </div>

        {arrasteDock ? (
          <div
            className="pointer-events-none fixed z-[2000] -translate-x-1/2 -translate-y-1/2"
            style={{ left: arrasteDock.ghostX, top: arrasteDock.ghostY }}
          >
            <div className="rounded-lg border border-white/20 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-xl backdrop-blur-md">
              {arrasteDock.nome}
            </div>
          </div>
        ) : null}
      </div>

      {!useBuiltInDock && children ? children(dockPanel) : null}
    </>
  );
}
