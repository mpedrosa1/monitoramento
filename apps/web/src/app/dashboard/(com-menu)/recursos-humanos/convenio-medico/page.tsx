"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDollarSign,
  HeartPulse,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Colaborador, FaixaConvenioMedico } from "@/lib/types";
import {
  faixaLabel,
  formatBRL,
  montarConvenioColaborador,
  parentescoLabel,
  type ConvenioColaborador,
} from "@/lib/convenio-medico";
import { usePermissions } from "@/hooks/use-permissions";
import { FaixaConvenioFormDialog } from "@/components/rh/faixa-convenio-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function MetricCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Idade + faixa exibida na célula, ou aviso quando a faixa não está cadastrada. */
function FaixaCell({
  idade,
  semFaixa,
  faixaTexto,
}: {
  idade: number | null;
  semFaixa: boolean;
  faixaTexto: string | null;
}) {
  if (semFaixa) {
    return (
      <Badge
        variant="destructive"
        className="gap-1"
        title={
          idade == null
            ? "Sem data de nascimento cadastrada."
            : "Nenhuma faixa de idade cadastrada para esta idade."
        }
      >
        <TriangleAlert className="h-3 w-3" />
        {idade == null ? "Sem data" : `${idade} anos · sem faixa`}
      </Badge>
    );
  }
  return (
    <span className="text-muted-foreground">
      {idade} anos · {faixaTexto}
    </span>
  );
}

function ColaboradorConvenioCard({ dados }: { dados: ConvenioColaborador }) {
  const { colaborador, pessoas, totalDependentes } = dados;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{colaborador.nome}</CardTitle>
        <Badge variant="secondary">
          {totalDependentes}{" "}
          {totalDependentes === 1 ? "dependente" : "dependentes"}
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Idade / faixa</TableHead>
              <TableHead className="text-right">Valor do plano</TableHead>
              <TableHead className="text-right">Desc. na folha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pessoas.map((p, i) => (
              <TableRow key={`${p.parentesco}-${i}-${p.nome}`}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.parentesco === "titular" ? "outline" : "ghost"}
                  >
                    {parentescoLabel(p.parentesco)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <FaixaCell
                    idade={p.idade}
                    semFaixa={p.semFaixa}
                    faixaTexto={p.faixa ? faixaLabel(p.faixa) : null}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.semFaixa ? "—" : formatBRL(p.valorPlano)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.parentesco === "titular" ? (
                    <span className="text-muted-foreground">
                      {formatBRL(0)}
                    </span>
                  ) : p.semFaixa ? (
                    "—"
                  ) : (
                    formatBRL(p.descontoFolha)
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total da família</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBRL(dados.valorPlanoFamilia)}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatBRL(dados.descontoFolhaFamilia)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ConvenioMedicoPage() {
  const router = useRouter();
  const { canRhConvenioMedico, isLoading: permissoesLoading } = usePermissions();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [faixas, setFaixas] = useState<FaixaConvenioMedico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [apenasComDependentes, setApenasComDependentes] = useState(true);
  const [aba, setAba] = useState<"colaboradores" | "tabela">("colaboradores");

  const [faixaDialogOpen, setFaixaDialogOpen] = useState(false);
  const [faixaEditando, setFaixaEditando] = useState<FaixaConvenioMedico | null>(
    null
  );

  useEffect(() => {
    if (!permissoesLoading && !canRhConvenioMedico) {
      router.replace("/dashboard/recursos-humanos");
    }
  }, [permissoesLoading, canRhConvenioMedico, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, fxs] = await Promise.all([
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
        apiFetch<FaixaConvenioMedico[] | null>(
          "/api/v1/convenio-medico/faixas"
        ),
      ]);
      setColaboradores(asArray(cols));
      setFaixas(asArray(fxs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canRhConvenioMedico) void load();
  }, [canRhConvenioMedico, load]);

  // Quadro do convênio por colaborador (titular + dependentes).
  const quadros = useMemo(
    () =>
      colaboradores
        .map((c) => montarConvenioColaborador(c, faixas))
        .sort((a, b) =>
          a.colaborador.nome.localeCompare(b.colaborador.nome, "pt-BR")
        ),
    [colaboradores, faixas]
  );

  const totais = useMemo(() => {
    const comDependentes = quadros.filter((q) => q.totalDependentes > 0);
    return {
      colaboradoresComPlano: comDependentes.length,
      dependentes: quadros.reduce((s, q) => s + q.totalDependentes, 0),
      valorPlanoTotal: quadros.reduce((s, q) => s + q.valorPlanoFamilia, 0),
      descontoFolhaMes: quadros.reduce((s, q) => s + q.descontoFolhaFamilia, 0),
      pendencias: quadros.reduce((s, q) => s + q.pendencias, 0),
    };
  }, [quadros]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return quadros.filter((q) => {
      if (apenasComDependentes && q.totalDependentes === 0) return false;
      if (termo) {
        const alvo = q.pessoas.map((p) => p.nome).join(" ").toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [quadros, busca, apenasComDependentes]);

  function abrirNovaFaixa() {
    setFaixaEditando(null);
    setFaixaDialogOpen(true);
  }

  function editarFaixa(f: FaixaConvenioMedico) {
    setFaixaEditando(f);
    setFaixaDialogOpen(true);
  }

  async function excluirFaixa(f: FaixaConvenioMedico) {
    if (
      !window.confirm(
        `Excluir a faixa ${faixaLabel(f)} (${formatBRL(f.valor)})?`
      )
    ) {
      return;
    }
    try {
      await apiFetch<void>(`/api/v1/convenio-medico/faixas/${f.id}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir faixa.");
    }
  }

  if (permissoesLoading || !canRhConvenioMedico) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="h-5 w-5 text-primary" />
          Convênio médico
        </h2>
        <p className="text-sm text-muted-foreground">
          Mensalidade do plano e valor descontado na folha por colaborador.
          O titular não paga — o dependente paga 25% da mensalidade.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              title="Valor total do plano / mês"
              value={formatBRL(totais.valorPlanoTotal)}
              icon={CircleDollarSign}
              hint="Mensalidade cheia (titulares + dependentes)"
            />
            <MetricCard
              title="Descontado em folha / mês"
              value={formatBRL(totais.descontoFolhaMes)}
              icon={Wallet}
              hint="Soma dos descontos dos dependentes"
            />
            <MetricCard
              title="Colaboradores com dependentes"
              value={totais.colaboradoresComPlano}
              icon={Users}
            />
            <MetricCard
              title="Dependentes no plano"
              value={totais.dependentes}
              icon={HeartPulse}
            />
            <MetricCard
              title="Pendências de faixa"
              value={totais.pendencias}
              icon={TriangleAlert}
              hint="Sem data ou idade sem faixa cadastrada"
            />
          </div>

          {/* Abas internas */}
          <div className="border-b border-border">
            <nav className="flex gap-1">
              {(
                [
                  { id: "colaboradores", label: "Colaboradores" },
                  { id: "tabela", label: "Tabela de valores" },
                ] as const
              ).map((t) => {
                const active = aba === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAba(t.id)}
                    className={cn(
                      "relative px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tabela de valores (faixas) */}
          {aba === "tabela" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Tabela de valores</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Faixas etárias do convênio. Cadastre as que faltarem (ex.:
                  24–28 e 59+).
                </p>
              </div>
              <Button size="sm" onClick={abrirNovaFaixa}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nova faixa
              </Button>
            </CardHeader>
            <CardContent>
              {faixas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma faixa cadastrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa de idade</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="text-right">Desc. folha (25%)</TableHead>
                      <TableHead className="w-20 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faixas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          {faixaLabel(f)} anos
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(f.valor)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRL(f.descontoFolha)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => editarFaixa(f)}
                              aria-label="Editar faixa"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void excluirFaixa(f)}
                              aria-label="Excluir faixa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          )}

          {aba === "colaboradores" && (
          <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar colaborador ou dependente…"
                className="h-9 pl-8"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={apenasComDependentes}
                onChange={(e) => setApenasComDependentes(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Mostrar apenas com dependentes
            </label>
          </div>

          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum colaborador encontrado.
            </p>
          ) : (
            <div className="space-y-4">
              {visiveis.map((q) => (
                <ColaboradorConvenioCard key={q.colaborador.id} dados={q} />
              ))}
            </div>
          )}
          </>
          )}
        </>
      )}

      <FaixaConvenioFormDialog
        open={faixaDialogOpen}
        onOpenChange={setFaixaDialogOpen}
        faixa={faixaEditando}
        onSuccess={load}
      />
    </div>
  );
}
