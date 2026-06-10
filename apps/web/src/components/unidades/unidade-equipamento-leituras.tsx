"use client";

import {
  isSnmpTimeoutValue,
  resolveSnmpLeituraDisplay,
} from "@/lib/snmp-display";
import {
  modbusPontoParaDisplayTipo,
  normalizeModbusPontos,
} from "@/lib/modbus-presets";
import { normalizeSnmpPontos } from "@/lib/snmp-presets";
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

export function UnidadeEquipamentoLeituras({
  eq,
  metric,
  nested,
}: {
  eq?: Equipamento;
  metric?: DeviceMetric;
  nested?: boolean;
}) {
  if (!eq) return null;

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

    const valores = metric?.valores;
    const erroGeral =
      typeof valores?.erro === "string" ? valores.erro : undefined;

    return (
      <ul
        className={cn(
          nested
            ? "mt-1 space-y-1"
            : "mt-2 space-y-1.5 border-t border-border/60 pt-2"
        )}
      >
        {pontos.map((ponto) => {
          const label = ponto.nome.trim() || ponto.oid;
          const raw = valorDoPonto(valores, ponto);
          const timeout =
            isSnmpTimeoutValue(raw) ||
            (raw === undefined && isSnmpTimeoutValue(erroGeral));
          const display = timeout
            ? { text: "timeout", isTimeout: true as const }
            : resolveSnmpLeituraDisplay(raw, ponto);
          const semLeitura = raw === undefined && !erroGeral && !timeout;

          return (
            <li
              key={chavePonto(ponto)}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {label}
              </span>
              <span
                className={cn(
                  "shrink-0 text-right font-mono font-medium",
                  display.isTimeout
                    ? "text-destructive"
                    : "text-foreground"
                )}
                style={
                  display.isTimeout || !display.color
                    ? undefined
                    : { color: display.color }
                }
                title={ponto.oid}
              >
                {semLeitura ? "—" : display.text}
              </span>
            </li>
          );
        })}
        {erroGeral && !isSnmpTimeoutValue(erroGeral) ? (
          <li className="text-xs text-destructive">{erroGeral}</li>
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

    const valores = metric?.valores;
    const erroGeral =
      typeof valores?.erro === "string" ? valores.erro : undefined;

    return (
      <ul
        className={cn(
          nested
            ? "mt-1 space-y-1"
            : "mt-2 space-y-1.5 border-t border-border/60 pt-2"
        )}
      >
        {pontos.map((ponto) => {
          const label = ponto.nome.trim() || `Offset ${ponto.offset}`;
          const raw = valorDoPontoModbus(valores, ponto);
          const timeout =
            isSnmpTimeoutValue(raw) ||
            (raw === undefined && isSnmpTimeoutValue(erroGeral));
          const display = timeout
            ? { text: "timeout", isTimeout: true as const }
            : resolveSnmpLeituraDisplay(raw, pontoModbusParaDisplay(ponto));
          const semLeitura = raw === undefined && !erroGeral && !timeout;

          return (
            <li
              key={chavePontoModbus(ponto)}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="min-w-0 truncate text-muted-foreground">
                {label}
              </span>
              <span
                className={cn(
                  "shrink-0 text-right font-mono font-medium",
                  display.isTimeout
                    ? "text-destructive"
                    : "text-foreground"
                )}
                style={
                  display.isTimeout || !display.color
                    ? undefined
                    : { color: display.color }
                }
                title={`Offset ${ponto.offset}`}
              >
                {semLeitura ? "—" : display.text}
              </span>
            </li>
          );
        })}
        {erroGeral && !isSnmpTimeoutValue(erroGeral) ? (
          <li className="text-xs text-destructive">{erroGeral}</li>
        ) : null}
      </ul>
    );
  }

  const valorEntries = metric?.valores
    ? Object.entries(metric.valores).filter(([k]) => k !== "erro")
    : [];

  if (valorEntries.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", nested ? "mt-1" : "mt-2")}>
        {metric ? "Sem leituras disponíveis." : "Aguardando coleta…"}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        nested
          ? "mt-1 space-y-1"
          : "mt-2 space-y-1.5 border-t border-border/60 pt-2"
      )}
    >
      {valorEntries.map(([key, raw]) => {
        const timeout = isSnmpTimeoutValue(raw);
        return (
          <li
            key={key}
            className="flex items-baseline justify-between gap-3 text-xs"
          >
            <span className="min-w-0 truncate text-muted-foreground">
              {key}
            </span>
            <span
              className={cn(
                "shrink-0 font-mono font-medium",
                timeout ? "text-destructive" : "text-foreground"
              )}
            >
              {raw == null ? "—" : timeout ? "timeout" : String(raw)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
