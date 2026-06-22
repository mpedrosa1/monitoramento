"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  Cpu,
  Headphones,
  MapPinned,
  Users,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { ChamadosTable } from "@/components/dashboard/chamados-table";
import { ColaboradorListItem } from "@/components/dashboard/colaborador-list-item";
import { RH_COLABORADORES_PATH } from "@/lib/dashboard-paths";
import { listNotificacoes } from "@/lib/notificacoes";
import {
  chamadoStatusLabel,
  chamadoStatusVariant,
  colaboradorStatusLabel,
  colaboradorStatusVariant,
  missaoStatusLabel,
  missaoStatusVariant,
} from "@/lib/labels";
import { formatInicioMissao } from "@/lib/missoes";
import type {
  Chamado,
  ChamadoStatus,
  Colaborador,
  ColaboradorStatus,
  DashboardSummary,
  Equipamento,
  Missao,
  Unidade,
  Veiculo,
} from "@/lib/types";
import { useColaboradorRastreamento } from "@/components/dashboard/colaborador-rastreamento-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useMonitoring } from "@/components/dashboard/monitoring-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatarDataHoje(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
  href,
}: {
  title: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "default" | "warning" | "success";
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        href && "cursor-pointer"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "rounded-md p-1.5",
            accent === "warning" && "bg-destructive/10 text-destructive",
            accent === "success" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            (!accent || accent === "default") && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );
  }
  return content;
}

function StatusBar({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant?: "default" | "destructive" | "secondary" | "outline";
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <Badge variant={variant ?? "secondary"} className="tabular-nums">
          {count}
        </Badge>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardOperacionalHome() {
  const { user } = useAuth();
  const { canAccessEquipamentos } = usePermissions();
  const { metrics } = useMonitoring();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const fetches: Promise<void>[] = [
        apiFetch<DashboardSummary>("/api/v1/dashboard/summary").then((data) => {
          setSummary(data);
        }),
        apiFetch<Missao[] | null>("/api/v1/missoes").then((data) => {
          setMissoes(asArray(data));
        }),
        apiFetch<Chamado[] | null>("/api/v1/chamados").then((data) => {
          setChamados(asArray(data));
        }),
        apiFetch<Unidade[] | null>("/api/v1/unidades").then((data) => {
          setUnidades(asArray(data));
        }),
        apiFetch<Veiculo[] | null>("/api/v1/veiculos").then((data) => {
          setVeiculos(asArray(data));
        }),
        listNotificacoes().then((list) => {
          setNotificacoesNaoLidas(list.filter((n) => !n.lida).length);
        }),
      ];

      if (canAccessEquipamentos) {
        fetches.push(
          apiFetch<Equipamento[] | null>("/api/v1/equipamentos").then((data) => {
            setEquipamentos(asArray(data));
          })
        );
      }

      await Promise.all(fetches);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [canAccessEquipamentos]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, [load]);

  const unidadePorId = useMemo(
    () => new Map(unidades.map((u) => [u.id, u.nome])),
    [unidades]
  );

  const chamadosPorStatus = useMemo(() => {
    const counts: Record<ChamadoStatus, number> = {
      aberto: 0,
      em_andamento: 0,
      encerrado: 0,
    };
    for (const c of chamados) {
      counts[c.status] += 1;
    }
    return counts;
  }, [chamados]);

  const missoesPorStatus = useMemo(() => {
    let planejada = 0;
    let emAndamento = 0;
    for (const m of missoes) {
      if (m.status === "planejada") planejada += 1;
      if (m.status === "em_andamento") emAndamento += 1;
    }
    return { planejada, emAndamento };
  }, [missoes]);

  const { withStatusEfetivoList } = useColaboradorRastreamento();

  const colaboradores = useMemo(
    () => withStatusEfetivoList(asArray(summary?.colaboradores)),
    [summary?.colaboradores, withStatusEfetivoList]
  );

  const colaboradoresPorStatus = useMemo(() => {
    const counts = new Map<ColaboradorStatus, number>();
    for (const c of colaboradores) {
      counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [colaboradores]);

  const colaboradoresDestaque = useMemo(() => {
    const prioridade: ColaboradorStatus[] = [
      "em_missao",
      "em_deslocamento",
      "atrasado",
      "escritorio",
      "almoco",
      "ferias",
      "atestado",
    ];
    return [...colaboradores].sort((a, b) => {
      const pa = prioridade.indexOf(a.status);
      const pb = prioridade.indexOf(b.status);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });
  }, [colaboradores]);

  const missoesRecentes = useMemo(() => {
    const ativas = missoes.filter(
      (m) => m.status === "em_andamento" || m.status === "planejada"
    );
    return [...ativas]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }, [missoes]);

  const equipamentosOnline = useMemo(() => {
    if (metrics.length > 0) {
      return metrics.filter((m) => m.online).length;
    }
    return 0;
  }, [metrics]);

  const equipamentosMonitorados = useMemo(
    () => (metrics.length > 0 ? metrics.length : equipamentos.length),
    [metrics.length, equipamentos.length]
  );

  const veiculosComAlerta = useMemo(
    () => veiculos.filter((v) => v.alertaTrocaNaoAutorizada).length,
    [veiculos]
  );

  const primeiroNome = user?.nome?.trim().split(/\s+/)[0] ?? "usuário";

  return (
    <div className="space-y-6 p-6">
      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error} — verifique se a API está em execução.
        </p>
      ) : null}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {formatarDataHoje()}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            {saudacao()}, {primeiroNome}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral das operações, chamados e equipe em campo.
          </p>
        </div>
        {notificacoesNaoLidas > 0 ? (
          <Badge variant="destructive" className="w-fit shrink-0">
            {notificacoesNaoLidas} notificação
            {notificacoesNaoLidas === 1 ? "" : "ões"} não lida
            {notificacoesNaoLidas === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Chamados abertos"
          value={chamadosPorStatus.aberto}
          hint={
            chamadosPorStatus.em_andamento > 0
              ? `${chamadosPorStatus.em_andamento} em atendimento`
              : "Aguardando triagem"
          }
          icon={Headphones}
          accent={chamadosPorStatus.aberto > 0 ? "warning" : "default"}
          href="/dashboard/chamados"
        />
        <MetricCard
          title="Missões ativas"
          value={summary?.missoesEmAndamento ?? missoesPorStatus.emAndamento}
          hint={
            missoesPorStatus.planejada > 0
              ? `${missoesPorStatus.planejada} planejada(s)`
              : "Em execução no momento"
          }
          icon={MapPinned}
          href="/dashboard/missoes"
        />
        <MetricCard
          title="Colaboradores"
          value={colaboradores.length}
          hint={`${colaboradoresPorStatus.find(([s]) => s === "em_missao")?.[1] ?? 0} em missão`}
          icon={Users}
          href={RH_COLABORADORES_PATH}
        />
        <MetricCard
          title="Unidades"
          value={unidades.length}
          hint="Unidades prisionais cadastradas"
          icon={Building2}
          href="/dashboard/unidades"
        />
        <MetricCard
          title="Veículos"
          value={veiculos.length}
          hint={
            veiculosComAlerta > 0
              ? `${veiculosComAlerta} com alerta de troca`
              : "Frota locada"
          }
          icon={Car}
          accent={veiculosComAlerta > 0 ? "warning" : "default"}
          href="/dashboard/veiculos"
        />
        {canAccessEquipamentos ? (
          <MetricCard
            title="Equipamentos"
            value={
              metrics.length > 0
                ? `${equipamentosOnline}/${equipamentosMonitorados}`
                : equipamentos.length
            }
            hint={
              metrics.length > 0
                ? "Online no monitoramento em tempo real"
                : `${equipamentos.length} cadastrado(s) — aguardando métricas`
            }
            icon={Cpu}
            accent={
              metrics.length > 0 &&
              equipamentosMonitorados > 0 &&
              equipamentosOnline === equipamentosMonitorados
                ? "success"
                : "default"
            }
            href="/dashboard/equipamentos"
          />
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start">
        <div className="space-y-6 min-w-0">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Chamados por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StatusBar
                  label={chamadoStatusLabel.aberto}
                  count={chamadosPorStatus.aberto}
                  total={chamados.length}
                  variant={chamadoStatusVariant.aberto}
                />
                <StatusBar
                  label={chamadoStatusLabel.em_andamento}
                  count={chamadosPorStatus.em_andamento}
                  total={chamados.length}
                  variant={chamadoStatusVariant.em_andamento}
                />
                <StatusBar
                  label={chamadoStatusLabel.encerrado}
                  count={chamadosPorStatus.encerrado}
                  total={chamados.length}
                  variant={chamadoStatusVariant.encerrado}
                />
                <p className="text-xs text-muted-foreground">
                  Total: {chamados.length} chamado
                  {chamados.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Equipe por situação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {colaboradoresPorStatus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum colaborador cadastrado.
                  </p>
                ) : (
                  colaboradoresPorStatus.map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {colaboradorStatusLabel[status]}
                      </span>
                      <Badge variant={colaboradorStatusVariant[status]}>
                        {count}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Missões em andamento ou planejadas</CardTitle>
              <Link
                href="/dashboard/missoes"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </CardHeader>
            <CardContent>
              {missoesRecentes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma missão ativa no momento.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Missão</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Início</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missoesRecentes.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {m.titulo}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">
                          {unidadePorId.get(m.unidadeId) ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={missaoStatusVariant[m.status]}>
                            {missaoStatusLabel[m.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatInicioMissao(m)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Últimos chamados</CardTitle>
              <Link
                href="/dashboard/chamados"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent>
              <ChamadosTable
                chamados={asArray(summary?.ultimosChamados)}
                unidadeLabel={(id) => unidadePorId.get(id) ?? "—"}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="xl:sticky xl:top-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">Equipe</CardTitle>
              <Link
                href={RH_COLABORADORES_PATH}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent className="max-h-[min(70vh,640px)] space-y-2 overflow-y-auto pr-1">
              {colaboradoresDestaque.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador cadastrado.
                </p>
              ) : (
                colaboradoresDestaque.slice(0, 12).map((c) => (
                  <ColaboradorListItem key={c.id} colaborador={c} />
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
