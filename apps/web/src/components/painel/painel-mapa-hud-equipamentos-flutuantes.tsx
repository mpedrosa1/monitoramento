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
import { PainelMapaHudGlass } from "@/components/painel/painel-mapa-hud-glass";
import { agruparEquipamentosUnidade } from "@/lib/unidade-form";
import {
  clampHudEquipamentoPos,
  clientToContainerPos,
  type HudEquipamentoPos,
} from "@/lib/mapa-hud-equipamentos-pos";
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
    if (!dock) {
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
    if (
      dock &&
      pontoDentroRect(
        event.clientX,
        event.clientY,
        dock.getBoundingClientRect(),
        8
      )
    ) {
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
            aria-label="Devolver à lista"
            title="Devolver à lista"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
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

export function PainelMapaHudEquipamentosFlutuantes({
  unidade,
  catalogo,
  metricMap,
  dockAberta,
  hudScale = 1,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  dockAberta: boolean;
  hudScale?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [posicoesNoMapa, setPosicoesNoMapa] = useState<
    Record<string, HudEquipamentoPos>
  >({});
  const [zPorCard, setZPorCard] = useState<Record<string, number>>({});
  const [topZ, setTopZ] = useState(30);
  const [arrasteDock, setArrasteDock] = useState<ArrasteDockState | null>(
    null
  );
  const [dockDestaque, setDockDestaque] = useState(false);

  useEffect(() => {
    if (!dockAberta) setDockDestaque(false);
  }, [dockAberta]);

  const equipById = useMemo(
    () => new Map(catalogo.map((eq) => [eq.id, eq])),
    [catalogo]
  );

  const grupos = useMemo(
    () => agruparEquipamentosUnidade(unidade.equipamentos ?? []),
    [unidade.equipamentos]
  );

  const gruposPorKey = useMemo(() => {
    const map = new Map<string, GrupoEquipamentoUnidade>();
    for (const grupo of grupos) {
      map.set(getGrupoEquipamentoKey(grupo), grupo);
    }
    return map;
  }, [grupos]);

  const gruposNaLista = useMemo(
    () =>
      grupos.filter((grupo) => !posicoesNoMapa[getGrupoEquipamentoKey(grupo)]),
    [grupos, posicoesNoMapa]
  );

  const gruposNoMapa = useMemo(
    () =>
      grupos.filter((grupo) => posicoesNoMapa[getGrupoEquipamentoKey(grupo)]),
    [grupos, posicoesNoMapa]
  );

  const reclampPosicoes = useCallback(() => {
    const container = containerRef.current;
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
  }, [gruposPorKey, hudScale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => reclampPosicoes());
    observer.observe(container);
    return () => observer.disconnect();
  }, [reclampPosicoes]);

  const atualizarPosicao = useCallback((key: string, pos: HudEquipamentoPos) => {
    setPosicoesNoMapa((prev) => ({ ...prev, [key]: pos }));
  }, []);

  const trazerParaFrente = useCallback((key: string) => {
    setTopZ((z) => {
      const nextZ = z + 1;
      setZPorCard((prev) => ({ ...prev, [key]: nextZ }));
      return nextZ;
    });
  }, []);

  const removerDoMapa = useCallback((key: string) => {
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
  }, []);

  const colocarNoMapa = useCallback(
    (key: string, clientX: number, clientY: number) => {
      const container = containerRef.current;
      const grupo = gruposPorKey.get(key);
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

      setPosicoesNoMapa((prev) => ({ ...prev, [key]: pos }));
      trazerParaFrente(key);
    },
    [gruposPorKey, hudScale, trazerParaFrente]
  );

  const iniciarArrasteDock = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      key: string,
      nome: string
    ) => {
      if (event.button !== 0) return;
      event.preventDefault();
      setArrasteDock({
        key,
        nome,
        pointerId: event.pointerId,
        ghostX: event.clientX,
        ghostY: event.clientY,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const moverArrasteDock = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      setArrasteDock((prev) => {
        if (!prev || prev.pointerId !== event.pointerId) return prev;
        return { ...prev, ghostX: event.clientX, ghostY: event.clientY };
      });
    },
    []
  );

  const finalizarArrasteDock = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      setArrasteDock((prev) => {
        if (!prev || prev.pointerId !== event.pointerId) return prev;

        const dock = dockRef.current;
        const container = containerRef.current;
        if (dock && container) {
          const dockRect = dock.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const foraDaLista = !pontoDentroRect(
            event.clientX,
            event.clientY,
            dockRect
          );
          const dentroDoMapa = pontoDentroRect(
            event.clientX,
            event.clientY,
            containerRect
          );

          if (foraDaLista && dentroDoMapa) {
            colocarNoMapa(prev.key, event.clientX, event.clientY);
          }
        }

        return null;
      });
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [colocarNoMapa]
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[15]"
      aria-label="Equipamentos no mapa"
    >
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-3 sm:inset-4"
      >
        {dockAberta ? (
          <div
            ref={dockRef}
            className={cn(
              "pointer-events-auto absolute left-0 z-40 w-40 sm:w-44",
              dockDestaque &&
                "ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent"
            )}
            style={{
              bottom: mapaHudDockBottomOffset(hudScale),
              ...mapaHudCornerScaleStyle(hudScale, "bottom left"),
            }}
          >
            <PainelMapaHudGlass className="flex max-h-44 flex-col overflow-hidden sm:max-h-48">
              <div className="shrink-0 border-b border-white/10 bg-background/40 px-2.5 py-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Equipamentos
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Arraste ↔ mapa
                </p>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
                {gruposNaLista.length === 0 ? (
                  <li className="px-1 py-1.5 text-center text-[10px] text-muted-foreground">
                    Todos no mapa
                  </li>
                ) : (
                  gruposNaLista.map((grupo) => {
                    const key = getGrupoEquipamentoKey(grupo);
                    const nome = getGrupoEquipamentoNome(grupo, equipById);
                    const online = getGrupoEquipamentoOnline(
                      grupo,
                      unidade.id,
                      metricMap
                    );

                    return (
                      <li key={key} className="mb-1 last:mb-0">
                        <button
                          type="button"
                          className="flex w-full cursor-grab items-center gap-1.5 rounded-md border border-white/10 bg-background/50 px-2 py-1.5 text-left text-[11px] active:cursor-grabbing hover:bg-background/70"
                          onPointerDown={(e) => iniciarArrasteDock(e, key, nome)}
                          onPointerMove={moverArrasteDock}
                          onPointerUp={finalizarArrasteDock}
                          onPointerCancel={finalizarArrasteDock}
                        >
                          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
            </PainelMapaHudGlass>
          </div>
        ) : null}

        {gruposNoMapa.map((grupo) => {
          const key = getGrupoEquipamentoKey(grupo);
          const pos = posicoesNoMapa[key];
          if (!pos) return null;

          return (
            <PainelMapaHudEquipamentoFloat
              key={key}
              grupo={grupo}
              unidade={unidade}
              equipById={equipById}
              metricMap={metricMap}
              position={pos}
              zIndex={zPorCard[key] ?? 20}
              hudScale={hudScale}
              dockRef={dockRef}
              onPositionChange={(next) => atualizarPosicao(key, next)}
              onBringToFront={() => trazerParaFrente(key)}
              onRemoverDoMapa={() => removerDoMapa(key)}
              onArrasteSobreDock={dockAberta ? setDockDestaque : () => {}}
            />
          );
        })}
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
  );
}
