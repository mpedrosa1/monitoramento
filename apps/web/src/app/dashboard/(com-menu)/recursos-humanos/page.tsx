"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CakeSlice,
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  DollarSign,
  MapPin,
  TriangleAlert,
  Users,
} from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { LOCAL_TRABALHO_OPCOES } from "@/lib/colaborador-form";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import { salarioNumeroParaInput } from "@/lib/masks";
import { rhColaboradorDetailPath } from "@/lib/dashboard-paths";
import type {
  Colaborador,
  ColaboradorStatus,
  EscalaSobreavisoDefinida,
  Sobreaviso,
} from "@/lib/types";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import { useColaboradorRastreamento } from "@/components/dashboard/colaborador-rastreamento-context";
import { usePermissions } from "@/hooks/use-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Extrai {ano, mes, dia} de uma data ISO (yyyy-mm-dd). */
function parseData(value?: string): { ano: number; mes: number; dia: number } | null {
  if (!value?.trim()) return null;
  const [ano, mes, dia] = value.split("-").map((p) => Number.parseInt(p, 10));
  if (!ano || !mes || !dia) return null;
  return { ano, mes, dia };
}

function calcularIdade(nascimento?: string): number | null {
  const d = parseData(nascimento);
  if (!d) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.ano;
  const mesAtual = hoje.getMonth() + 1;
  if (mesAtual < d.mes || (mesAtual === d.mes && hoje.getDate() < d.dia)) {
    idade -= 1;
  }
  return idade;
}

function tempoDeCasa(admissao?: string): string {
  const d = parseData(admissao);
  if (!d) return "—";
  const hoje = new Date();
  let meses =
    (hoje.getFullYear() - d.ano) * 12 + (hoje.getMonth() + 1 - d.mes);
  if (hoje.getDate() < d.dia) meses -= 1;
  if (meses < 0) meses = 0;
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  if (anos === 0) return `${m} ${m === 1 ? "mês" : "meses"}`;
  if (m === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${m}m`;
}

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
        <p className="text-3xl font-bold">{value}</p>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecursosHumanosPage() {
  const router = useRouter();
  const {
    canViewFinanceiro,
    canRhCalendarioSobreaviso,
    canRhRegistrarDespesaOutros,
    canManageRecargas,
    canRhEscalaTrabalho,
    canCrudColaboradores,
  } = usePermissions();
  const { withStatusEfetivoList } = useColaboradorRastreamento();
  const [list, setList] = useState<Colaborador[]>([]);
  const [sobreavisos, setSobreavisos] = useState<Sobreaviso[]>([]);
  const [definicoes, setDefinicoes] = useState<EscalaSobreavisoDefinida[]>([]);
  const [loading, setLoading] = useState(true);

  const apenasRecargasDespesas =
    (canRhRegistrarDespesaOutros || canManageRecargas) &&
    !canRhCalendarioSobreaviso &&
    !canViewFinanceiro &&
    !canRhEscalaTrabalho &&
    !canCrudColaboradores;

  useEffect(() => {
    if (apenasRecargasDespesas) {
      router.replace("/dashboard/recursos-humanos/recargas-e-despesas");
    }
  }, [apenasRecargasDespesas, router]);

  const load = useCallback(async () => {
    if (apenasRecargasDespesas) return;
    setLoading(true);
    try {
      const cols = await apiFetch<Colaborador[] | null>("/api/v1/colaboradores");
      setList(asArray(cols));
      if (canRhCalendarioSobreaviso) {
        const [sob, defs] = await Promise.all([
          apiFetch<Sobreaviso[] | null>("/api/v1/sobreavisos"),
          apiFetch<EscalaSobreavisoDefinida[] | null>(
            "/api/v1/sobreavisos/definicoes"
          ),
        ]);
        setSobreavisos(asArray(sob));
        setDefinicoes(asArray(defs));
      } else {
        setSobreavisos([]);
        setDefinicoes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [apenasRecargasDespesas, canRhCalendarioSobreaviso]);

  useEffect(() => {
    void load();
  }, [load]);

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth() + 1;

  const listComStatus = useMemo(
    () => withStatusEfetivoList(list),
    [list, withStatusEfetivoList]
  );

  const porStatus = useMemo(() => {
    const acc = {} as Record<ColaboradorStatus, number>;
    for (const c of listComStatus) {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
    }
    return acc;
  }, [listComStatus]);

  const porLocal = useMemo(() => {
    return LOCAL_TRABALHO_OPCOES.map((o) => ({
      label: o.label,
      total: list.filter((c) => c.localTrabalho === o.value).length,
    })).filter((x) => x.total > 0);
  }, [list]);

  const aniversariantes = useMemo(() => {
    return list
      .map((c) => ({ c, d: parseData(c.dataNascimento) }))
      .filter((x) => x.d && x.d.mes === mesAtual)
      .sort((a, b) => (a.d!.dia - b.d!.dia))
      .map((x) => ({ colaborador: x.c, dia: x.d!.dia }));
  }, [list, mesAtual]);

  const admissoesRecentes = useMemo(() => {
    return list
      .filter((c) => c.dataAdmissao?.trim())
      .slice()
      .sort((a, b) =>
        (b.dataAdmissao ?? "").localeCompare(a.dataAdmissao ?? "")
      )
      .slice(0, 6);
  }, [list]);

  const folhaSalarial = useMemo(
    () => list.reduce((sum, c) => sum + (c.salario ?? 0), 0),
    [list]
  );

  const totalDependentes = useMemo(
    () => list.reduce((sum, c) => sum + (c.dependentes?.length ?? 0), 0),
    [list]
  );

  const competenciaAtual = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;

  const definicaoMesAtual = useMemo(
    () => definicoes.find((d) => d.competencia === competenciaAtual) ?? null,
    [definicoes, competenciaAtual]
  );

  const escaladosMesAtual = useMemo(() => {
    const inicioMes = `${competenciaAtual}-01`;
    const fimMes = `${competenciaAtual}-${String(
      new Date(anoAtual, mesAtual, 0).getDate()
    ).padStart(2, "0")}`;
    const ids = new Set<string>();
    for (const s of sobreavisos) {
      if (s.dataInicio <= fimMes && s.dataFim >= inicioMes) {
        ids.add(s.colaboradorId);
      }
    }
    return ids.size;
  }, [sobreavisos, competenciaAtual, anoAtual, mesAtual]);

  return (
    <>
      <div className="space-y-6 p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            {/* Indicadores principais */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total de colaboradores"
                value={list.length}
                icon={Users}
              />
              <MetricCard
                title="Aniversariantes do mês"
                value={aniversariantes.length}
                icon={CakeSlice}
                hint={MESES[mesAtual - 1]}
              />
              <MetricCard
                title="Dependentes cadastrados"
                value={totalDependentes}
                icon={BriefcaseBusiness}
              />
              {canViewFinanceiro && (
                <MetricCard
                  title="Folha salarial mensal"
                  value={`R$ ${salarioNumeroParaInput(folhaSalarial) || "0,00"}`}
                  icon={DollarSign}
                  hint="Soma dos salários cadastrados"
                />
              )}
            </div>

            {/* Status da escala de sobreaviso do mês */}
            {canRhCalendarioSobreaviso ? (
            <Link
              href="/dashboard/recursos-humanos/sobreaviso"
              className={[
                "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
                definicaoMesAtual
                  ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  definicaoMesAtual
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                ].join(" ")}
              >
                {definicaoMesAtual ? (
                  <CalendarCheck className="h-5 w-5" />
                ) : (
                  <TriangleAlert className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Escala de sobreaviso · {MESES[mesAtual - 1]} de {anoAtual}
                </p>
                <p className="text-xs text-muted-foreground">
                  {definicaoMesAtual
                    ? `Definida em ${new Date(
                        definicaoMesAtual.definidaEm
                      ).toLocaleDateString("pt-BR")}${
                        definicaoMesAtual.definidaPor
                          ? ` por ${definicaoMesAtual.definidaPor}`
                          : ""
                      } · ${definicaoMesAtual.totalNotificados} notificado(s).`
                    : escaladosMesAtual > 0
                      ? `Ainda não definida — ${escaladosMesAtual} colaborador(es) escalado(s) aguardando notificação.`
                      : "Ainda não definida — nenhum colaborador escalado neste mês."}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Aniversariantes do mês */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CakeSlice className="h-4 w-4 text-primary" />
                    Aniversariantes de {MESES[mesAtual - 1]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aniversariantes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum aniversariante neste mês.
                    </p>
                  ) : (
                    aniversariantes.map(({ colaborador: c, dia }) => {
                      const idade = calcularIdade(c.dataNascimento);
                      return (
                        <Link
                          key={c.id}
                          href={rhColaboradorDetailPath(c.id)}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={
                                c.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO
                              }
                              alt={c.nome}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs">
                              {iniciais(c.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {c.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.cargo?.trim() || "Colaborador"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {String(dia).padStart(2, "0")}/
                              {String(mesAtual).padStart(2, "0")}
                            </p>
                            {idade != null && (
                              <p className="text-xs text-muted-foreground">
                                fará {idade + 1} anos
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Admissões recentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Admissões recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {admissoesRecentes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma admissão registrada.
                    </p>
                  ) : (
                    admissoesRecentes.map((c) => {
                      const d = parseData(c.dataAdmissao);
                      return (
                        <Link
                          key={c.id}
                          href={rhColaboradorDetailPath(c.id)}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage
                              src={
                                c.fotoUrl?.trim() || COLABORADOR_AVATAR_PADRAO
                              }
                              alt={c.nome}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs">
                              {iniciais(c.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {c.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.cargo?.trim() || "Colaborador"}
                            </p>
                          </div>
                          <div className="text-right">
                            {d && (
                              <p className="text-sm font-semibold">
                                {String(d.dia).padStart(2, "0")}/
                                {String(d.mes).padStart(2, "0")}/{d.ano}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {tempoDeCasa(c.dataAdmissao)} de casa
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Distribuição por status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-primary" />
                    Quadro por situação
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {(Object.keys(porStatus) as ColaboradorStatus[]).length ===
                  0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sem dados de situação.
                    </p>
                  ) : (
                    (Object.keys(porStatus) as ColaboradorStatus[]).map(
                      (s) => (
                        <Badge
                          key={s}
                          variant={colaboradorStatusVariant[s]}
                          className="gap-1.5 px-2.5 py-1 text-xs"
                        >
                          {colaboradorStatusLabel[s]}
                          <span className="font-bold">{porStatus[s]}</span>
                        </Badge>
                      )
                    )
                  )}
                </CardContent>
              </Card>

              {/* Distribuição por local de trabalho */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-primary" />
                    Distribuição por local de trabalho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {porLocal.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sem dados de local de trabalho.
                    </p>
                  ) : (
                    porLocal.map((l) => {
                      const pct = list.length
                        ? Math.round((l.total / list.length) * 100)
                        : 0;
                      return (
                        <div key={l.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{l.label}</span>
                            <span className="text-muted-foreground">
                              {l.total} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Esta é uma versão inicial da área de Recursos Humanos. Vamos
              evoluí-la conforme suas necessidades (férias, documentos,
              avaliações, etc.).
            </p>
          </>
        )}
      </div>
    </>
  );
}
