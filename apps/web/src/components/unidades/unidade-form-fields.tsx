"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  tipoEquipamentoLabel,
  tipoMonitoramentoLabel,
} from "@/lib/labels";
import type { DeviceMetric, Equipamento, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId } from "@/lib/types";
import {
  BR_ESTADOS,
  defaultPortaForEquipamento,
  labelEquipamentoCatalogo,
  nomeEquipamentoVinculo,
  type UnidadeFormState,
} from "@/lib/unidade-form";
import {
  buscarEnderecoPorCep,
  cepDigits,
  formatCepInput,
  isCepComplete,
  mergeEnderecoViaCep,
} from "@/lib/viacep";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { StringListField } from "@/components/unidades/string-list-field";
import {
  CoordenadasMapDialog,
  SelecionarCoordenadasButton,
} from "@/components/unidades/coordenadas-map-dialog";

export function UnidadeFormFields({
  form,
  onChange,
  catalogo,
  equipNome,
  metricMap,
  unidadeMongoId,
}: {
  form: UnidadeFormState;
  onChange: (patch: Partial<UnidadeFormState>) => void;
  catalogo: Equipamento[];
  equipNome?: (id: string) => string;
  metricMap?: Map<string, DeviceMetric>;
  unidadeMongoId?: string;
}) {
  const [newEquipId, setNewEquipId] = useState(catalogo[0]?.id ?? "");
  const [newPorta, setNewPorta] = useState(
    defaultPortaForEquipamento(catalogo[0])
  );
  const [newNomeLocal, setNewNomeLocal] = useState("");

  const selectedEquip = catalogo.find((e) => e.id === newEquipId);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [mapaCoordsOpen, setMapaCoordsOpen] = useState(false);
  const ultimoCepBuscado = useRef("");
  const cepCarregadoRef = useRef(cepDigits(form.endereco.cep));
  const enderecoRef = useRef(form.endereco);
  enderecoRef.current = form.endereco;

  useEffect(() => {
    const digits = cepDigits(form.endereco.cep);
    cepCarregadoRef.current = digits;
    ultimoCepBuscado.current = digits;
  }, [unidadeMongoId]);

  function patchEndereco(field: keyof UnidadeFormState["endereco"], value: string) {
    onChange({ endereco: { ...form.endereco, [field]: value } });
  }

  function handleCepInput(raw: string) {
    const formatted = formatCepInput(raw);
    patchEndereco("cep", formatted);
    setCepErro(null);
    if (cepDigits(formatted) !== ultimoCepBuscado.current) {
      ultimoCepBuscado.current = "";
    }
  }

  useEffect(() => {
    const cep = form.endereco.cep;
    if (!isCepComplete(cep)) return;

    const digits = cepDigits(cep);
    if (digits === ultimoCepBuscado.current) return;

    const atual = enderecoRef.current;
    if (
      digits === cepCarregadoRef.current &&
      atual.estado.trim() &&
      atual.logradouro.trim() &&
      atual.cidade.trim()
    ) {
      ultimoCepBuscado.current = digits;
      return;
    }

    const timer = setTimeout(async () => {
      setCepLoading(true);
      setCepErro(null);
      try {
        const dados = await buscarEnderecoPorCep(cep);
        if (!dados) {
          setCepErro("CEP não encontrado");
          return;
        }
        ultimoCepBuscado.current = digits;
        onChange({
          endereco: mergeEnderecoViaCep(enderecoRef.current, dados),
        });
      } catch {
        setCepErro("Não foi possível consultar o CEP. Tente novamente.");
      } finally {
        setCepLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.endereco.cep, onChange]);

  function addEquipamento() {
    if (!newEquipId) return;
    if (form.equipamentos.some((l) => l.equipamentoId === newEquipId)) return;
    const nomeLocal = newNomeLocal.trim();
    onChange({
      equipamentos: [
        ...form.equipamentos,
        {
          equipamentoId: newEquipId,
          porta: Number.parseInt(newPorta, 10) || 0,
          ...(nomeLocal ? { nomeLocal } : {}),
        },
      ],
    });
    setNewNomeLocal("");
  }

  function updateVinculo(
    equipamentoId: string,
    patch: Partial<UnidadeEquipamento>
  ) {
    onChange({
      equipamentos: form.equipamentos.map((l) =>
        l.equipamentoId === equipamentoId ? { ...l, ...patch } : l
      ),
    });
  }

  function removeEquipamento(equipamentoId: string) {
    onChange({
      equipamentos: form.equipamentos.filter(
        (l) => l.equipamentoId !== equipamentoId
      ),
    });
  }

  const nomeEquipCatalogo =
    equipNome ?? ((id: string) => catalogo.find((e) => e.id === id)?.nome ?? id);

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="unidade-id">ID</Label>
        <Input
          id="unidade-id"
          value={form.codigo}
          onChange={(e) => onChange({ codigo: e.target.value })}
          placeholder="Ex.: PC-01"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="unidade-nome">Nome</Label>
        <Input
          id="unidade-nome"
          value={form.nome}
          onChange={(e) => onChange({ nome: e.target.value })}
        />
      </div>

      <StringListField
        label="Diretores"
        items={form.diretores}
        onChange={(diretores) => onChange({ diretores })}
        placeholder="Nome do diretor"
      />

      <StringListField
        label="Telefones"
        items={form.telefones}
        onChange={(telefones) => onChange({ telefones })}
        placeholder="(00) 00000-0000"
        inputType="tel"
      />

      <StringListField
        label="E-mails"
        items={form.emails}
        onChange={(emails) => onChange({ emails })}
        placeholder="contato@exemplo.gov.br"
        inputType="email"
      />

      <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
        <p className="text-sm font-medium">Endereço</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label className="text-xs">CEP</Label>
            <div className="flex gap-2">
              <Input
                value={form.endereco.cep}
                onChange={(e) => handleCepInput(e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
                maxLength={9}
                className="max-w-[140px]"
                aria-invalid={!!cepErro}
              />
              {cepLoading && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando…
                </span>
              )}
            </div>
            {cepErro && (
              <p className="text-xs text-destructive">{cepErro}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ao informar o CEP completo, rua, bairro, cidade e estado são
              preenchidos automaticamente (ViaCEP).
            </p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label className="text-xs">Rua / Avenida / Rodovia</Label>
            <Input
              value={form.endereco.logradouro}
              onChange={(e) => patchEndereco("logradouro", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Número</Label>
            <Input
              value={form.endereco.numero}
              onChange={(e) => patchEndereco("numero", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Complemento</Label>
            <Input
              value={form.endereco.complemento}
              onChange={(e) => patchEndereco("complemento", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Bairro</Label>
            <Input
              value={form.endereco.bairro}
              onChange={(e) => patchEndereco("bairro", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Cidade</Label>
            <Input
              value={form.endereco.cidade}
              onChange={(e) => patchEndereco("cidade", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Estado</Label>
            <Select
              key={`uf-${form.endereco.estado || "vazio"}`}
              value={
                form.endereco.estado &&
                BR_ESTADOS.includes(
                  form.endereco.estado as (typeof BR_ESTADOS)[number]
                )
                  ? form.endereco.estado
                  : null
              }
              onValueChange={(v) => patchEndereco("estado", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BR_ESTADOS.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={form.latitude}
            onChange={(e) => onChange({ latitude: e.target.value })}
            placeholder="-23.550520"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={form.longitude}
            onChange={(e) => onChange({ longitude: e.target.value })}
            placeholder="-46.633308"
          />
        </div>
        <div className="sm:col-span-2">
          <SelecionarCoordenadasButton onClick={() => setMapaCoordsOpen(true)} />
        </div>
      </div>

      <CoordenadasMapDialog
        open={mapaCoordsOpen}
        onOpenChange={setMapaCoordsOpen}
        endereco={form.endereco}
        latitude={form.latitude}
        longitude={form.longitude}
        onConfirm={(latitude, longitude) =>
          onChange({ latitude, longitude })
        }
      />

      <div className="grid gap-2">
        <Label htmlFor="ip">Endereço IP</Label>
        <Input
          id="ip"
          value={form.ip}
          onChange={(e) => onChange({ ip: e.target.value })}
          placeholder="192.168.1.10"
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
        <p className="text-sm font-medium">Equipamentos</p>
        {catalogo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum equipamento no catálogo. Cadastre em Equipamentos primeiro.
          </p>
        ) : (
          <>
            {form.equipamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum equipamento vinculado.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {form.equipamentos.map((link) => {
                  const eq = catalogo.find((e) => e.id === link.equipamentoId);
                  const targetId =
                    unidadeMongoId && metricMap
                      ? monitorTargetId(unidadeMongoId, link.equipamentoId)
                      : "";
                  const m = targetId ? metricMap?.get(targetId) : undefined;
                  const catalogoNome = nomeEquipCatalogo(link.equipamentoId);
                  return (
                    <li
                      key={link.equipamentoId}
                      className="space-y-2 px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {nomeEquipamentoVinculo(link, eq)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Catálogo: {catalogoNome}
                            {eq
                              ? ` · ${tipoEquipamentoLabel[eq.tipoEquipamento]} · ${tipoMonitoramentoLabel[eq.tipoMonitoramento]}`
                              : ""}
                            {" · "}Porta {link.porta}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {m && (
                            <Badge
                              variant={m.online ? "default" : "destructive"}
                            >
                              {m.online ? "Online" : "Offline"}
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              removeEquipamento(link.equipamentoId)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">
                          Nome nesta unidade (opcional)
                        </Label>
                        <Input
                          value={link.nomeLocal ?? ""}
                          onChange={(e) =>
                            updateVinculo(link.equipamentoId, {
                              nomeLocal: e.target.value,
                            })
                          }
                          placeholder={catalogoNome}
                          className="h-8 text-xs"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
              <div className="grid gap-2">
                <Label className="text-xs">Equipamento do catálogo</Label>
                <Select
                  value={newEquipId || ""}
                  onValueChange={(v) => {
                    const id = v ?? "";
                    setNewEquipId(id);
                    const eq = catalogo.find((e) => e.id === id);
                    setNewPorta(defaultPortaForEquipamento(eq));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogo.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {labelEquipamentoCatalogo(e)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">
                  Nome nesta unidade (opcional)
                </Label>
                <Input
                  value={newNomeLocal}
                  onChange={(e) => setNewNomeLocal(e.target.value)}
                  placeholder={
                    selectedEquip
                      ? `Ex.: ${selectedEquip.nome} — bloco A`
                      : "Apelido local sem alterar o catálogo"
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Porta</Label>
                <Input
                  type="number"
                  min={0}
                  value={newPorta}
                  onChange={(e) => setNewPorta(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addEquipamento}
                disabled={!newEquipId}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Vincular equipamento
              </Button>
            </div>
          </>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="intervalo">Intervalo de coleta (segundos)</Label>
          <Input
            id="intervalo"
            type="number"
            min={5}
            value={form.intervaloS}
            onChange={(e) => onChange({ intervaloS: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="alertaOffline">
            Alerta offline (segundos)
          </Label>
          <Input
            id="alertaOffline"
            type="number"
            min={10}
            value={form.alertaOfflineS}
            onChange={(e) => onChange({ alertaOfflineS: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Tempo sem resposta do IP ou dos OIDs (SNMP) antes de exibir um
            aviso na tela. Padrão: 60 s.
          </p>
        </div>
      </div>
    </div>
  );
}
