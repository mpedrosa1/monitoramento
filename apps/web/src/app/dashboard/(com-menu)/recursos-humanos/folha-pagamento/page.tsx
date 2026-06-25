"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type {
  Colaborador,
  FaixaConvenioMedico,
  Sobreaviso,
} from "@/lib/types";
import { formatBRL, montarConvenioColaborador } from "@/lib/convenio-medico";
import {
  TABELAS_ANO_REFERENCIA,
  fatorProporcional,
  formatarHorasSobreaviso,
  horasSobreavisoPorColaborador,
  montarFolhaColaborador,
  type FolhaColaborador,
} from "@/lib/folha-pagamento";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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

function LinhaValor({
  label,
  valor,
  negativo,
  forte,
}: {
  label: React.ReactNode;
  valor: number;
  negativo?: boolean;
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={forte ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={[
          "tabular-nums",
          forte ? "font-semibold" : "",
          negativo ? "text-destructive" : "",
        ].join(" ")}
      >
        {negativo && valor > 0 ? "− " : ""}
        {formatBRL(valor)}
      </span>
    </div>
  );
}

function FolhaCard({ folha }: { folha: FolhaColaborador }) {
  const { colaborador, proventos, descontos, liquido, horasSobreaviso } = folha;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">{colaborador.nome}</CardTitle>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Líquido</p>
          <p className="text-lg font-bold tabular-nums">{formatBRL(liquido)}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Proventos
            </p>
            <LinhaValor label="Salário (proporcional)" valor={proventos.salario} />
            <LinhaValor label="Periculosidade (30%)" valor={proventos.periculosidade} />
            <LinhaValor
              label={
                <>
                  Sobreaviso{" "}
                  {horasSobreaviso > 0 && (
                    <span className="text-xs">
                      ({formatarHorasSobreaviso(horasSobreaviso)})
                    </span>
                  )}
                </>
              }
              valor={proventos.sobreaviso}
            />
            <div className="border-t border-border/60 pt-1.5">
              <LinhaValor label="Total" valor={proventos.total} forte />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Descontos
            </p>
            <LinhaValor label="INSS" valor={descontos.inss} negativo />
            <LinhaValor label="IRRF" valor={descontos.irrf} negativo />
            <LinhaValor label="Convênio médico" valor={descontos.convenio} negativo />
            <div className="border-t border-border/60 pt-1.5">
              <LinhaValor label="Total" valor={descontos.total} negativo forte />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FolhaPagamentoPage() {
  const router = useRouter();
  const { canViewFinanceiro, isLoading: permissoesLoading } = usePermissions();

  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [sobreavisos, setSobreavisos] = useState<Sobreaviso[]>([]);
  const [faixas, setFaixas] = useState<FaixaConvenioMedico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const hoje = useMemo(() => new Date(), []);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  useEffect(() => {
    if (!permissoesLoading && !canViewFinanceiro) {
      router.replace("/dashboard/recursos-humanos");
    }
  }, [permissoesLoading, canViewFinanceiro, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, sob, fxs] = await Promise.all([
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
        apiFetch<Sobreaviso[] | null>("/api/v1/sobreavisos"),
        apiFetch<FaixaConvenioMedico[] | null>(
          "/api/v1/convenio-medico/faixas"
        ),
      ]);
      setColaboradores(asArray(cols));
      setSobreavisos(asArray(sob));
      setFaixas(asArray(fxs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewFinanceiro) void load();
  }, [canViewFinanceiro, load]);

  const fator = useMemo(
    () => fatorProporcional(ano, mes, hoje),
    [ano, mes, hoje]
  );

  const folhas = useMemo(() => {
    const horasMap = horasSobreavisoPorColaborador(
      sobreavisos,
      ano,
      mes,
      hoje
    );
    return colaboradores
      .map((c) => {
        const convenio = montarConvenioColaborador(c, faixas).descontoFolhaFamilia;
        return montarFolhaColaborador(
          c,
          fator,
          horasMap.get(c.id) ?? 0,
          convenio
        );
      })
      .sort((a, b) =>
        a.colaborador.nome.localeCompare(b.colaborador.nome, "pt-BR")
      );
  }, [colaboradores, sobreavisos, faixas, ano, mes, hoje, fator]);

  const totais = useMemo(
    () => ({
      proventos: folhas.reduce((s, f) => s + f.proventos.total, 0),
      descontos: folhas.reduce((s, f) => s + f.descontos.total, 0),
      liquido: folhas.reduce((s, f) => s + f.liquido, 0),
    }),
    [folhas]
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return folhas;
    return folhas.filter((f) =>
      f.colaborador.nome.toLowerCase().includes(termo)
    );
  }, [folhas, busca]);

  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSeguinte() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  const pctDecorrido = Math.round(fator * 100);

  if (permissoesLoading || !canViewFinanceiro) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            Folha de pagamento
          </h2>
          <p className="text-sm text-muted-foreground">
            Ganhos e descontos estimados até a data atual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={mesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-36 text-center text-sm font-semibold">
            {MESES[mes - 1]} de {ano}
          </p>
          <Button variant="outline" size="sm" onClick={mesSeguinte}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de proventos"
              value={formatBRL(totais.proventos)}
              icon={TrendingUp}
            />
            <MetricCard
              title="Total de descontos"
              value={formatBRL(totais.descontos)}
              icon={TrendingDown}
            />
            <MetricCard
              title="Total líquido"
              value={formatBRL(totais.liquido)}
              icon={Wallet}
            />
            <MetricCard
              title="Colaboradores"
              value={folhas.length}
              icon={Users}
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Prévia proporcional aos dias decorridos no mês ({pctDecorrido}%).
            Periculosidade de 30% e sobreaviso a 1/3 da hora. INSS e IRRF pelas
            tabelas de referência de {TABELAS_ANO_REFERENCIA}.
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar colaborador…"
              className="h-9 pl-8"
            />
          </div>

          {visiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum colaborador encontrado.
            </p>
          ) : (
            <div className="space-y-4">
              {visiveis.map((f) => (
                <FolhaCard key={f.colaborador.id} folha={f} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
