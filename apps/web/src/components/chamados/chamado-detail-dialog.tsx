"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import {
  buildEmailAutorizacaoAssunto,
  buildEmailAutorizacaoCorpo,
  buildEmailEncerramentoAssunto,
  buildEmailEncerramentoCorpo,
  formatListPT,
  formatNumeroExibicao,
  isoParaDataBR,
  isoParaDataExtenso,
  SINAIS_OPCOES,
} from "@/lib/chamado-email";
import {
  chamadoComEncerramento,
  emptyEncerramentoForm,
  encerramentoInputFromForm,
  formatSinaisPosTeste,
  validateEncerramentoForm,
  type EncerramentoFormState,
} from "@/lib/chamado-encerramento-form";
import { unidadeNomePorId } from "@/lib/chamado-form";
import {
  autorizacaoInputFromForm,
  chamadoComMissao,
  emptyMissaoForm,
  formatColaboradoresMissao,
  tituloMissao,
  missaoInicioFromForm,
  validateMissaoForm,
  type MissaoFormState,
} from "@/lib/chamado-missao-form";
import { chamadoStatusLabel, chamadoStatusVariant } from "@/lib/labels";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { MultiCheckboxGroup } from "@/components/chamados/chamado-form-fields";
import { ColaboradoresMissaoPicker } from "@/components/chamados/colaboradores-missao-picker";
import { EmailAutorizacaoPreview } from "@/components/chamados/email-autorizacao-preview";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { canEncerrarChamado } from "@/lib/permissions";
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
import { TimeInput } from "@/components/ui/time-input";
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

function resolverListaComOutros(
  items: string[] | undefined,
  outros?: string
): string {
  if (!items?.length) return "—";
  return formatListPT(
    items.map((s) => (s === "Outros" && outros ? outros : s))
  );
}

export function ChamadoDetailDialog({
  open,
  onOpenChange,
  chamado,
  unidades,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamado: Chamado | null;
  unidades: Unidade[];
  onSuccess?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [encForm, setEncForm] = useState<EncerramentoFormState>(() =>
    emptyEncerramentoForm()
  );
  const [missaoForm, setMissaoForm] = useState<MissaoFormState>(() =>
    emptyMissaoForm()
  );
  const { user } = useAuth();
  const { canManageData } = usePermissions();

  const unidadeNome = chamado
    ? unidadeNomePorId(unidades, chamado.unidadeId)
    : "";

  const podeAtribuirMissao =
    chamado?.status === "aberto" && canManageData;
  const aguardandoMissao =
    chamado?.status === "aberto" && !canManageData;
  const podeEncerrar = canEncerrarChamado(
    user?.tipoAcesso,
    user?.id,
    chamado
  );
  const missaoEmAndamentoSemPermissaoEncerrar =
    chamado?.status === "em_andamento" && !podeEncerrar;
  const missaoAtribuida =
    chamado?.status === "em_andamento" || chamado?.status === "encerrado";

  useEffect(() => {
    if (!open) return;
    apiFetch<Colaborador[] | null>("/api/v1/colaboradores")
      .then((data) => setColaboradores(asArray(data)))
      .catch(() => setColaboradores([]));
  }, [open]);

  useEffect(() => {
    if (open && chamado?.status === "em_andamento") {
      setEncForm(emptyEncerramentoForm());
    }
    if (open && chamado?.status === "aberto") {
      setMissaoForm(emptyMissaoForm());
    }
  }, [open, chamado?.id, chamado?.status]);

  function patchEnc(p: Partial<EncerramentoFormState>) {
    setEncForm((f) => ({ ...f, ...p }));
  }

  function patchMissao(p: Partial<MissaoFormState>) {
    setMissaoForm((f) => ({ ...f, ...p }));
  }

  const emailEncerramento = useMemo(() => {
    if (!chamado || !podeEncerrar) return null;
    const input = encerramentoInputFromForm(encForm, chamado, unidadeNome);
    return {
      assunto: buildEmailEncerramentoAssunto(input),
      corpo: buildEmailEncerramentoCorpo(input),
    };
  }, [chamado, encForm, unidadeNome, podeEncerrar]);

  const emailAutorizacao = useMemo(() => {
    if (!chamado || !podeAtribuirMissao) return null;
    const input = autorizacaoInputFromForm(
      missaoForm,
      unidadeNome,
      colaboradores
    );
    if (input.colaboradores.length === 0) return null;
    return {
      assunto: buildEmailAutorizacaoAssunto(unidadeNome),
      corpo: buildEmailAutorizacaoCorpo(input),
    };
  }, [chamado, missaoForm, unidadeNome, colaboradores, podeAtribuirMissao]);

  async function atribuirMissao() {
    if (!chamado) return;
    const erro = validateMissaoForm(missaoForm, colaboradores);
    if (erro) {
      window.alert(erro);
      return;
    }
    setLoading(true);
    try {
      const missao = await apiFetch<Missao>("/api/v1/missoes", {
        method: "POST",
        body: JSON.stringify({
          titulo: tituloMissao(chamado, unidadeNome),
          status: "em_andamento",
          unidadeId: chamado.unidadeId,
          chamadoId: chamado.id,
          colaboradorIds: missaoForm.colaboradorIds,
          ...missaoInicioFromForm(missaoForm),
        }),
      });

      const selecionados = colaboradores.filter((c) =>
        missaoForm.colaboradorIds.includes(c.id)
      );
      await Promise.all(
        selecionados.map((c) =>
          apiFetch<Colaborador>(`/api/v1/colaboradores/${c.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...c, status: "em_missao" }),
          })
        )
      );

      await apiFetch<Chamado>(`/api/v1/chamados/${chamado.id}`, {
        method: "PUT",
        body: JSON.stringify(
          chamadoComMissao(
            chamado,
            missaoForm,
            unidadeNome,
            colaboradores,
            missao.id
          )
        ),
      });

      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao atribuir missão."
      );
    } finally {
      setLoading(false);
    }
  }

  async function encerrar() {
    if (!chamado) return;
    const erro = validateEncerramentoForm(encForm);
    if (erro) {
      window.alert(erro);
      return;
    }
    setLoading(true);
    try {
      await apiFetch<Chamado>(`/api/v1/chamados/${chamado.id}`, {
        method: "PUT",
        body: JSON.stringify(
          chamadoComEncerramento(chamado, encForm, unidadeNome)
        ),
      });
      onOpenChange(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao encerrar chamado."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!chamado) return null;

  const tituloNumero = chamado.numero
    ? formatNumeroExibicao(chamado.numero)
    : chamado.titulo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle>Chamado {tituloNumero}</DialogTitle>
            <Badge variant={chamadoStatusVariant[chamado.status]}>
              {chamadoStatusLabel[chamado.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Abertura</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetalheCampo label="Unidade" value={unidadeNome} />
              <DetalheCampo
                label="Aberto por"
                value={chamado.abertoPor ?? ""}
              />
              <DetalheCampo
                label="Data"
                value={chamado.data ? isoParaDataBR(chamado.data) : ""}
              />
              <DetalheCampo label="Hora" value={chamado.hora ?? ""} />
              <DetalheCampo
                label="Hora do teste"
                value={chamado.horaTeste ?? ""}
              />
              <DetalheCampo
                label="Locais afetados"
                value={chamado.locaisAfetados ?? ""}
                className="sm:col-span-2"
              />
              <DetalheCampo
                label="Sinais detectados"
                value={resolverListaComOutros(
                  chamado.sinaisDetectados,
                  chamado.sinaisOutros
                )}
              />
              <DetalheCampo
                label="Comunicação"
                value={resolverListaComOutros(
                  chamado.comunicacao,
                  chamado.comunicacaoOutros
                )}
              />
            </div>
          </section>

          {missaoAtribuida && chamado.colaboradorIds?.length ? (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Missão</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetalheCampo
                    label="Colaboradores"
                    value={formatColaboradoresMissao(
                      chamado.colaboradorIds,
                      colaboradores
                    )}
                    className="sm:col-span-2"
                    multiline
                  />
                  <DetalheCampo
                    label="Previsão de chegada"
                    value={
                      chamado.previsaoChegadaData
                        ? `${isoParaDataExtenso(chamado.previsaoChegadaData)}${chamado.previsaoChegadaHora ? `, ${chamado.previsaoChegadaHora}` : ""}`
                        : ""
                    }
                    className="sm:col-span-2"
                  />
                </div>
                {(chamado.emailAutorizacaoCorpo ||
                  chamado.emailAutorizacaoAssunto) && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      E-mail de autorização de entrada
                    </p>
                    {chamado.emailAutorizacaoAssunto && (
                      <Input
                        readOnly
                        value={chamado.emailAutorizacaoAssunto}
                        className="bg-background font-mono text-xs"
                      />
                    )}
                    {chamado.emailAutorizacaoCorpo && (
                      <textarea
                        readOnly
                        rows={10}
                        value={chamado.emailAutorizacaoCorpo}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none"
                      />
                    )}
                  </div>
                )}
              </section>
            </>
          ) : null}

          {chamado.status === "encerrado" && (
            <>
              <Separator />
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Encerramento</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetalheCampo
                    label="Encerrado por"
                    value={chamado.encerradoPor ?? ""}
                  />
                  <DetalheCampo
                    label="Data / hora"
                    value={
                      chamado.dataEncerramento
                        ? `${isoParaDataBR(chamado.dataEncerramento)}${chamado.horaEncerramento ? `, ${chamado.horaEncerramento}` : ""}`
                        : ""
                    }
                  />
                  <DetalheCampo
                    label="Hora do teste pós-intervenção"
                    value={chamado.horaTestePos ?? ""}
                  />
                  <DetalheCampo
                    label="Sinais no teste pós-intervenção"
                    value={formatSinaisPosTeste(chamado)}
                  />
                  <DetalheCampo
                    label="Diagnóstico"
                    value={chamado.diagnostico ?? ""}
                    className="sm:col-span-2"
                  />
                  <DetalheCampo
                    label="Ações realizadas"
                    value={chamado.acoesRealizadas ?? ""}
                    className="sm:col-span-2"
                  />
                  {chamado.observacoesEncerramento && (
                    <DetalheCampo
                      label="Observações"
                      value={chamado.observacoesEncerramento}
                      className="sm:col-span-2"
                    />
                  )}
                </div>

                {(chamado.emailEncerramentoCorpo ||
                  chamado.emailEncerramentoAssunto) && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/15 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      E-mail de encerramento
                    </p>
                    {chamado.emailEncerramentoAssunto && (
                      <Input
                        readOnly
                        value={chamado.emailEncerramentoAssunto}
                        className="bg-background font-mono text-xs"
                      />
                    )}
                    {chamado.emailEncerramentoCorpo && (
                      <textarea
                        readOnly
                        rows={8}
                        value={chamado.emailEncerramentoCorpo}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none"
                      />
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {aguardandoMissao && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                Este chamado aguarda atribuição de missão por um administrador
                ou desenvolvedor.
              </div>
            </>
          )}

          {podeAtribuirMissao && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Atribuir missão</h3>

                <ColaboradoresMissaoPicker
                  colaboradores={colaboradores}
                  selected={missaoForm.colaboradorIds}
                  onChange={(colaboradorIds) =>
                    patchMissao({ colaboradorIds })
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="missao-data">Previsão de chegada — data</Label>
                    <Input
                      id="missao-data"
                      type="date"
                      value={missaoForm.dataIso}
                      onChange={(e) =>
                        patchMissao({ dataIso: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="missao-hora">Previsão de chegada — hora</Label>
                    <TimeInput
                      id="missao-hora"
                      value={missaoForm.hora}
                      onChange={(hora) => patchMissao({ hora })}
                    />
                  </div>
                </div>

                {emailAutorizacao && (
                  <EmailAutorizacaoPreview
                    assunto={emailAutorizacao.assunto}
                    corpo={emailAutorizacao.corpo}
                  />
                )}
              </section>
            </>
          )}

          {missaoEmAndamentoSemPermissaoEncerrar && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                Este chamado está em andamento. Somente colaboradores atribuídos
                à missão ou administradores podem encerrá-lo.
              </div>
            </>
          )}

          {podeEncerrar && (
            <>
              <Separator />
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Encerrar chamado</h3>

                <div className="grid gap-2">
                  <Label htmlFor="enc-por">Encerrado por</Label>
                  <Input
                    id="enc-por"
                    value={encForm.encerradoPor}
                    onChange={(e) =>
                      patchEnc({ encerradoPor: e.target.value })
                    }
                    placeholder="Nome do técnico / responsável"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="enc-data">Data</Label>
                    <Input
                      id="enc-data"
                      type="date"
                      value={encForm.dataIso}
                      onChange={(e) =>
                        patchEnc({ dataIso: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="enc-hora">Hora</Label>
                    <TimeInput
                      id="enc-hora"
                      value={encForm.hora}
                      onChange={(hora) => patchEnc({ hora })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="enc-hora-teste">Hora do teste pós-intervenção</Label>
                    <TimeInput
                      id="enc-hora-teste"
                      value={encForm.horaTestePos}
                      onChange={(horaTestePos) =>
                        patchEnc({ horaTestePos })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="enc-diagnostico">Diagnóstico / causa identificada</Label>
                  <textarea
                    id="enc-diagnostico"
                    rows={3}
                    value={encForm.diagnostico}
                    onChange={(e) =>
                      patchEnc({ diagnostico: e.target.value })
                    }
                    placeholder="Descreva o que foi identificado"
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="enc-acoes">Ações realizadas</Label>
                  <textarea
                    id="enc-acoes"
                    rows={3}
                    value={encForm.acoesRealizadas}
                    onChange={(e) =>
                      patchEnc({ acoesRealizadas: e.target.value })
                    }
                    placeholder="Descreva o que foi feito para resolver"
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                <MultiCheckboxGroup
                  label="Sinais no teste pós-intervenção"
                  options={SINAIS_OPCOES}
                  selected={encForm.sinaisPosTeste}
                  onChange={(sinaisPosTeste) => patchEnc({ sinaisPosTeste })}
                  outrosValue={encForm.sinaisPosTesteOutros}
                  onOutrosChange={(sinaisPosTesteOutros) =>
                    patchEnc({ sinaisPosTesteOutros })
                  }
                />

                <div className="grid gap-2">
                  <Label htmlFor="enc-obs">Observações adicionais</Label>
                  <textarea
                    id="enc-obs"
                    rows={2}
                    value={encForm.observacoes}
                    onChange={(e) =>
                      patchEnc({ observacoes: e.target.value })
                    }
                    placeholder="Opcional"
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>

                {emailEncerramento && (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
                    <p className="text-sm font-medium">E-mail de encerramento</p>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Assunto
                      </Label>
                      <Input
                        readOnly
                        value={emailEncerramento.assunto}
                        className="bg-background font-mono text-xs"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Corpo
                      </Label>
                      <textarea
                        readOnly
                        rows={10}
                        value={emailEncerramento.corpo}
                        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none"
                      />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {podeAtribuirMissao && (
            <Button onClick={atribuirMissao} disabled={loading}>
              {loading ? "Atribuindo…" : "Atribuir missão"}
            </Button>
          )}
          {podeEncerrar && (
            <Button onClick={encerrar} disabled={loading}>
              {loading ? "Encerrando…" : "Encerrar chamado"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
