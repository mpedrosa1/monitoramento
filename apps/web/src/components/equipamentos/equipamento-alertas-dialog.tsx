"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, asArray } from "@/lib/api";
import type {
  AlertaEquipamento,
  AlertaOperador,
  Equipamento,
  Unidade,
  UnidadeEquipamento,
} from "@/lib/types";
import {
  OPERADORES_ESTADO,
  OPERADORES_NUMERICO,
  operadorUsaFaixa,
  pontosAlertaveis,
  resumoAlerta,
  type PontoAlertavel,
} from "@/lib/alerta-equipamento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

type FormState = {
  pontoNome: string;
  operador: AlertaOperador;
  valor: string;
  valor2: string;
  estadoChave: string;
  ativo: boolean;
};

const FORM_VAZIO: FormState = {
  pontoNome: "",
  operador: "gt",
  valor: "",
  valor2: "",
  estadoChave: "",
  ativo: true,
};

function parseNumero(v: string): number {
  return Number.parseFloat(v.replace(/\./g, "").replace(",", "."));
}

export function EquipamentoAlertasDialog({
  open,
  onOpenChange,
  unidade,
  link,
  equipamento,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidade: Unidade;
  link: UnidadeEquipamento;
  equipamento?: Equipamento;
}) {
  const [alertas, setAlertas] = useState<AlertaEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pontos = useMemo(() => pontosAlertaveis(equipamento), [equipamento]);
  const pontoSelecionado: PontoAlertavel | undefined = useMemo(
    () => pontos.find((p) => p.nome === form.pontoNome),
    [pontos, form.pontoNome]
  );

  const equipamentoNome =
    link.nomeLocal?.trim() || equipamento?.nome || "Equipamento";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        unidadeId: unidade.id,
        equipamentoId: link.equipamentoId,
        porta: String(link.porta),
      });
      const list = await apiFetch<AlertaEquipamento[] | null>(
        `/api/v1/alertas-equipamento?${params.toString()}`
      );
      setAlertas(asArray(list));
    } finally {
      setLoading(false);
    }
  }, [unidade.id, link.equipamentoId, link.porta]);

  useEffect(() => {
    if (open) {
      setForm(FORM_VAZIO);
      setEditingId(null);
      setErro(null);
      void load();
    }
  }, [open, load]);

  function selecionarPonto(nome: string) {
    const ponto = pontos.find((p) => p.nome === nome);
    const operador: AlertaOperador = ponto?.tipo === "estado" ? "igual" : "gt";
    setForm((f) => ({
      ...f,
      pontoNome: nome,
      operador,
      valor: "",
      valor2: "",
      estadoChave: ponto?.estados[0]?.chave ?? "",
    }));
  }

  function editar(a: AlertaEquipamento) {
    setEditingId(a.id);
    setErro(null);
    setForm({
      pontoNome: a.pontoNome,
      operador: a.operador,
      valor: a.valor != null ? String(a.valor) : "",
      valor2: a.valor2 != null ? String(a.valor2) : "",
      estadoChave: a.estadoChave ?? "",
      ativo: a.ativo,
    });
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm(FORM_VAZIO);
    setErro(null);
  }

  async function salvar() {
    const ponto = pontoSelecionado;
    if (!ponto) {
      setErro("Selecione o ponto monitorado.");
      return;
    }

    const body: Record<string, unknown> = {
      unidadeId: unidade.id,
      equipamentoId: link.equipamentoId,
      porta: link.porta,
      unidadeNome: unidade.nome,
      equipamentoNome,
      pontoNome: ponto.nome,
      pontoUnidade: ponto.unidade ?? "",
      tipo: ponto.tipo,
      operador: form.operador,
      ativo: form.ativo,
    };

    if (ponto.tipo === "numerico") {
      const valor = parseNumero(form.valor);
      if (Number.isNaN(valor)) {
        setErro("Informe um valor numérico válido.");
        return;
      }
      body.valor = valor;
      if (operadorUsaFaixa(form.operador)) {
        const valor2 = parseNumero(form.valor2);
        if (Number.isNaN(valor2)) {
          setErro("Informe o valor máximo da faixa.");
          return;
        }
        if (valor2 < valor) {
          setErro("O valor máximo não pode ser menor que o mínimo.");
          return;
        }
        body.valor2 = valor2;
      }
    } else {
      const chave = form.estadoChave.trim();
      if (!chave) {
        setErro("Informe o estado a ser monitorado.");
        return;
      }
      body.estadoChave = chave;
      body.estadoExibicao =
        ponto.estados.find((e) => e.chave === chave)?.exibicao ?? chave;
    }

    setSalvando(true);
    setErro(null);
    try {
      if (editingId) {
        await apiFetch(`/api/v1/alertas-equipamento/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/v1/alertas-equipamento", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      cancelarEdicao();
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar alerta.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(a: AlertaEquipamento) {
    if (!window.confirm(`Excluir o alerta de "${a.pontoNome}"?`)) return;
    try {
      await apiFetch<void>(`/api/v1/alertas-equipamento/${a.id}`, {
        method: "DELETE",
      });
      if (editingId === a.id) cancelarEdicao();
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir alerta.");
    }
  }

  const usaFaixa = operadorUsaFaixa(form.operador);
  const operadores =
    pontoSelecionado?.tipo === "estado"
      ? OPERADORES_ESTADO
      : OPERADORES_NUMERICO;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Alertas — {equipamentoNome}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground">
            {unidade.nome}. Os alertas são avaliados no servidor e enviados a
            todos os usuários quando a condição é atendida (e ao normalizar).
          </p>

          {/* Lista de alertas existentes */}
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : alertas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum alerta configurado para este equipamento.
              </p>
            ) : (
              <ul className="space-y-2">
                {alertas.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.pontoNome}{" "}
                        <span className="font-normal text-muted-foreground">
                          {resumoAlerta(a)}
                        </span>
                      </p>
                      {!a.ativo && (
                        <Badge variant="ghost" className="mt-0.5">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => editar(a)}
                        aria-label="Editar alerta"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void excluir(a)}
                        aria-label="Excluir alerta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Formulário de criação/edição */}
          {pontos.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Este equipamento não tem pontos configurados para monitorar.
            </p>
          ) : (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">
                {editingId ? "Editar condição" : "Nova condição"}
              </p>

              {erro && (
                <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {erro}
                </p>
              )}

              <div className="grid gap-2">
                <Label>Ponto monitorado</Label>
                <Select
                  value={form.pontoNome || null}
                  onValueChange={(v) => selecionarPonto(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione…">
                      {form.pontoNome || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {pontos.map((p) => (
                      <SelectItem key={p.nome} value={p.nome} label={p.nome}>
                        {p.nome}
                        {p.unidade ? ` (${p.unidade})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pontoSelecionado && (
                <>
                  <div className="grid gap-2">
                    <Label>Condição</Label>
                    <Select
                      value={form.operador}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          operador: (v ?? "gt") as AlertaOperador,
                        }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operadores.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            label={o.label}
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {pontoSelecionado.tipo === "numerico" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="alerta-valor">
                          {usaFaixa ? "Mínimo" : "Valor"}
                          {pontoSelecionado.unidade
                            ? ` (${pontoSelecionado.unidade})`
                            : ""}
                        </Label>
                        <Input
                          id="alerta-valor"
                          inputMode="decimal"
                          placeholder="0"
                          value={form.valor}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, valor: e.target.value }))
                          }
                        />
                      </div>
                      {usaFaixa && (
                        <div className="grid gap-2">
                          <Label htmlFor="alerta-valor2">
                            Máximo
                            {pontoSelecionado.unidade
                              ? ` (${pontoSelecionado.unidade})`
                              : ""}
                          </Label>
                          <Input
                            id="alerta-valor2"
                            inputMode="decimal"
                            placeholder="0"
                            value={form.valor2}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                valor2: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  ) : pontoSelecionado.estados.length > 0 ? (
                    <div className="grid gap-2">
                      <Label>Estado</Label>
                      <Select
                        value={form.estadoChave || null}
                        onValueChange={(v) =>
                          setForm((f) => ({ ...f, estadoChave: v ?? "" }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione…">
                            {pontoSelecionado.estados.find(
                              (e) => e.chave === form.estadoChave
                            )?.exibicao || undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {pontoSelecionado.estados.map((e) => (
                            <SelectItem
                              key={e.chave}
                              value={e.chave}
                              label={e.exibicao}
                            >
                              {e.exibicao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label htmlFor="alerta-estado">Valor do estado</Label>
                      <Input
                        id="alerta-estado"
                        placeholder="ex.: 1"
                        value={form.estadoChave}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            estadoChave: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ativo: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    Alerta ativo
                  </label>
                </>
              )}

              <div className="flex justify-end gap-2 pt-1">
                {editingId && (
                  <Button variant="outline" size="sm" onClick={cancelarEdicao}>
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => void salvar()}
                  disabled={salvando || !pontoSelecionado}
                >
                  {salvando ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : editingId ? null : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  {editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
