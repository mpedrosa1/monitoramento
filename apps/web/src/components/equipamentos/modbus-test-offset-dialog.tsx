"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  isModbusTipoDadoNumerico,
  modbusPontoParaDisplayTipo,
  modbusRegistroComEstados,
  modbusRegistroComTipoDado,
  modbusRegistroLabel,
  modbusTipoDadoLabel,
} from "@/lib/modbus-presets";
import { resolveSnmpMetricDisplay } from "@/lib/snmp-display";
import type { ModbusPonto, SnmpPonto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TestModbusOffsetResponse {
  online: boolean;
  valor?: unknown;
  erro?: string;
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

export function ModbusTestOffsetDialog({
  open,
  onOpenChange,
  ponto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponto: ModbusPonto | null;
}) {
  const offset = ponto?.offset ?? 0;
  const registro = ponto?.registro ?? "holding_register";
  const pontoNome = ponto?.nome;
  const [host, setHost] = useState("");
  const [port, setPort] = useState("502");
  const [slaveId, setSlaveId] = useState("1");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    text: string;
    color?: string;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResultado(null);
      setErro(null);
    }
  }, [open, offset, ponto?._localId]);

  async function testar() {
    const hostTrim = host.trim();
    if (!hostTrim) {
      setErro("Informe o host (IP) do equipamento.");
      setResultado(null);
      return;
    }
    const portNum = Number.parseInt(port, 10);
    if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setErro("Porta inválida.");
      setResultado(null);
      return;
    }
    const slaveNum = Number.parseInt(slaveId, 10);
    if (Number.isNaN(slaveNum) || slaveNum < 0 || slaveNum > 255) {
      setErro("Slave ID inválido (0–255).");
      setResultado(null);
      return;
    }

    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await apiFetch<TestModbusOffsetResponse>(
        "/api/v1/equipamentos/modbus/test-offset",
        {
          method: "POST",
          body: JSON.stringify({
            host: hostTrim,
            port: portNum,
            slaveId: slaveNum,
            registro,
            offset,
            tipoDado: ponto?.tipoDado,
          }),
        }
      );
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setResultado(
        resolveSnmpMetricDisplay(
          res.valor,
          ponto ? pontoModbusParaDisplay(ponto) : null
        )
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao testar offset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Testar offset</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <p className="text-xs text-muted-foreground">
            {pontoNome?.trim()
              ? `Ponto: ${pontoNome.trim()} — `
              : ""}
            Informe o host e o Slave ID para ler o offset no dispositivo Modbus.
            A conexão da unidade é definida na unidade.
          </p>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            Offset {offset} · {modbusRegistroLabel[registro]}
            {modbusRegistroComTipoDado(registro) && ponto?.tipoDado
              ? ` · ${modbusTipoDadoLabel[ponto.tipoDado]}`
              : modbusRegistroComEstados(registro)
                ? " · Binary"
                : ""}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="modbus-test-host">Host (IP)</Label>
              <Input
                id="modbus-test-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modbus-test-port">Porta</Label>
              <Input
                id="modbus-test-port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="502"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modbus-test-slave">Slave ID</Label>
              <Input
                id="modbus-test-slave"
                value={slaveId}
                onChange={(e) => setSlaveId(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          {erro && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}
          {resultado !== null && (
            <div className="rounded-md border border-border bg-card px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">
                Valor lido
                {ponto &&
                  isModbusTipoDadoNumerico(ponto.tipoDado) &&
                  ponto.multiplicador != null &&
                  ponto.multiplicador !== 1 && (
                    <span className="font-normal">
                      {" "}
                      (multiplicador {ponto.multiplicador}
                      {ponto.unidade?.trim()
                        ? ` · ${ponto.unidade.trim()}`
                        : ""}
                      )
                    </span>
                  )}
              </p>
              <p
                className="mt-1 font-mono text-sm font-medium break-all"
                style={
                  resultado.color ? { color: resultado.color } : undefined
                }
              >
                {resultado.text}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={testar} disabled={loading}>
            {loading ? "Testando…" : "Executar teste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
