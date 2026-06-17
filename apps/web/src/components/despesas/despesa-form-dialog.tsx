"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, asArray } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import {
  APP_TRANSPORTE_OPCOES,
  categoriasPorModalidade,
  labelAppTransporte,
  labelCategoriaDespesa,
  labelModalidadeDespesa,
  MODALIDADE_DESPESA_OPCOES,
} from "@/lib/despesas";
import { salarioParaNumero, salarioNumeroParaInput } from "@/lib/masks";
import type {
  AppTransporte,
  CategoriaDespesa,
  Despesa,
  ModalidadeDespesa,
  Veiculo,
} from "@/lib/types";
import { formatPlaca, normalizePlaca } from "@/lib/veiculo-placa";
import { DespesaComprovanteUpload } from "@/components/despesas/despesa-comprovante-upload";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const VEICULO_PESSOAL_ID = "__pessoal__";

type FormState = {
  modalidade: ModalidadeDespesa;
  categoria: CategoriaDespesa | "";
  valor: string;
  data: string;
  hora: string;
  veiculoId: string;
  placa: string;
  hodometro: string;
  appTransporte: AppTransporte | "";
  appTransporteOutro: string;
  descricao: string;
  comprovanteUrl: string;
};

function hojeYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function horaAtual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function veiculoPadrao(veiculos: Veiculo[], userId?: string): string {
  const mine = userId
    ? veiculos.filter((v) => v.colaboradorId === userId)
    : [];
  if (mine.length > 0) return mine[0].id;
  return VEICULO_PESSOAL_ID;
}

function labelVeiculo(v: Veiculo): string {
  const descricao = [v.marca, v.modelo].filter(Boolean).join(" ").trim();
  const placa = formatPlaca(v.placa);
  return descricao ? `${descricao} · ${placa}` : placa;
}

function despesaToForm(
  d: Despesa | null,
  veiculos: Veiculo[],
  userId?: string
): FormState {
  const base: FormState = {
    modalidade: "mobilidade",
    categoria: "combustivel",
    valor: "",
    data: hojeYmd(),
    hora: horaAtual(),
    veiculoId: veiculoPadrao(veiculos, userId),
    placa: "",
    hodometro: "",
    appTransporte: "uber",
    appTransporteOutro: "",
    descricao: "",
    comprovanteUrl: "",
  };
  if (!d) {
    const padraoId = veiculoPadrao(veiculos, userId);
    if (padraoId !== VEICULO_PESSOAL_ID) {
      const v = veiculos.find((x) => x.id === padraoId);
      if (v) base.placa = formatPlaca(v.placa);
    }
    return base;
  }
  return {
    modalidade: d.modalidade,
    categoria: d.categoria,
    valor: salarioNumeroParaInput(d.valor),
    data: d.data,
    hora: d.hora ?? horaAtual(),
    veiculoId: d.veiculoPessoal
      ? VEICULO_PESSOAL_ID
      : (d.veiculoId ?? VEICULO_PESSOAL_ID),
    placa: d.placa ? formatPlaca(d.placa) : "",
    hodometro: d.hodometro ? String(d.hodometro) : "",
    appTransporte: d.appTransporte ?? "uber",
    appTransporteOutro: d.appTransporteOutro ?? "",
    descricao: d.descricao ?? "",
    comprovanteUrl: d.comprovanteUrl ?? "",
  };
}

export function DespesaFormDialog({
  open,
  onOpenChange,
  despesa,
  colaboradorId,
  colaboradorNome,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  despesa: Despesa | null;
  /** Quando informado, registra/edita despesa em nome do colaborador (RH/admin). */
  colaboradorId?: string;
  colaboradorNome?: string;
  onSuccess: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const titularId = colaboradorId ?? user?.id;
  const adminMode = Boolean(colaboradorId);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [form, setForm] = useState<FormState>(() => despesaToForm(despesa, []));
  const [saving, setSaving] = useState(false);

  const veiculosOrdenados = useMemo(() => {
    return [...veiculos].sort((a, b) => {
      const aMine = a.colaboradorId === titularId ? 0 : 1;
      const bMine = b.colaboradorId === titularId ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      return labelVeiculo(a).localeCompare(labelVeiculo(b), "pt-BR");
    });
  }, [veiculos, titularId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await apiFetch<Veiculo[] | null>("/api/v1/veiculos");
        if (cancelled) return;
        const todos = asArray(list);
        setVeiculos(todos);
        setForm(despesaToForm(despesa, todos, titularId));
      } catch {
        if (!cancelled) setForm(despesaToForm(despesa, [], titularId));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, despesa, titularId]);

  const categorias = useMemo(
    () => categoriasPorModalidade(form.modalidade),
    [form.modalidade]
  );

  const isCombustivel = form.categoria === "combustivel";
  const isTransporteApp = form.categoria === "transporte_app";
  const veiculoPessoal = form.veiculoId === VEICULO_PESSOAL_ID;

  const veiculoSelecionado = useMemo(
    () => veiculos.find((v) => v.id === form.veiculoId) ?? null,
    [veiculos, form.veiculoId]
  );

  const veiculoSelecionadoLabel = useMemo(() => {
    if (veiculoPessoal) return "Veículo pessoal";
    if (!veiculoSelecionado) return undefined;
    return labelVeiculo(veiculoSelecionado);
  }, [veiculoPessoal, veiculoSelecionado]);

  function setModalidade(modalidade: ModalidadeDespesa) {
    const cats = categoriasPorModalidade(modalidade);
    setForm((f) => ({
      ...f,
      modalidade,
      categoria: cats[0]?.value ?? "",
    }));
  }

  function selecionarVeiculo(veiculoId: string) {
    if (veiculoId === VEICULO_PESSOAL_ID) {
      setForm((f) => ({
        ...f,
        veiculoId,
        placa: f.placa,
      }));
      return;
    }
    const v = veiculos.find((x) => x.id === veiculoId);
    setForm((f) => ({
      ...f,
      veiculoId,
      placa: v ? formatPlaca(v.placa) : "",
    }));
  }

  async function salvar() {
    if (!form.categoria) {
      window.alert("Selecione a categoria.");
      return;
    }
    const valor = salarioParaNumero(form.valor);
    if (valor <= 0) {
      window.alert("Informe um valor válido.");
      return;
    }
    if (!form.data) {
      window.alert("Informe a data da despesa.");
      return;
    }
    if (!form.comprovanteUrl && !despesa?.comprovanteUrl) {
      window.alert("Envie a imagem do comprovante.");
      return;
    }
    if (isCombustivel) {
      if (!form.hora) {
        window.alert("Informe a hora do abastecimento.");
        return;
      }
      if (!form.placa.trim()) {
        window.alert("Informe a placa do veículo.");
        return;
      }
      const hodometro = Number.parseInt(form.hodometro.replace(/\D/g, ""), 10);
      if (!hodometro || hodometro <= 0) {
        window.alert("Informe o hodômetro.");
        return;
      }
    }
    if (isTransporteApp) {
      if (!form.appTransporte) {
        window.alert("Selecione o aplicativo.");
        return;
      }
      if (
        form.appTransporte === "outro" &&
        !form.appTransporteOutro.trim()
      ) {
        window.alert("Informe o nome do aplicativo.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        modalidade: form.modalidade,
        categoria: form.categoria,
        valor,
        data: form.data,
        descricao: form.descricao.trim(),
        comprovanteUrl: form.comprovanteUrl || despesa?.comprovanteUrl,
      };

      if (isCombustivel) {
        body.hora = form.hora;
        body.veiculoPessoal = veiculoPessoal;
        body.placa = normalizePlaca(form.placa);
        body.hodometro = Number.parseInt(form.hodometro.replace(/\D/g, ""), 10);
        if (!veiculoPessoal && form.veiculoId !== VEICULO_PESSOAL_ID) {
          body.veiculoId = form.veiculoId;
        }
      }

      if (isTransporteApp) {
        body.appTransporte = form.appTransporte;
        if (form.appTransporte === "outro") {
          body.appTransporteOutro = form.appTransporteOutro.trim();
        }
      }

      const basePath = adminMode
        ? `/api/v1/despesas/colaboradores/${colaboradorId}`
        : "/api/v1/despesas/me";

      if (despesa) {
        await apiFetch<Despesa>(`${basePath}/${despesa.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch<Despesa>(basePath, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onOpenChange(false);
      await onSuccess();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao salvar despesa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[92vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {despesa ? "Editar despesa" : "Nova despesa"}
            {adminMode && colaboradorNome ? (
              <span className="block text-sm font-normal text-muted-foreground">
                {colaboradorNome}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain py-2 pr-1">
          <DespesaComprovanteUpload
            comprovanteUrl={form.comprovanteUrl}
            onChange={(url) => setForm((f) => ({ ...f, comprovanteUrl: url }))}
            disabled={saving}
          />

          <div className="grid gap-2">
            <Label>Modalidade</Label>
            <Select
              value={form.modalidade}
              onValueChange={(v) => setModalidade(v as ModalidadeDespesa)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione…">
                  {labelModalidadeDespesa(form.modalidade)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MODALIDADE_DESPESA_OPCOES.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select
              value={form.categoria}
              onValueChange={(v) =>
                setForm((f) => {
                  const categoria = v as CategoriaDespesa;
                  return {
                    ...f,
                    categoria,
                    veiculoId:
                      categoria === "combustivel"
                        ? veiculoPadrao(veiculos, titularId)
                        : f.veiculoId,
                    appTransporte:
                      categoria === "transporte_app"
                        ? f.appTransporte || "uber"
                        : f.appTransporte,
                    appTransporteOutro:
                      categoria === "transporte_app" ? f.appTransporteOutro : "",
                  };
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione…">
                  {form.categoria
                    ? labelCategoriaDespesa(form.categoria)
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categorias.map((o) => (
                  <SelectItem key={o.value} value={o.value} label={o.label}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTransporteApp && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>APP</Label>
                <Select
                  value={form.appTransporte || null}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      appTransporte: (v ?? "") as AppTransporte,
                      appTransporteOutro:
                        v === "outro" ? f.appTransporteOutro : "",
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione…">
                      {form.appTransporte
                        ? labelAppTransporte(
                            form.appTransporte,
                            form.appTransporteOutro
                          )
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {APP_TRANSPORTE_OPCOES.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.appTransporte === "outro" && (
                <div className="grid gap-2">
                  <Label htmlFor="despesa-app-outro">Nome do aplicativo</Label>
                  <Input
                    id="despesa-app-outro"
                    value={form.appTransporteOutro}
                    placeholder="Ex.: Cabify"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        appTransporteOutro: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="despesa-valor">Valor (R$)</Label>
            <Input
              id="despesa-valor"
              inputMode="numeric"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  valor: salarioNumeroParaInput(salarioParaNumero(e.target.value)),
                }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="despesa-data">Data</Label>
              <Input
                id="despesa-data"
                type="date"
                value={form.data}
                onChange={(e) =>
                  setForm((f) => ({ ...f, data: e.target.value }))
                }
              />
            </div>
            {isCombustivel && (
              <div className="grid gap-2">
                <Label htmlFor="despesa-hora">Hora</Label>
                <Input
                  id="despesa-hora"
                  type="time"
                  value={form.hora}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora: e.target.value }))
                  }
                />
              </div>
            )}
          </div>

          {isCombustivel && (
            <>
              <div className="grid gap-2">
                <Label>Veículo</Label>
                <Select
                  value={form.veiculoId}
                  onValueChange={selecionarVeiculo}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o veículo">
                      {veiculoSelecionadoLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {veiculosOrdenados.map((v) => {
                      const itemLabel = labelVeiculo(v);
                      return (
                        <SelectItem
                          key={v.id}
                          value={v.id}
                          label={itemLabel}
                        >
                          {itemLabel}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value={VEICULO_PESSOAL_ID} label="Veículo pessoal">
                      Veículo pessoal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="despesa-placa">Placa</Label>
                  <Input
                    id="despesa-placa"
                    value={form.placa}
                    readOnly={!veiculoPessoal}
                    placeholder="ABC1D23"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        placa: formatPlaca(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="despesa-hodometro">Hodômetro (km)</Label>
                  <Input
                    id="despesa-hodometro"
                    inputMode="numeric"
                    placeholder="Ex.: 45230"
                    value={form.hodometro}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        hodometro: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="despesa-descricao">Descrição (opcional)</Label>
            <textarea
              id="despesa-descricao"
              rows={2}
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Ex.: abastecimento viagem Itirapina"
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
