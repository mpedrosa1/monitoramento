"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatPlaca } from "@/lib/veiculo-placa";
import type {
  Colaborador,
  CondutorRotaExataDivergencia,
  Veiculo,
  VerificarCondutoresRotaExataResult,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DivergenciaItemProps = {
  divergencia: CondutorRotaExataDivergencia;
  veiculo?: Veiculo;
  colaboradorAtual?: Colaborador;
  colaboradorSugerido?: Colaborador;
  colaboradores: Colaborador[];
  onResolved: () => void;
};

function DivergenciaItem({
  divergencia,
  veiculo,
  colaboradorAtual,
  colaboradorSugerido,
  colaboradores,
  onResolved,
}: DivergenciaItemProps) {
  const [loading, setLoading] = useState<"aprovar" | "recusar" | null>(null);
  const [colaboradorEscolhido, setColaboradorEscolhido] = useState(
    divergencia.motoristaSugeridoId ?? ""
  );

  const placa = veiculo ? formatPlaca(veiculo.placa) : "—";
  const precisaEscolher = !divergencia.motoristaSugeridoId;

  async function aprovar() {
    const colaboradorId = colaboradorEscolhido.trim();
    if (precisaEscolher && !colaboradorId) {
      window.alert("Selecione o colaborador correspondente ao condutor da Rota Exata.");
      return;
    }

    setLoading("aprovar");
    try {
      await apiFetch<CondutorRotaExataDivergencia>(
        `/api/v1/veiculos/condutor-divergencias/${divergencia.id}/aprovar`,
        {
          method: "POST",
          body: JSON.stringify(
            colaboradorId ? { colaboradorId } : {}
          ),
        }
      );
      onResolved();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao aprovar troca de condutor");
    } finally {
      setLoading(null);
    }
  }

  async function recusar() {
    setLoading("recusar");
    try {
      await apiFetch<CondutorRotaExataDivergencia>(
        `/api/v1/veiculos/condutor-divergencias/${divergencia.id}/recusar`,
        { method: "POST" }
      );
      onResolved();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao recusar troca de condutor");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {placa}
            </Badge>
            {veiculo ? (
              <span className="text-sm text-muted-foreground">
                {veiculo.marca} {veiculo.modelo}
              </span>
            ) : null}
          </div>
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Condutor no sistema</dt>
              <dd className="font-medium">
                {colaboradorAtual?.nome ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Condutor na Rota Exata</dt>
              <dd className="font-medium">
                {divergencia.rotaExataMotoristaNome || "—"}
              </dd>
            </div>
          </dl>
          {colaboradorSugerido ? (
            <p className="text-xs text-muted-foreground">
              Correspondência sugerida:{" "}
              <span className="font-medium text-foreground">
                {colaboradorSugerido.nome}
              </span>
            </p>
          ) : precisaEscolher ? (
            <div className="max-w-sm space-y-1.5 pt-1">
              <Label htmlFor={`condutor-rx-${divergencia.id}`}>
                Vincular ao colaborador
              </Label>
              <Select
                value={colaboradorEscolhido || null}
                onValueChange={(v) => setColaboradorEscolhido(v ?? "")}
              >
                <SelectTrigger id={`condutor-rx-${divergencia.id}`}>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {[...colaboradores]
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading != null}
            onClick={() => void aprovar()}
          >
            {loading === "aprovar" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Aprovar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading != null}
            onClick={() => void recusar()}
          >
            {loading === "recusar" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CondutorRotaExataPanel({
  divergencias,
  veiculos,
  colaboradores,
  verificando,
  erroVerificacao,
  onRefresh,
  className,
}: {
  divergencias: CondutorRotaExataDivergencia[];
  veiculos: Veiculo[];
  colaboradores: Colaborador[];
  verificando?: boolean;
  erroVerificacao?: string;
  onRefresh: () => void;
  className?: string;
}) {
  const veiculoPorId = useMemo(() => {
    const map = new Map<string, Veiculo>();
    for (const v of veiculos) map.set(v.id, v);
    return map;
  }, [veiculos]);

  const colaboradorPorId = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradores) map.set(c.id, c);
    return map;
  }, [colaboradores]);

  if (divergencias.length === 0 && !verificando && !erroVerificacao) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 shadow-sm",
        className
      )}
      aria-label="Divergências de condutor com a Rota Exata"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold">
              Condutores divergentes (Rota Exata)
            </h2>
            <p className="text-xs text-muted-foreground">
              Troca de condutor detectada na Rota Exata. Aprove para atualizar o
              cadastro local ou recuse para manter o condutor atual.
            </p>
          </div>
        </div>
        {verificando ? (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Verificando…
          </Badge>
        ) : divergencias.length > 0 ? (
          <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500">
            {divergencias.length} pendente{divergencias.length === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>

      {erroVerificacao ? (
        <p className="mb-3 text-sm text-destructive">{erroVerificacao}</p>
      ) : null}

      <div className="space-y-3">
        {divergencias.map((d) => {
          const veiculo = veiculoPorId.get(d.veiculoId);
          return (
            <DivergenciaItem
              key={d.id}
              divergencia={d}
              veiculo={veiculo}
              colaboradorAtual={colaboradorPorId.get(d.motoristaAtualId)}
              colaboradorSugerido={
                d.motoristaSugeridoId
                  ? colaboradorPorId.get(d.motoristaSugeridoId)
                  : undefined
              }
              colaboradores={colaboradores}
              onResolved={onRefresh}
            />
          );
        })}
      </div>
    </section>
  );
}

export async function verificarCondutoresRotaExata(): Promise<VerificarCondutoresRotaExataResult> {
  return apiFetch<VerificarCondutoresRotaExataResult>(
    "/api/v1/veiculos/condutor-divergencias/verificar",
    { method: "POST" }
  );
}
