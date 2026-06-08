"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPinned } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import { missaoStatusLabel, missaoStatusVariant } from "@/lib/labels";
import {
  missoesEmAndamentoDaUnidade,
  missoesPlanejadasDaUnidade,
  formatInicioMissao,
  statusEfetivoMissao,
} from "@/lib/missoes";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { MissaoDetailDialog } from "@/components/missoes/missao-detail-dialog";
import { PlanejarMissaoDialog } from "@/components/unidades/planejar-missao-dialog";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";

function colaboradorNomes(
  ids: string[] | undefined,
  colaboradores: Colaborador[]
): string {
  if (!ids?.length) return "—";
  return ids
    .map((id) => colaboradores.find((c) => c.id === id)?.nome ?? id)
    .join(", ");
}

function MissaoResumoCard({
  titulo,
  tipo,
  missao,
  colaboradores,
  chamado,
  onClick,
}: {
  titulo: string;
  tipo: "planejada" | "em_andamento";
  missao: Missao;
  colaboradores: Colaborador[];
  chamado?: Chamado | null;
  onClick: () => void;
}) {
  const isPlanejada = tipo === "planejada";
  const statusEfetivo = statusEfetivoMissao(missao, chamado);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/30 ${
        isPlanejada
          ? "border-sky-500/40 bg-sky-500/10"
          : "border-emerald-500/40 bg-emerald-500/10"
      }`}
    >
      <div className="flex items-start gap-2">
        {isPlanejada ? (
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        ) : (
          <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{titulo}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {missao.titulo}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Equipe: {colaboradorNomes(missao.colaboradorIds, colaboradores)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Início: {formatInicioMissao(missao, chamado)}
          </p>
        </div>
        <Badge
          variant={missaoStatusVariant[statusEfetivo]}
          className="shrink-0"
        >
          {missaoStatusLabel[statusEfetivo]}
        </Badge>
      </div>
    </button>
  );
}

export function UnidadeMissoesSection({ unidade }: { unidade: Unidade }) {
  const { user } = useAuth();
  const { canManageData } = usePermissions();
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Missao | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mis, cols, chs] = await Promise.all([
        apiFetch<Missao[] | null>("/api/v1/missoes"),
        apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
        apiFetch<Chamado[] | null>("/api/v1/chamados"),
      ]);
      setMissoes(asArray(mis));
      setColaboradores(asArray(cols));
      setChamados(asArray(chs));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planejadas = useMemo(
    () => missoesPlanejadasDaUnidade(missoes, unidade.id, chamados),
    [missoes, unidade.id, chamados]
  );
  const emAndamento = useMemo(
    () => missoesEmAndamentoDaUnidade(missoes, unidade.id, chamados),
    [missoes, unidade.id, chamados]
  );

  function openDetail(missao: Missao) {
    setSelected(missao);
    setDetailOpen(true);
  }

  const temResumo = planejadas.length > 0 || emAndamento.length > 0;

  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Missões</h3>
        {canManageData && (
          <PlanejarMissaoDialog unidade={unidade} onSuccess={load} />
        )}

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando missões…</p>
        ) : temResumo ? (
          <div className="space-y-2">
            {planejadas.map((m) => (
              <MissaoResumoCard
                key={m.id}
                titulo="Missão agendada"
                tipo="planejada"
                missao={m}
                colaboradores={colaboradores}
                chamado={
                  m.chamadoId
                    ? chamados.find((c) => c.id === m.chamadoId)
                    : null
                }
                onClick={() => openDetail(m)}
              />
            ))}
            {emAndamento.map((m) => (
              <MissaoResumoCard
                key={m.id}
                titulo="Missão em andamento"
                tipo="em_andamento"
                missao={m}
                colaboradores={colaboradores}
                chamado={
                  m.chamadoId
                    ? chamados.find((c) => c.id === m.chamadoId)
                    : null
                }
                onClick={() => openDetail(m)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma missão agendada ou em andamento nesta unidade.
          </p>
        )}
      </section>

      <MissaoDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        missao={selected}
        unidade={unidade}
        chamados={chamados}
        colaboradores={colaboradores}
        user={user}
        onSuccess={load}
      />
    </>
  );
}
