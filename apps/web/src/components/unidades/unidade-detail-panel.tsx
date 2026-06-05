"use client";

import { useMemo, type ReactNode } from "react";
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

/** Badge com detalhes ao passar o mouse (estilo ONLINE/OFFLINE). */
function InfoTag({ label, detail }: { label: string; detail: string }) {
  if (!detail.trim()) return null;
  return (
    <span className="group/tag relative inline-flex">
      <Badge variant="outline" className="cursor-default select-none">
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

function formatEnderecoTooltip(e: UnidadeEndereco): string {
  const lines = [
    e.logradouro && e.numero
      ? `${e.logradouro}, nº ${e.numero}`
      : e.logradouro,
    e.complemento,
    e.bairro,
    e.cidade && e.estado ? `${e.cidade} — ${e.estado}` : e.cidade || e.estado,
    e.cep && `CEP ${e.cep}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function formatInformacoesTooltip(form: ReturnType<typeof unidadeToForm>): string {
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

  const enderecoTooltip = formatEnderecoTooltip(form.endereco);
  const informacoesTooltip = formatInformacoesTooltip(form);

  return (
    <div className="space-y-6 pr-2">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{unidade.codigo}</p>
        <h2 className="text-xl font-semibold tracking-tight">{unidade.nome}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={hostOnline ? "default" : "destructive"}>
            {unidade.ip?.trim()
              ? hostOnline
                ? "ONLINE"
                : "OFFLINE"
              : "SEM IP"}
          </Badge>
          {enderecoTooltip ? (
            <InfoTag label="Endereço" detail={enderecoTooltip} />
          ) : null}
          {informacoesTooltip ? (
            <InfoTag label="Informações" detail={informacoesTooltip} />
          ) : null}
        </div>
      </div>

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
        <DetailRow
          label="Latitude"
          value={
            unidade.latitude != null && unidade.latitude !== 0
              ? formatCoord(unidade.latitude)
              : "—"
          }
        />
        <DetailRow
          label="Longitude"
          value={
            unidade.longitude != null && unidade.longitude !== 0
              ? formatCoord(unidade.longitude)
              : "—"
          }
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
