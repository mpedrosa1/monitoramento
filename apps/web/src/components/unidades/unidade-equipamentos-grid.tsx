"use client";

import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeviceMetric, Equipamento, Unidade, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId } from "@/lib/types";
import {
  agruparEquipamentosUnidade,
  detalheVinculoEquipamento,
  nomeEquipamentoVinculo,
  nomeMaquinaVinculo,
  nomeSensorMaquina,
  urlPaginaWebEquipamento,
} from "@/lib/unidade-form";
import { UnidadeEquipamentoLeituras } from "@/components/unidades/unidade-equipamento-leituras";

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
}: {
  unidadeIp?: string;
  link: UnidadeEquipamento;
  eq?: Equipamento;
  metric?: DeviceMetric;
}) {
  const webUrl = urlPaginaWebEquipamento(unidadeIp, link);

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
      <UnidadeEquipamentoLeituras eq={eq} metric={metric} />
    </>
  );
}

function MaquinaEquipamentosCard({
  unidadeId,
  unidadeIp,
  links,
  equipById,
  metricMap,
}: {
  unidadeId: string;
  unidadeIp?: string;
  links: UnidadeEquipamento[];
  equipById: Map<string, Equipamento>;
  metricMap: Map<string, DeviceMetric>;
}) {
  const linkRef = links[0];
  const maquinaNome = nomeMaquinaVinculo(linkRef);
  const webUrl = urlPaginaWebEquipamento(unidadeIp, linkRef);

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

      <ul className="mt-2 space-y-3 border-t border-border/60 pt-2">
        {sensores.map(({ link, eq, metric }) => (
          <li
            key={link._localId ?? `${link.equipamentoId}:${link.porta}`}
            className="space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium text-foreground">
                {nomeSensorMaquina(link, eq)}
              </span>
              {metric ? (
                <EquipamentoStatusDot online={metric.online} />
              ) : null}
            </div>
            <UnidadeEquipamentoLeituras eq={eq} metric={metric} nested />
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

export function contarEquipamentosUnidade(unidade: Unidade): number {
  return agruparEquipamentosUnidade(unidade.equipamentos ?? []).length;
}

export function UnidadeEquipamentosGrid({
  unidade,
  catalogo,
  metricMap,
  className,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
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

  if (grupos.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Nenhum equipamento vinculado.
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {grupos.map((grupo) => {
        if (grupo.tipo === "maquina") {
          return (
            <li
              key={grupo.maquinaId}
              className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm"
            >
              <MaquinaEquipamentosCard
                unidadeId={unidade.id}
                unidadeIp={unidade.ip}
                links={grupo.links}
                equipById={equipById}
                metricMap={metricMap}
              />
            </li>
          );
        }

        const link = grupo.link;
        const eq = equipById.get(link.equipamentoId);
        const metric = metricMap.get(
          monitorTargetId(unidade.id, link.equipamentoId, link.porta)
        );
        const cardKey =
          link._localId ?? `${link.equipamentoId}:${link.porta}:${grupo.index}`;

        return (
          <li
            key={cardKey}
            className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm"
          >
            <EquipamentoAvulsoCard
              unidadeIp={unidade.ip}
              link={link}
              eq={eq}
              metric={metric}
            />
          </li>
        );
      })}
    </ul>
  );
}
