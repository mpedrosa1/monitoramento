"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import {
  buildEmailAutorizacaoAssunto,
  buildEmailAutorizacaoCorpo,
  formatNumeroExibicao,
} from "@/lib/chamado-email";
import {
  autorizacaoInputFromForm,
  emptyMissaoForm,
  validateMissaoForm,
  type MissaoFormState,
} from "@/lib/chamado-missao-form";
import { ultimosChamadosAbertosDaUnidade } from "@/lib/chamados";
import type { Chamado, Colaborador, Missao, Unidade } from "@/lib/types";
import { ColaboradoresMissaoPicker } from "@/components/chamados/colaboradores-missao-picker";
import { EmailAutorizacaoPreview } from "@/components/chamados/email-autorizacao-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function tituloMissaoPlanejada(unidade: Unidade, chamado?: Chamado | null): string {
  if (chamado?.numero) {
    return `Chamado ${formatNumeroExibicao(chamado.numero)} — ${unidade.nome}`;
  }
  return `Missão — ${unidade.codigo} — ${unidade.nome}`;
}

export function PlanejarMissaoDialog({
  unidade,
  onSuccess,
}: {
  unidade: Unidade;
  onSuccess?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [chamadosAbertos, setChamadosAbertos] = useState<Chamado[]>([]);
  const [chamadoId, setChamadoId] = useState("");
  const [form, setForm] = useState<MissaoFormState>(() => emptyMissaoForm());

  const unidadeNome = unidade.nome;

  useEffect(() => {
    if (!open) return;
    setForm(emptyMissaoForm());
    setChamadoId("");

    Promise.all([
      apiFetch<Colaborador[] | null>("/api/v1/colaboradores"),
      apiFetch<Chamado[] | null>("/api/v1/chamados"),
    ])
      .then(([cols, chs]) => {
        setColaboradores(asArray(cols));
        const abertos = ultimosChamadosAbertosDaUnidade(
          asArray(chs),
          unidade.id,
          50
        );
        setChamadosAbertos(abertos);
        if (abertos.length === 1) {
          setChamadoId(abertos[0].id);
        }
      })
      .catch(() => {
        setColaboradores([]);
        setChamadosAbertos([]);
      });
  }, [open, unidade.id]);

  function patchForm(p: Partial<MissaoFormState>) {
    setForm((f) => ({ ...f, ...p }));
  }

  const chamadoSelecionado = useMemo(
    () => chamadosAbertos.find((c) => c.id === chamadoId) ?? null,
    [chamadosAbertos, chamadoId]
  );

  const emailAutorizacao = useMemo(() => {
    const input = autorizacaoInputFromForm(form, unidadeNome, colaboradores);
    if (input.colaboradores.length === 0) return null;
    return {
      assunto: buildEmailAutorizacaoAssunto(unidadeNome),
      corpo: buildEmailAutorizacaoCorpo(input),
    };
  }, [form, unidadeNome, colaboradores]);

  const chamadoItems = useMemo(
    () => [
      { value: "", label: "Nenhum" },
      ...chamadosAbertos.map((c) => ({
        value: c.id,
        label: c.numero
          ? formatNumeroExibicao(c.numero)
          : c.titulo,
      })),
    ],
    [chamadosAbertos]
  );

  async function planejar() {
    const erro = validateMissaoForm(form, colaboradores);
    if (erro) {
      window.alert(erro);
      return;
    }

    setLoading(true);
    try {
      await apiFetch<Missao>("/api/v1/missoes", {
        method: "POST",
        body: JSON.stringify({
          titulo: tituloMissaoPlanejada(unidade, chamadoSelecionado),
          status: "planejada",
          unidadeId: unidade.id,
          chamadoId: chamadoId.trim() || undefined,
          colaboradorIds: form.colaboradorIds,
          dataInicio: form.dataIso,
          horaInicio: form.hora,
        }),
      });
      setOpen(false);
      await onSuccess?.();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao planejar missão."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <MapPinned data-icon="inline-start" />
        Planejar missão
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Planejar missão — {unidade.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {chamadosAbertos.length > 0 && (
            <div className="grid gap-2">
              <Label>Chamado vinculado (opcional)</Label>
              <Select
                items={chamadoItems}
                value={chamadoId}
                onValueChange={(v) => setChamadoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {chamadosAbertos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero
                        ? formatNumeroExibicao(c.numero)
                        : c.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ColaboradoresMissaoPicker
            colaboradores={colaboradores}
            selected={form.colaboradorIds}
            onChange={(colaboradorIds) => patchForm({ colaboradorIds })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="planejar-missao-data">
                Previsão de chegada — data
              </Label>
              <Input
                id="planejar-missao-data"
                type="date"
                value={form.dataIso}
                onChange={(e) => patchForm({ dataIso: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planejar-missao-hora">
                Previsão de chegada — hora
              </Label>
              <Input
                id="planejar-missao-hora"
                type="time"
                value={form.hora}
                onChange={(e) => patchForm({ hora: e.target.value })}
              />
            </div>
          </div>

          {emailAutorizacao && (
            <EmailAutorizacaoPreview
              assunto={emailAutorizacao.assunto}
              corpo={emailAutorizacao.corpo}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={planejar} disabled={loading}>
            {loading ? "Salvando…" : "Planejar missão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
