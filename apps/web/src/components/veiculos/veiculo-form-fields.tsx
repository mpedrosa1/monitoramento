"use client";

import { useEffect, useState } from "react";
import type { Colaborador } from "@/lib/types";
import type { VeiculoFormState } from "@/lib/veiculo-form";
import type { VeiculoFormTab } from "@/lib/veiculo-form-tabs";
import { LOCADORAS_VEICULO } from "@/lib/veiculo-locadora";
import { formatSalarioInput } from "@/lib/masks";
import { VeiculoFotoUpload } from "@/components/veiculos/veiculo-foto-upload";
import { VeiculoContratoUpload } from "@/components/veiculos/veiculo-contrato-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VeiculoFormFields({
  form,
  onChange,
  colaboradores,
  focusTab = null,
}: {
  form: VeiculoFormState;
  onChange: (patch: Partial<VeiculoFormState>) => void;
  colaboradores: Colaborador[];
  focusTab?: VeiculoFormTab | null;
}) {
  const [tab, setTab] = useState<VeiculoFormTab>("identificacao");

  useEffect(() => {
    if (focusTab) setTab(focusTab);
  }, [focusTab]);

  const colaboradoresOrdenados = [...colaboradores].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  const colaboradorItems = colaboradoresOrdenados.map((c) => ({
    value: c.id,
    label: c.cargo ? `${c.nome} — ${c.cargo}` : c.nome,
  }));

  const rotuloPreview =
    [form.marca, form.modelo].filter(Boolean).join(" ").trim() || undefined;

  function toggleCondutorAutorizado(id: string) {
    const atual = form.colaboradoresAdicionaisIds;
    onChange({
      colaboradoresAdicionaisIds: atual.includes(id)
        ? atual.filter((item) => item !== id)
        : [...atual, id],
    });
  }

  function alterarMotoristaAtual(colaboradorId: string) {
    onChange({ colaboradorId });
  }

  function TabButton({
    value,
    label,
  }: {
    value: VeiculoFormTab;
    label: string;
  }) {
    const active = tab === value;
    return (
      <button
        type="button"
        onClick={() => setTab(value)}
        className={[
          "whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium transition",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        ].join(" ")}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="grid gap-5 py-1">
      <div className="flex flex-wrap gap-2">
        <TabButton value="identificacao" label="Identificação" />
        <TabButton value="documentacao" label="Documentação" />
        <TabButton value="locacao" label="Locação" />
        <TabButton value="condutores" label="Motoristas" />
      </div>

      <div className="h-[min(52vh,28rem)] overflow-y-auto overscroll-contain pr-1">
        {tab === "identificacao" ? (
          <section className="grid gap-4">
            <VeiculoFotoUpload
              fotoUrl={form.fotoUrl}
              rotulo={rotuloPreview}
              onChange={(fotoUrl) => onChange({ fotoUrl })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="veiculo-placa">Placa</Label>
                <Input
                  id="veiculo-placa"
                  value={form.placa}
                  onChange={(e) => onChange({ placa: e.target.value })}
                  placeholder="ABC1D23"
                  className="font-mono uppercase"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-km">KM atual</Label>
                <Input
                  id="veiculo-km"
                  value={form.kmAtual}
                  onChange={(e) =>
                    onChange({
                      kmAtual: e.target.value.replace(/\D/g, "").slice(0, 7),
                    })
                  }
                  inputMode="numeric"
                  placeholder="Ex.: 45320"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-marca">Marca</Label>
                <Input
                  id="veiculo-marca"
                  value={form.marca}
                  onChange={(e) => onChange({ marca: e.target.value })}
                  placeholder="Ex.: Fiat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-modelo">Modelo</Label>
                <Input
                  id="veiculo-modelo"
                  value={form.modelo}
                  onChange={(e) => onChange({ modelo: e.target.value })}
                  placeholder="Ex.: Strada"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="veiculo-cor">Cor</Label>
                <Input
                  id="veiculo-cor"
                  value={form.cor}
                  onChange={(e) => onChange({ cor: e.target.value })}
                  placeholder="Ex.: Branco"
                />
              </div>
            </div>
          </section>
        ) : null}

        {tab === "documentacao" ? (
          <section className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="veiculo-ano-fab">Ano fabricação</Label>
                <Input
                  id="veiculo-ano-fab"
                  value={form.anoFabricacao}
                  onChange={(e) =>
                    onChange({
                      anoFabricacao: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4),
                    })
                  }
                  inputMode="numeric"
                  placeholder="2020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-ano-mod">Ano modelo</Label>
                <Input
                  id="veiculo-ano-mod"
                  value={form.anoModelo}
                  onChange={(e) =>
                    onChange({
                      anoModelo: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  inputMode="numeric"
                  placeholder="2021"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-renavam">RENAVAM</Label>
                <Input
                  id="veiculo-renavam"
                  value={form.renavam}
                  onChange={(e) =>
                    onChange({
                      renavam: e.target.value.replace(/\D/g, "").slice(0, 11),
                    })
                  }
                  inputMode="numeric"
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="veiculo-chassi">Chassi</Label>
                <Input
                  id="veiculo-chassi"
                  value={form.chassi}
                  onChange={(e) =>
                    onChange({
                      chassi: e.target.value.toUpperCase().slice(0, 17),
                    })
                  }
                  className="font-mono text-xs uppercase"
                  placeholder="Opcional"
                  maxLength={17}
                />
              </div>
            </div>
          </section>
        ) : null}

        {tab === "locacao" ? (
          <section className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Locadora</Label>
                <Select
                  items={[
                    { value: "", label: "Não informado" },
                    ...LOCADORAS_VEICULO.map((l) => ({
                      value: l.value,
                      label: l.label,
                    })),
                  ]}
                  value={form.locadora || null}
                  onValueChange={(v) =>
                    onChange({
                      locadora: (v ?? "") as VeiculoFormState["locadora"],
                      locadoraOutra: v === "outra" ? form.locadoraOutra : "",
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a locadora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label="Não informado">
                      Não informado
                    </SelectItem>
                    {LOCADORAS_VEICULO.map((l) => (
                      <SelectItem key={l.value} value={l.value} label={l.label}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-data-locacao">Data da locação</Label>
                <Input
                  id="veiculo-data-locacao"
                  type="date"
                  value={form.dataLocacao}
                  onChange={(e) => onChange({ dataLocacao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-numero-contrato">
                  Número de contrato
                </Label>
                <Input
                  id="veiculo-numero-contrato"
                  value={form.numeroContrato}
                  onChange={(e) => onChange({ numeroContrato: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veiculo-valor-aluguel">Valor do aluguel</Label>
                <Input
                  id="veiculo-valor-aluguel"
                  value={form.valorAluguel}
                  onChange={(e) =>
                    onChange({ valorAluguel: formatSalarioInput(e.target.value) })
                  }
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                />
              </div>
              {form.locadora === "outra" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="veiculo-locadora-outra">
                    Nome da locadora
                  </Label>
                  <Input
                    id="veiculo-locadora-outra"
                    value={form.locadoraOutra}
                    onChange={(e) => onChange({ locadoraOutra: e.target.value })}
                    placeholder="Informe o nome da locadora"
                  />
                </div>
              ) : null}
            </div>

            <VeiculoContratoUpload
              contratoUrl={form.contratoUrl}
              onChange={(contratoUrl) => onChange({ contratoUrl })}
            />

            <div className="rounded-lg border border-border p-4">
              {!form.mostrarDevolucao ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onChange({ mostrarDevolucao: true })}
                >
                  Devolver veículo
                </Button>
              ) : (
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Devolução do veículo</p>
                    {!form.dataDevolucao.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          onChange({
                            mostrarDevolucao: false,
                            dataDevolucao: "",
                            horaDevolucao: "",
                          })
                        }
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="veiculo-data-devolucao">
                        Data da devolução
                      </Label>
                      <Input
                        id="veiculo-data-devolucao"
                        type="date"
                        value={form.dataDevolucao}
                        onChange={(e) =>
                          onChange({ dataDevolucao: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="veiculo-hora-devolucao">
                        Hora da devolução
                      </Label>
                      <Input
                        id="veiculo-hora-devolucao"
                        type="time"
                        value={form.horaDevolucao}
                        onChange={(e) =>
                          onChange({ horaDevolucao: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === "condutores" ? (
          <section className="grid gap-4">
            <div className="space-y-2">
              <Label>Motorista atual</Label>
              <Select
                items={colaboradorItems}
                value={form.colaboradorId || null}
                onValueChange={(v) => alterarMotoristaAtual(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o motorista atual" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradoresOrdenados.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      label={c.cargo ? `${c.nome} — ${c.cargo}` : c.nome}
                    >
                      {c.nome}
                      {c.cargo ? ` — ${c.cargo}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Condutores autorizados</Label>
              <p className="text-xs text-muted-foreground">
                Marque os colaboradores autorizados a dirigir este veículo,
                independentemente do motorista atual.
              </p>
              {colaboradoresOrdenados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador cadastrado.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {colaboradoresOrdenados.map((c) => {
                    const selecionado =
                      form.colaboradoresAdicionaisIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                          selecionado
                            ? "border-primary bg-primary/10"
                            : "border-border"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={selecionado}
                          onChange={() => toggleCondutorAutorizado(c.id)}
                        />
                        {c.cargo ? `${c.nome} — ${c.cargo}` : c.nome}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
