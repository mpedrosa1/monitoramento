"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatCoord } from "@/lib/geocode";
import { isAtribuidoMissaoLista } from "@/lib/missao-form";
import {
  concluirMissaoBody,
  emptyMissaoConclusaoForm,
  formatConclusaoMissao,
  validateMissaoConclusaoForm,
  type MissaoConclusaoFormState,
} from "@/lib/missao-conclusao-form";
import { missaoStatusLabel, missaoStatusVariant } from "@/lib/labels";
import { formatInicioMissao, labelChamadoVinculadoMissao, statusEfetivoMissao } from "@/lib/missoes";
import { canConcluirMissao } from "@/lib/permissions";
import { formatUnidadeEndereco } from "@/lib/unidade-form";
import type { AuthUser } from "@/lib/auth-session";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { coordsFromUnidade } from "@/components/unidades/unidade-detail-panel";
import { MissaoMap } from "@/components/missoes/missao-map";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";

function DetalheCampo({
  label,
  value,
  className,
  multiline,
}: {
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {multiline ? (
        <p className="mt-0.5 whitespace-pre-line text-sm text-foreground">
          {value || "—"}
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-foreground">{value || "—"}</p>
      )}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MissaoDetailDialog({
  open,
  onOpenChange,
  missao,
  unidade,
  chamados,
  colaboradores,
  user,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missao: Missao | null;
  unidade: Unidade | null;
  chamados: Chamado[];
  colaboradores: Colaborador[];
  user: AuthUser | null;
  onSuccess?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [conclusaoForm, setConclusaoForm] = useState<MissaoConclusaoFormState>(
    () => emptyMissaoConclusaoForm()
  );

  useEffect(() => {
    if (open && missao) {
      setConclusaoForm(emptyMissaoConclusaoForm());
    }
  }, [open, missao?.id, missao?.status]);

  const position = useMemo(() => {
    if (!unidade) return null;
    const c = coordsFromUnidade(unidade);
    return c ? { lat: c.lat, lng: c.lng } : null;
  }, [unidade]);

  const colaboradoresTexto = useMemo(() => {
    if (!missao?.colaboradorIds?.length) return "—";
    return missao.colaboradorIds
      .map((id) => colaboradores.find((c) => c.id === id)?.nome ?? id)
      .join("\n");
  }, [missao, colaboradores]);

  const chamadoTexto = useMemo(() => {
    if (!missao) return "Preventiva";
    return labelChamadoVinculadoMissao(missao.chamadoId, chamados);
  }, [missao, chamados]);

  const chamadoVinculado = useMemo(() => {
    if (!missao?.chamadoId) return null;
    return chamados.find((ch) => ch.id === missao.chamadoId) ?? null;
  }, [missao, chamados]);

  const inicioTexto = useMemo(() => {
    if (!missao) return "—";
    return formatInicioMissao(missao, chamadoVinculado);
  }, [missao, chamadoVinculado]);

  const statusEfetivo = useMemo(() => {
    if (!missao) return null;
    return statusEfetivoMissao(missao, chamadoVinculado);
  }, [missao, chamadoVinculado]);

  const podeConcluir = canConcluirMissao(
    user?.tipoAcesso,
    user?.id,
    missao,
    chamadoVinculado
  );

  function patchConclusao(p: Partial<MissaoConclusaoFormState>) {
    setConclusaoForm((f) => ({ ...f, ...p }));
  }

  async function concluirMissao() {
    if (!missao) return;
    const erro = validateMissaoConclusaoForm(conclusaoForm, user?.nome);
    if (erro) {
      window.alert(erro);
      return;
    }
    setLoading(true);
    try {
      await apiFetch<Missao>(`/api/v1/missoes/${missao.id}/concluir`, {
        method: "PUT",
        body: JSON.stringify(concluirMissaoBody(conclusaoForm)),
      });
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao concluir missão."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!missao) return null;

  const mapLabel = unidade
    ? `${unidade.codigo} — ${unidade.nome}`
    : "Unidade";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{missao.titulo}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={missaoStatusVariant[statusEfetivo ?? missao.status]}>
              {missaoStatusLabel[statusEfetivo ?? missao.status] ??
                missao.status}
            </Badge>
            {isAtribuidoMissaoLista(user?.id, missao) && (
              <Badge className="border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/80 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950">
                Atribuído a você
              </Badge>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetalheCampo
              label="Unidade"
              value={
                unidade ? `${unidade.codigo} — ${unidade.nome}` : "—"
              }
            />
            <DetalheCampo label="Chamado vinculado" value={chamadoTexto} />
            <DetalheCampo label="Início da missão" value={inicioTexto} />
            <DetalheCampo
              label="Colaboradores"
              value={colaboradoresTexto}
              className="sm:col-span-2"
              multiline
            />
            <DetalheCampo
              label="Endereço"
              value={unidade ? formatUnidadeEndereco(unidade.endereco) : "—"}
              className="sm:col-span-2"
            />
            {position && (
              <DetalheCampo
                label="Coordenadas"
                value={`${formatCoord(position.lat)}, ${formatCoord(position.lng)}`}
              />
            )}
            <DetalheCampo
              label="Criada em"
              value={formatDate(missao.createdAt)}
            />
            <DetalheCampo
              label="Atualizada em"
              value={formatDate(missao.updatedAt)}
            />
          </div>

          {missao.status === "concluida" && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Conclusão</h3>
                <DetalheCampo
                  label="Resumo"
                  value={formatConclusaoMissao(missao)}
                  className="sm:col-span-2"
                  multiline
                />
              </section>
            </>
          )}

          {missao.status === "planejada" && statusEfetivo === "planejada" && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                Esta missão ainda não foi iniciada. A conclusão só fica
                disponível após o início da missão.
              </div>
            </>
          )}

          {podeConcluir && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Concluir missão</h3>
                <p className="text-xs text-muted-foreground">
                  Registre a conclusão da missão. O responsável é identificado
                  automaticamente pelo seu login.
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="missao-concluida-por">Concluída por</Label>
                  <Input
                    id="missao-concluida-por"
                    readOnly
                    value={user?.nome ?? ""}
                    className="bg-muted"
                    placeholder="Identificado pelo login"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="missao-conclusao-data">Data</Label>
                    <Input
                      id="missao-conclusao-data"
                      type="date"
                      value={conclusaoForm.dataIso}
                      onChange={(e) =>
                        patchConclusao({ dataIso: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="missao-conclusao-hora">Hora</Label>
                    <Input
                      id="missao-conclusao-hora"
                      type="time"
                      value={conclusaoForm.hora}
                      onChange={(e) => patchConclusao({ hora: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="missao-relatorio">Relatório de conclusão</Label>
                  <textarea
                    id="missao-relatorio"
                    rows={4}
                    value={conclusaoForm.relatorio}
                    onChange={(e) =>
                      patchConclusao({ relatorio: e.target.value })
                    }
                    placeholder="Descreva o que foi realizado na unidade"
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
              </section>
            </>
          )}

          <Separator />

          <section className="space-y-2">
            <p className="text-sm font-semibold">Localização e rota</p>
            {!position ? (
              <p className="text-xs text-muted-foreground">
                Coordenadas não cadastradas para esta unidade. O mapa exibe a
                região central de referência.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Autorize o navegador a usar sua localização para traçar a rota
                até a unidade.
              </p>
            )}
            <MissaoMap destination={position} label={mapLabel} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {podeConcluir && (
            <Button onClick={concluirMissao} disabled={loading || !user?.nome}>
              {loading ? "Concluindo…" : "Concluir missão"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
