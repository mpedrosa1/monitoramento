"use client";

import type { ReactNode } from "react";
import { Map as MapIcon, Network, Phone, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCoord } from "@/lib/geocode";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { monitorUnidadeHostTargetId } from "@/lib/types";
import type { UnidadeEndereco } from "@/lib/types";
import {
  formatAreaM2,
  unidadeAreaM2Exibicao,
  unidadeTemAreaDefinida,
} from "@/lib/unidade-area";
import { unidadeToForm } from "@/lib/unidade-form";
import { UnidadeEquipamentosSection } from "@/components/unidades/unidade-equipamentos-section";
import { UnidadeMissoesSection } from "@/components/unidades/unidade-missoes-section";

function SatelliteStatusIcon({ inactive }: { inactive: boolean }) {
  return (
    <span className="relative inline-flex shrink-0" aria-hidden>
      <Satellite className="h-3.5 w-3.5" strokeWidth={2} />
      {inactive ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="block h-[1.5px] w-[140%] rotate-45 rounded-full bg-current opacity-95" />
        </span>
      ) : null}
    </span>
  );
}

function ConnectivityStatusBadge({
  hasIp,
  online,
}: {
  hasIp: boolean;
  online: boolean;
}) {
  const label = !hasIp ? "SEM IP" : online ? "ONLINE" : "OFFLINE";
  const inactive = !hasIp || !online;

  return (
    <Badge
      variant={!hasIp ? "secondary" : online ? "default" : "destructive"}
      className="gap-1.5"
    >
      <SatelliteStatusIcon inactive={inactive} />
      {label}
    </Badge>
  );
}

/** Badge com detalhes ao passar o mouse. */
function InfoTag({
  label,
  detail,
  icon,
}: {
  label: string;
  detail: string;
  icon?: ReactNode;
}) {
  if (!detail.trim()) return null;
  return (
    <span className="group/tag relative inline-flex">
      <Badge variant="outline" className="cursor-default select-none gap-1.5">
        {icon}
        {label}
      </Badge>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden min-w-[12rem] max-w-sm rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs leading-relaxed text-popover-foreground shadow-md group-hover/tag:block whitespace-pre-line"
      >
        {detail}
      </span>
    </span>
  );
}

function formatEnderecoTooltip(
  e: UnidadeEndereco,
  latitude?: number | null,
  longitude?: number | null,
  areaM2?: number | null
): string {
  const lines = [
    e.logradouro && e.numero
      ? `${e.logradouro}, nº ${e.numero}`
      : e.logradouro,
    e.complemento,
    e.bairro,
    e.cidade && e.estado ? `${e.cidade} — ${e.estado}` : e.cidade || e.estado,
    e.cep && `CEP ${e.cep}`,
  ].filter(Boolean);

  const lat =
    latitude != null && latitude !== 0 ? formatCoord(latitude) : null;
  const lng =
    longitude != null && longitude !== 0 ? formatCoord(longitude) : null;
  if (lat) lines.push(`Latitude: ${lat}`);
  if (lng) lines.push(`Longitude: ${lng}`);
  if (areaM2 != null && areaM2 > 0) {
    lines.push(`Área: ${formatAreaM2(areaM2)} m²`);
  }

  return lines.join("\n");
}

function formatContatoTooltip(form: ReturnType<typeof unidadeToForm>): string {
  const blocos: string[] = [];

  const diretores = form.diretores.map((s) => s.trim()).filter(Boolean);
  if (diretores.length) {
    blocos.push(`Diretores:\n${diretores.map((n) => `• ${n}`).join("\n")}`);
  }

  const telefones = form.telefones.map((s) => s.trim()).filter(Boolean);
  if (telefones.length) {
    blocos.push(`Telefones:\n${telefones.map((t) => `• ${t}`).join("\n")}`);
  }

  const emails = form.emails.map((s) => s.trim()).filter(Boolean);
  if (emails.length) {
    blocos.push(`E-mails:\n${emails.map((e) => `• ${e}`).join("\n")}`);
  }

  return blocos.join("\n\n");
}

export function UnidadeDetailPanel({
  unidade,
  catalogo,
  metricMap,
  hostOnline,
  canManage,
  onUnidadeUpdated,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  hostOnline: boolean;
  canManage: boolean;
  onUnidadeUpdated: (unidade: Unidade) => void;
}) {
  const form = unidadeToForm(unidade);

  const areaM2 = unidadeTemAreaDefinida(unidade)
    ? unidadeAreaM2Exibicao(unidade)
    : null;
  const enderecoTooltip = formatEnderecoTooltip(
    form.endereco,
    unidade.latitude,
    unidade.longitude,
    areaM2
  );
  const contatoTooltip = formatContatoTooltip(form);

  return (
    <div className="space-y-6 pr-2">
      <div>
        <p className="font-mono text-xs text-muted-foreground">
          ID {unidade.codigo}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ConnectivityStatusBadge
            hasIp={Boolean(unidade.ip?.trim())}
            online={hostOnline}
          />
          {enderecoTooltip ? (
            <InfoTag
              label="Endereço"
              detail={enderecoTooltip}
              icon={
                <MapIcon
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              }
            />
          ) : null}
          {contatoTooltip ? (
            <InfoTag
              label="Contato"
              detail={contatoTooltip}
              icon={
                <Phone
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              }
            />
          ) : null}
          <InfoTag
            label="Rede"
            detail={unidade.ip?.trim() || "IP não cadastrado"}
            icon={
              <Network
                className="h-3.5 w-3.5 shrink-0"
                strokeWidth={2}
                aria-hidden
              />
            }
          />
        </div>
      </div>

      <Separator />

      <UnidadeMissoesSection unidade={unidade} />

      <Separator />

      <UnidadeEquipamentosSection
        unidade={unidade}
        catalogo={catalogo}
        metricMap={metricMap}
        canManage={canManage}
        onUnidadeUpdated={onUnidadeUpdated}
      />
    </div>
  );
}

export function coordsFromUnidade(u: Unidade): { lat: number; lng: number } | null {
  const lat = u.latitude;
  const lng = u.longitude;
  if (lat == null || lng == null) return null;
  if (lat === 0 && lng === 0) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function buildMetricMap(metrics: DeviceMetric[]) {
  const map = new Map<string, DeviceMetric>();
  for (const m of metrics) {
    const key = m.targetId || m.dispositivoId;
    map.set(key, m);
    if (
      m.unidadeId &&
      m.tipo === "ping" &&
      !m.porta &&
      (key.endsWith(":host") || m.targetId?.endsWith(":host"))
    ) {
      map.set(monitorUnidadeHostTargetId(m.unidadeId), m);
    }
  }
  return map;
}
