"use client";

import { useMemo, type ReactNode } from "react";
import { Map as MapIcon, Phone, Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCoord } from "@/lib/geocode";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { monitorTargetId, monitorUnidadeHostTargetId } from "@/lib/types";
import type { UnidadeEndereco } from "@/lib/types";
import {
  labelEquipamentoCatalogo,
  nomeEquipamentoVinculo,
  unidadeToForm,
} from "@/lib/unidade-form";
import { UnidadeChamadosSection } from "@/components/unidades/unidade-chamados-section";
import { UnidadeMissoesSection } from "@/components/unidades/unidade-missoes-section";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  );
}

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
  longitude?: number | null
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
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  hostOnline: boolean;
}) {
  const form = unidadeToForm(unidade);
  const equipById = useMemo(
    () => new Map(catalogo.map((eq) => [eq.id, eq])),
    [catalogo]
  );

  const enderecoTooltip = formatEnderecoTooltip(
    form.endereco,
    unidade.latitude,
    unidade.longitude
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
        </div>
      </div>

      <Separator />

      <UnidadeMissoesSection unidade={unidade} />

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Identificação e rede</h3>
        <DetailRow label="IP" value={unidade.ip?.trim() || "—"} />
        <DetailRow
          label="Intervalo coleta"
          value={`${unidade.intervaloS || 30} s`}
        />
        <DetailRow
          label="Alerta offline"
          value={`${unidade.alertaOfflineS ?? 60} s`}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">
          Equipamentos ({unidade.equipamentos?.length ?? 0})
        </h3>
        {unidade.equipamentos?.length ? (
          <ul className="space-y-3">
            {unidade.equipamentos.map((link) => {
              const eq = equipById.get(link.equipamentoId);
              const tid = monitorTargetId(unidade.id, link.equipamentoId);
              const m = metricMap.get(tid);
              return (
                <li
                  key={link.equipamentoId}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                >
                  <p className="font-medium">
                    {nomeEquipamentoVinculo(link, eq)}
                  </p>
                  {eq && (
                    <p className="text-xs text-muted-foreground">
                      {labelEquipamentoCatalogo(eq)} · porta {link.porta}
                    </p>
                  )}
                  {m && (
                    <Badge
                      className="mt-2"
                      variant={m.online ? "default" : "destructive"}
                    >
                      {m.online ? "Online" : "Offline"}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum equipamento vinculado.
          </p>
        )}
      </section>

      <Separator />

      <UnidadeChamadosSection unidade={unidade} />
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
