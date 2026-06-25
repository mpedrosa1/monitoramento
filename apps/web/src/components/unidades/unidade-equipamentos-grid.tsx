"use client";

import { useMemo, useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { EquipamentoAlertasDialog } from "@/components/equipamentos/equipamento-alertas-dialog";
import type { DeviceMetric, Equipamento, Unidade, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId, monitorUnidadeHostTargetId } from "@/lib/types";
import {
  agruparEquipamentosUnidade,
  detalheVinculoEquipamento,
  nomeEquipamentoVinculo,
  nomeMaquinaVinculo,
  nomeSensorMaquina,
  urlPaginaWebEquipamento,
} from "@/lib/unidade-form";
import type {
  EquipamentosFiltro,
  EquipamentosLayout,
} from "@/lib/equipamentos-layout";
import { UnidadeEquipamentoLeituras } from "@/components/unidades/unidade-equipamento-leituras";

type ConfigAlertasFn = (link: UnidadeEquipamento, eq?: Equipamento) => void;

function EquipamentoStatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        online ? "bg-emerald-500" : "bg-destructive"
      )}
      role="status"
      aria-label={online ? "Online" : "Offline"}
      title={online ? "Online" : "Offline"}
    />
  );
}

function EquipamentoAvulsoCard({
  unidadeIp,
  link,
  eq,
  metric,
  unidadeOffline,
  layout,
  hideWebLink = false,
  onConfigAlertas,
}: {
  unidadeIp?: string;
  link: UnidadeEquipamento;
  eq?: Equipamento;
  metric?: DeviceMetric;
  unidadeOffline: boolean;
  layout: EquipamentosLayout;
  hideWebLink?: boolean;
  onConfigAlertas?: ConfigAlertasFn;
}) {
  const webUrl = hideWebLink ? undefined : urlPaginaWebEquipamento(unidadeIp, link);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="group/equip relative inline-flex max-w-full min-w-0 items-center">
            <span className="truncate font-medium leading-7">
              {nomeEquipamentoVinculo(link, eq)}
            </span>
            {eq ? (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-max min-w-[16rem] max-w-md rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-md group-hover/equip:block whitespace-normal"
              >
                {detalheVinculoEquipamento(link, eq)}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onConfigAlertas ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onConfigAlertas(link, eq)}
              aria-label="Configurar alertas"
              title="Configurar alertas"
            >
              <Bell className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {webUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                window.open(webUrl, "_blank", "noopener,noreferrer")
              }
              aria-label="Abrir página web do equipamento"
              title="Abrir página web"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {metric ? (
            <span className="flex h-7 w-3.5 items-center justify-center">
              <EquipamentoStatusDot online={metric.online} />
            </span>
          ) : null}
        </div>
      </div>
      <UnidadeEquipamentoLeituras
        eq={eq}
        metric={metric}
        layout={layout}
        unidadeOffline={unidadeOffline}
      />
    </>
  );
}

function MaquinaEquipamentosCard({
  unidadeId,
  unidadeIp,
  links,
  equipById,
  metricMap,
  unidadeOffline,
  layout,
  hideWebLink = false,
  onConfigAlertas,
}: {
  unidadeId: string;
  unidadeIp?: string;
  links: UnidadeEquipamento[];
  equipById: Map<string, Equipamento>;
  metricMap: Map<string, DeviceMetric>;
  unidadeOffline: boolean;
  layout: EquipamentosLayout;
  hideWebLink?: boolean;
  onConfigAlertas?: ConfigAlertasFn;
}) {
  const linkRef = links[0];
  const maquinaNome = nomeMaquinaVinculo(linkRef);
  const webUrl = hideWebLink ? undefined : urlPaginaWebEquipamento(unidadeIp, linkRef);

  const sensores = links.map((link) => {
    const eq = equipById.get(link.equipamentoId);
    const metric = metricMap.get(
      monitorTargetId(unidadeId, link.equipamentoId, link.porta)
    );
    return { link, eq, metric };
  });

  const metricas = sensores.map((s) => s.metric).filter(Boolean);
  const maquinaOnline =
    metricas.length > 0 && metricas.every((m) => m!.online);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="group/equip relative inline-flex max-w-full min-w-0 items-center">
            <span className="truncate font-medium leading-7">{maquinaNome}</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-max min-w-[16rem] max-w-md rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-md group-hover/equip:block whitespace-normal"
            >
              {links.map((link) => {
                const eq = equipById.get(link.equipamentoId);
                return eq ? labelSensorTooltip(link, eq) : link.equipamentoId;
              }).join("\n")}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {webUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() =>
                window.open(webUrl, "_blank", "noopener,noreferrer")
              }
              aria-label="Abrir página web da máquina"
              title="Abrir página web"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {metricas.length > 0 ? (
            <span className="flex h-7 w-3.5 items-center justify-center">
              <EquipamentoStatusDot online={maquinaOnline} />
            </span>
          ) : null}
        </div>
      </div>

      <ul
        className={cn(
          "mt-2 border-t border-border/60 pt-2",
          layout === "lista"
            ? "divide-y divide-border/60"
            : "space-y-3"
        )}
      >
        {sensores.map(({ link, eq, metric }) => (
          <li
            key={link._localId ?? `${link.equipamentoId}:${link.porta}`}
            className={cn(
              "space-y-1",
              layout === "lista" && "py-2 first:pt-0 last:pb-0"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-foreground">
                {nomeSensorMaquina(link, eq)}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {onConfigAlertas ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onConfigAlertas(link, eq)}
                    aria-label="Configurar alertas"
                    title="Configurar alertas"
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                {metric ? (
                  <EquipamentoStatusDot online={metric.online} />
                ) : null}
              </div>
            </div>
            <UnidadeEquipamentoLeituras
              eq={eq}
              metric={metric}
              nested
              layout={layout}
              unidadeOffline={unidadeOffline}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function labelSensorTooltip(
  link: UnidadeEquipamento,
  eq: Equipamento
): string {
  return nomeSensorMaquina(link, eq);
}

export type GrupoEquipamentoUnidade = ReturnType<
  typeof agruparEquipamentosUnidade
>[number];

export function getGrupoEquipamentoKey(grupo: GrupoEquipamentoUnidade): string {
  if (grupo.tipo === "maquina") return `maq:${grupo.maquinaId}`;
  const link = grupo.link;
  return link._localId ?? `${link.equipamentoId}:${link.porta}:${grupo.index}`;
}

export function getGrupoEquipamentoNome(
  grupo: GrupoEquipamentoUnidade,
  equipById: Map<string, Equipamento>
): string {
  if (grupo.tipo === "maquina") return nomeMaquinaVinculo(grupo.links[0]);
  const eq = equipById.get(grupo.link.equipamentoId);
  return nomeEquipamentoVinculo(grupo.link, eq);
}

export function getGrupoEquipamentoOnline(
  grupo: GrupoEquipamentoUnidade,
  unidadeId: string,
  metricMap: Map<string, DeviceMetric>
): boolean | null {
  if (grupo.tipo === "maquina") {
    const metricas = grupo.links
      .map((link) =>
        metricMap.get(monitorTargetId(unidadeId, link.equipamentoId, link.porta))
      )
      .filter(Boolean);
    if (metricas.length === 0) return null;
    return metricas.every((m) => m!.online);
  }
  const metric = metricMap.get(
    monitorTargetId(unidadeId, grupo.link.equipamentoId, grupo.link.porta)
  );
  if (!metric) return null;
  return metric.online;
}

const cardBaseClass =
  "flex h-full min-w-0 flex-col rounded-lg border px-3 py-2.5 text-sm";
const cardNobreakClass = cn(cardBaseClass, "border-border bg-blue-100/40 dark:bg-muted/50");
const cardMaquinaClass = cn(
  cardBaseClass,
  "border-border bg-blue-50/50 dark:bg-muted/95"
);

export function UnidadeEquipamentoGrupoCard({
  grupo,
  unidade,
  equipById,
  metricMap,
  layout,
  surface = "painel",
  className,
  onConfigAlertas,
}: {
  grupo: GrupoEquipamentoUnidade;
  unidade: Unidade;
  equipById: Map<string, Equipamento>;
  metricMap: Map<string, DeviceMetric>;
  layout: EquipamentosLayout;
  surface?: "painel" | "hud";
  className?: string;
  onConfigAlertas?: ConfigAlertasFn;
}) {
  const unidadeOffline = !(
    metricMap.get(monitorUnidadeHostTargetId(unidade.id))?.online ?? false
  );
  const hideWebLink = surface === "hud";
  const surfaceClass =
    surface === "painel"
      ? grupo.tipo === "maquina"
        ? cardMaquinaClass
        : cardNobreakClass
      : "min-w-0 text-sm";

  if (grupo.tipo === "maquina") {
    return (
      <div className={cn(surfaceClass, className)}>
        <MaquinaEquipamentosCard
          unidadeId={unidade.id}
          unidadeIp={unidade.ip}
          links={grupo.links}
          equipById={equipById}
          metricMap={metricMap}
          unidadeOffline={unidadeOffline}
          layout={layout}
          hideWebLink={hideWebLink}
          onConfigAlertas={onConfigAlertas}
        />
      </div>
    );
  }

  const link = grupo.link;
  const eq = equipById.get(link.equipamentoId);
  const metric = metricMap.get(
    monitorTargetId(unidade.id, link.equipamentoId, link.porta)
  );

  return (
    <div className={cn(surfaceClass, className)}>
      <EquipamentoAvulsoCard
        unidadeIp={unidade.ip}
        link={link}
        eq={eq}
        metric={metric}
        unidadeOffline={unidadeOffline}
        layout={layout}
        hideWebLink={hideWebLink}
        onConfigAlertas={onConfigAlertas}
      />
    </div>
  );
}

export function contarEquipamentosUnidade(unidade: Unidade): number {
  return agruparEquipamentosUnidade(unidade.equipamentos ?? []).length;
}

export function filtrarGruposEquipamentos(
  grupos: ReturnType<typeof agruparEquipamentosUnidade>,
  filtro: EquipamentosFiltro,
  equipById: Map<string, Equipamento>
) {
  if (filtro === "todos") return grupos;
  if (filtro === "maquinas") {
    return grupos.filter((g) => g.tipo === "maquina");
  }
  return grupos.filter((g) => {
    if (g.tipo !== "item") return false;
    const eq = equipById.get(g.link.equipamentoId);
    return eq?.tipoEquipamento === "nobreak";
  });
}

export function UnidadeEquipamentosGrid({
  unidade,
  catalogo,
  metricMap,
  layout = "grade",
  filtro = "todos",
  className,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  layout?: EquipamentosLayout;
  filtro?: EquipamentosFiltro;
  className?: string;
}) {
  const equipById = useMemo(
    () => new Map(catalogo.map((eq) => [eq.id, eq])),
    [catalogo]
  );

  const links = unidade.equipamentos ?? [];
  const grupos = useMemo(
    () => agruparEquipamentosUnidade(links),
    [links]
  );
  const gruposVisiveis = useMemo(
    () => filtrarGruposEquipamentos(grupos, filtro, equipById),
    [grupos, filtro, equipById]
  );

  const { canEquipAlarmes } = usePermissions();
  const [alertaTarget, setAlertaTarget] = useState<{
    link: UnidadeEquipamento;
    eq?: Equipamento;
  } | null>(null);

  const onConfigAlertas: ConfigAlertasFn | undefined = canEquipAlarmes
    ? (link, eq) => setAlertaTarget({ link, eq })
    : undefined;

  if (grupos.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Nenhum equipamento vinculado.
      </p>
    );
  }

  if (gruposVisiveis.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {filtro === "todos"
          ? "Nenhum equipamento vinculado."
          : "Nenhum equipamento neste filtro."}
      </p>
    );
  }

  const isLista = layout === "lista";

  return (
    <>
      <ul
        className={cn(
          isLista
            ? "flex flex-col gap-2"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className
        )}
      >
        {gruposVisiveis.map((grupo) => (
          <li key={getGrupoEquipamentoKey(grupo)}>
            <UnidadeEquipamentoGrupoCard
              grupo={grupo}
              unidade={unidade}
              equipById={equipById}
              metricMap={metricMap}
              layout={layout}
              surface="painel"
              onConfigAlertas={onConfigAlertas}
            />
          </li>
        ))}
      </ul>
      {alertaTarget ? (
        <EquipamentoAlertasDialog
          open
          onOpenChange={(o) => {
            if (!o) setAlertaTarget(null);
          }}
          unidade={unidade}
          link={alertaTarget.link}
          equipamento={alertaTarget.eq}
        />
      ) : null}
    </>
  );
}
