"use client";

import { TriangleAlert } from "lucide-react";
import {
  filtrarValoresTimeout,
  isSnmpTimeoutValue,
  resolverLeituraComFallback,
  resolveSnmpLeituraDisplay,
  valoresLeituraParaExibicao,
} from "@/lib/snmp-display";
import {
  modbusPontoParaDisplayTipo,
  normalizeModbusPontos,
} from "@/lib/modbus-presets";
import { normalizeSnmpPontos } from "@/lib/snmp-presets";
import type { EquipamentosLayout } from "@/lib/equipamentos-layout";
import { cn } from "@/lib/utils";
import type {
  DeviceMetric,
  Equipamento,
  ModbusPonto,
  SnmpPonto,
} from "@/lib/types";

function valorDoPonto(
  valores: Record<string, unknown> | undefined,
  ponto: SnmpPonto
): unknown {
  if (!valores) return undefined;
  const nome = ponto.nome.trim();
  const oid = ponto.oid.trim();
  if (nome && nome in valores) return valores[nome];
  if (oid && oid in valores) return valores[oid];
  return undefined;
}

function chavePonto(ponto: SnmpPonto): string {
  return ponto._localId ?? ponto.oid ?? ponto.nome;
}

function pontoModbusParaDisplay(ponto: ModbusPonto): SnmpPonto {
  return {
    nome: ponto.nome,
    oid: String(ponto.offset),
    tipoDado: modbusPontoParaDisplayTipo(ponto),
    unidade: ponto.unidade,
    multiplicador: ponto.multiplicador,
    estadosMulti: ponto.estadosMulti,
  };
}

function valorDoPontoModbus(
  valores: Record<string, unknown> | undefined,
  ponto: ModbusPonto
): unknown {
  if (!valores) return undefined;
  const nome = ponto.nome.trim();
  if (nome && nome in valores) return valores[nome];
  const regKey = `reg_${ponto.offset}`;
  if (regKey in valores) return valores[regKey];
  const offsetKey = `offset_${ponto.offset}`;
  if (offsetKey in valores) return valores[offsetKey];
  return undefined;
}

function chavePontoModbus(ponto: ModbusPonto): string {
  return ponto._localId ?? String(ponto.offset) ?? ponto.nome;
}

function ultimosValoresEfetivos(metric?: DeviceMetric) {
  return (
    metric?.ultimosValores ?? filtrarValoresTimeout(metric?.valores) ?? undefined
  );
}

function ValorLeitura({
  display,
  semLeitura,
  desatualizada,
  title,
}: {
  display: { text: string; color?: string };
  semLeitura: boolean;
  desatualizada: boolean;
  title?: string;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-end gap-1 text-right font-mono font-medium text-foreground"
      style={!display.color ? undefined : { color: display.color }}
      title={title}
    >
      {desatualizada && !semLeitura ? (
        <TriangleAlert
          className="h-3.5 w-3.5 shrink-0 text-amber-500"
          aria-label="Leitura desatualizada"
        />
      ) : null}
      {semLeitura ? "—" : display.text}
    </span>
  );
}

function leiturasListClass(
  nested: boolean | undefined,
  layout: EquipamentosLayout | undefined
) {
  const isLista = layout === "lista";
  if (nested) {
    return cn(
      "mt-1",
      isLista ? "divide-y divide-border/60" : "space-y-1"
    );
  }
  return cn(
    "mt-2 border-t border-border/60 pt-2",
    isLista ? "divide-y divide-border/60" : "space-y-1.5"
  );
}

function leituraItemClass(layout: EquipamentosLayout | undefined) {
  return cn(
    "flex items-center justify-between gap-3 text-xs",
    layout === "lista" && "py-1.5"
  );
}

export function UnidadeEquipamentoLeituras({
  eq,
  metric,
  nested,
  layout,
  unidadeOffline = false,
}: {
  eq?: Equipamento;
  metric?: DeviceMetric;
  nested?: boolean;
  layout?: EquipamentosLayout;
  unidadeOffline?: boolean;
}) {
  if (!eq) return null;

  const ultimos = ultimosValoresEfetivos(metric);
  const valoresAtuais = metric?.valores;
  const erroGeralAtual =
    typeof valoresAtuais?.erro === "string" ? valoresAtuais.erro : undefined;
  const erroGeralVisivel =
    erroGeralAtual && !isSnmpTimeoutValue(erroGeralAtual)
      ? erroGeralAtual
      : undefined;

  if (eq.tipoMonitoramento === "snmp") {
    const pontos = normalizeSnmpPontos(eq.config).filter(
      (p) => !p.desabilitado && p.oid.trim()
    );

    if (pontos.length === 0) {
      return (
        <p className={cn("text-xs text-muted-foreground", nested ? "mt-1" : "mt-2")}>
          Nenhum ponto SNMP configurado neste equipamento.
        </p>
      );
    }

    const valoresOffline = valoresLeituraParaExibicao(metric, true);

    return (
      <ul className={leiturasListClass(nested, layout)}>
        {pontos.map((ponto) => {
          const label = ponto.nome.trim() || ponto.oid;

          let raw: unknown;
          let desatualizada = false;

          if (unidadeOffline) {
            raw = valorDoPonto(valoresOffline, ponto);
            desatualizada = raw !== undefined;
          } else {
            const rawAtual = valorDoPonto(valoresAtuais, ponto);
            const resolvido = resolverLeituraComFallback(
              rawAtual,
              erroGeralAtual,
              ultimos,
              (u) => valorDoPonto(u, ponto)
            );
            raw = resolvido.raw;
            desatualizada = resolvido.desatualizada;
          }

          const display = resolveSnmpLeituraDisplay(raw, ponto);
          const semLeitura = raw === undefined;

          return (
            <li key={chavePonto(ponto)} className={leituraItemClass(layout)}>
              <span className="min-w-0 truncate text-muted-foreground">
                {label}
              </span>
              <ValorLeitura
                display={display}
                semLeitura={semLeitura}
                desatualizada={desatualizada}
                title={ponto.oid}
              />
            </li>
          );
        })}
        {erroGeralVisivel && !unidadeOffline ? (
          <li className="text-xs text-destructive">{erroGeralVisivel}</li>
        ) : null}
      </ul>
    );
  }

  if (eq.tipoMonitoramento === "modbus") {
    const pontos = normalizeModbusPontos(eq.config).filter(
      (p) => !p.desabilitado
    );

    if (pontos.length === 0) {
      return (
        <p className={cn("text-xs text-muted-foreground", nested ? "mt-1" : "mt-2")}>
          Nenhum ponto Modbus configurado neste equipamento.
        </p>
      );
    }

    const valoresOffline = valoresLeituraParaExibicao(metric, true);

    return (
      <ul className={leiturasListClass(nested, layout)}>
        {pontos.map((ponto) => {
          const label = ponto.nome.trim() || `Offset ${ponto.offset}`;
          const pontoDisplay = pontoModbusParaDisplay(ponto);

          let raw: unknown;
          let desatualizada = false;

          if (unidadeOffline) {
            raw = valorDoPontoModbus(valoresOffline, ponto);
            desatualizada = raw !== undefined;
          } else {
            const rawAtual = valorDoPontoModbus(valoresAtuais, ponto);
            const resolvido = resolverLeituraComFallback(
              rawAtual,
              erroGeralAtual,
              ultimos,
              (u) => valorDoPontoModbus(u, ponto)
            );
            raw = resolvido.raw;
            desatualizada = resolvido.desatualizada;
          }

          const display = resolveSnmpLeituraDisplay(raw, pontoDisplay);
          const semLeitura = raw === undefined;

          return (
            <li key={chavePontoModbus(ponto)} className={leituraItemClass(layout)}>
              <span className="min-w-0 truncate text-muted-foreground">
                {label}
              </span>
              <ValorLeitura
                display={display}
                semLeitura={semLeitura}
                desatualizada={desatualizada}
                title={`Offset ${ponto.offset}`}
              />
            </li>
          );
        })}
        {erroGeralVisivel && !unidadeOffline ? (
          <li className="text-xs text-destructive">{erroGeralVisivel}</li>
        ) : null}
      </ul>
    );
  }

  const valores = valoresLeituraParaExibicao(metric, unidadeOffline);
  const valorEntries = valores
    ? Object.entries(valores).filter(([k]) => k !== "erro")
    : [];

  if (valorEntries.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", nested ? "mt-1" : "mt-2")}>
        {metric ? "Sem leituras disponíveis." : "Aguardando coleta…"}
      </p>
    );
  }

  return (
    <ul className={leiturasListClass(nested, layout)}>
      {valorEntries.map(([key, rawAtual]) => {
        let raw: unknown;
        let desatualizada = false;

        if (unidadeOffline) {
          raw = rawAtual;
          desatualizada = raw !== undefined && raw !== null;
        } else {
          const resolvido = resolverLeituraComFallback(
            rawAtual,
            erroGeralAtual,
            ultimos,
            (u) => u[key]
          );
          raw = resolvido.raw;
          desatualizada = resolvido.desatualizada;
        }

        const display = resolveSnmpLeituraDisplay(raw);
        const semLeitura = raw == null || raw === undefined;

        return (
          <li key={key} className={leituraItemClass(layout)}>
            <span className="min-w-0 truncate text-muted-foreground">{key}</span>
            <ValorLeitura
              display={display}
              semLeitura={semLeitura}
              desatualizada={desatualizada}
            />
          </li>
        );
      })}
    </ul>
  );
}
