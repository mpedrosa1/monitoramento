"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatSnmpMetricValue } from "@/lib/snmp-display";
import type { SnmpPonto } from "@/lib/types";
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

interface TestSnmpOidResponse {
  online: boolean;
  valor?: unknown;
  erro?: string;
}

export function SnmpTestOidDialog({
  open,
  onOpenChange,
  ponto,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ponto: SnmpPonto | null;
}) {
  const oid = ponto?.oid ?? "";
  const pontoNome = ponto?.nome;
  const [host, setHost] = useState("");
  const [port, setPort] = useState("161");
  const [community, setCommunity] = useState("public");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setResultado(null);
      setErro(null);
    }
  }, [open, oid, ponto?._localId]);

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

    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const res = await apiFetch<TestSnmpOidResponse>(
        "/api/v1/equipamentos/snmp/test-oid",
        {
          method: "POST",
          body: JSON.stringify({
            host: hostTrim,
            port: portNum,
            community: community.trim() || "public",
            oid: oid.trim(),
          }),
        }
      );
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setResultado(formatSnmpMetricValue(res.valor, ponto));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao testar OID.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Testar OID</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <p className="text-xs text-muted-foreground">
            {pontoNome?.trim()
              ? `Ponto: ${pontoNome.trim()} — `
              : ""}
            Informe o host e a community para consultar o OID no agente SNMP.
            A community do catálogo é definida na unidade.
          </p>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs break-all">
            {oid}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="snmp-test-host">Host (IP)</Label>
              <Input
                id="snmp-test-host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="snmp-test-port">Porta</Label>
              <Input
                id="snmp-test-port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="161"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="snmp-test-community">Community (teste)</Label>
              <Input
                id="snmp-test-community"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                placeholder="public"
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
                {ponto?.tipoDado === "numerico" &&
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
              <p className="mt-1 font-mono text-sm break-all">{resultado}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={testar} disabled={loading || !oid.trim()}>
            {loading ? "Testando…" : "Executar teste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
