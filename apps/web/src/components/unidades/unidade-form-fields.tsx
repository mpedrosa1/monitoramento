"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { DeviceMetric, Equipamento, UnidadeEquipamento } from "@/lib/types";
import { monitorTargetId } from "@/lib/types";
import {
  agruparEquipamentosUnidade,
  BR_ESTADOS,
  detalheVinculoEquipamento,
  labelEquipamentoCatalogo,
  nomeEquipamentoVinculo,
  nomeMaquinaVinculo,
  portaEquipamentoEmUso,
  sanitizeUnidadeCodigo,
  vinculoEquipamentoKey,
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
import { UnidadeNovoEquipamentoDialog } from "@/components/unidades/unidade-novo-equipamento-dialog";

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
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [mapaCoordsOpen, setMapaCoordsOpen] = useState(false);
  const [novoEquipOpen, setNovoEquipOpen] = useState(false);

  const paginaWebItems = useMemo(
    () => [
      { value: "nao", label: "Não" },
      { value: "sim", label: "Sim" },
    ],
    []
  );

  const estadoItems = useMemo(
    () => BR_ESTADOS.map((uf) => ({ value: uf, label: uf })),
    []
  );

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

  function updateVinculo(
    localId: string,
    patch: Partial<UnidadeEquipamento>
  ) {
    onChange({
      equipamentos: form.equipamentos.map((l, i) =>
        vinculoEquipamentoKey(l, i) === localId ? { ...l, ...patch } : l
      ),
    });
  }

  function removeEquipamento(localId: string) {
    onChange({
      equipamentos: form.equipamentos.filter(
        (l, i) => vinculoEquipamentoKey(l, i) !== localId
      ),
    });
  }

  function removeMaquina(maquinaId: string) {
    onChange({
      equipamentos: form.equipamentos.filter(
        (l) => l.maquinaId?.trim() !== maquinaId
      ),
    });
  }

  function updateMaquinaGrupo(
    maquinaId: string,
    patch: Partial<UnidadeEquipamento>
  ) {
    onChange({
      equipamentos: form.equipamentos.map((l) =>
        l.maquinaId?.trim() === maquinaId ? { ...l, ...patch } : l
      ),
    });
  }

  const equipamentosAgrupados = useMemo(
    () => agruparEquipamentosUnidade(form.equipamentos),
    [form.equipamentos]
  );

  const nomeEquipCatalogo =
    equipNome ?? ((id: string) => catalogo.find((e) => e.id === id)?.nome ?? id);

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="unidade-id">ID</Label>
        <Input
          id="unidade-id"
          value={form.codigo}
          onChange={(e) =>
            onChange({ codigo: sanitizeUnidadeCodigo(e.target.value) })
          }
          placeholder="Ex.: 1"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Somente números.
        </p>
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
              items={estadoItems}
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
                {equipamentosAgrupados.map((grupo) => {
                  if (grupo.tipo === "maquina") {
                    const linkRef = grupo.links[0];
                    const maquinaNome = nomeMaquinaVinculo(linkRef);
                    return (
                      <li
                        key={grupo.maquinaId}
                        className="space-y-2 px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{maquinaNome}</p>
                            <p className="text-xs text-muted-foreground">
                              Máquina · porta {linkRef.porta} ·{" "}
                              {grupo.links.length} sensor
                              {grupo.links.length === 1 ? "" : "es"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeMaquina(grupo.maquinaId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <ul className="space-y-1.5 rounded-md border border-border bg-muted/20 px-2 py-2">
                          {grupo.links.map((link) => {
                            const eq = catalogo.find(
                              (e) => e.id === link.equipamentoId
                            );
                            const localId = link._localId ?? link.equipamentoId;
                            const targetId =
                              unidadeMongoId && metricMap
                                ? monitorTargetId(
                                    unidadeMongoId,
                                    link.equipamentoId,
                                    link.porta
                                  )
                                : "";
                            const m = targetId
                              ? metricMap?.get(targetId)
                              : undefined;
                            return (
                              <li
                                key={localId}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="min-w-0 truncate text-muted-foreground">
                                  {eq
                                    ? labelEquipamentoCatalogo(eq)
                                    : link.equipamentoId}
                                </span>
                                {m && (
                                  <Badge
                                    variant={m.online ? "default" : "destructive"}
                                    className="shrink-0 text-[10px]"
                                  >
                                    {m.online ? "Online" : "Offline"}
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Porta</Label>
                          <Input
                            type="number"
                            min={0}
                            value={linkRef.porta}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const parsed = Number.parseInt(raw, 10);
                              if (raw !== "" && !Number.isFinite(parsed)) return;
                              if (
                                Number.isFinite(parsed) &&
                                parsed >= 0 &&
                                portaEquipamentoEmUso(form.equipamentos, parsed, {
                                  maquinaId: grupo.maquinaId,
                                })
                              ) {
                                return;
                              }
                              updateMaquinaGrupo(grupo.maquinaId, {
                                porta: Number.isFinite(parsed)
                                  ? parsed
                                  : linkRef.porta,
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Possui página web?</Label>
                            <Select
                              items={paginaWebItems}
                              value={linkRef.paginaWeb ? "sim" : "nao"}
                              onValueChange={(v) => {
                                const sim = v === "sim";
                                updateMaquinaGrupo(grupo.maquinaId, {
                                  paginaWeb: sim,
                                  portaWeb: sim
                                    ? linkRef.portaWeb ?? 80
                                    : undefined,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nao">Não</SelectItem>
                                <SelectItem value="sim">Sim</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {linkRef.paginaWeb ? (
                            <div className="grid gap-1.5">
                              <Label className="text-xs">Porta web</Label>
                              <Input
                                type="number"
                                min={1}
                                max={65535}
                                value={linkRef.portaWeb ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  updateMaquinaGrupo(grupo.maquinaId, {
                                    portaWeb:
                                      raw === ""
                                        ? undefined
                                        : Number.parseInt(raw, 10) ||
                                          undefined,
                                  });
                                }}
                                className="h-8 text-xs"
                              />
                            </div>
                          ) : (
                            <div className="hidden sm:block" aria-hidden />
                          )}
                        </div>
                      </li>
                    );
                  }

                  const link = grupo.link;
                  const index = grupo.index;
                  const eq = catalogo.find((e) => e.id === link.equipamentoId);
                  const localId = vinculoEquipamentoKey(link, index);
                  const targetId =
                    unidadeMongoId && metricMap
                      ? monitorTargetId(
                          unidadeMongoId,
                          link.equipamentoId,
                          link.porta
                        )
                      : "";
                  const m = targetId ? metricMap?.get(targetId) : undefined;
                  const catalogoNome = nomeEquipCatalogo(link.equipamentoId);
                  return (
                    <li
                      key={localId}
                      className="space-y-2 px-3 py-2.5 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {nomeEquipamentoVinculo(link, eq)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Catálogo: {detalheVinculoEquipamento(link, eq)}
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
                            onClick={() => removeEquipamento(localId)}
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
                            updateVinculo(localId, {
                              nomeLocal: e.target.value,
                            })
                          }
                          placeholder={catalogoNome}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Possui página web?</Label>
                          <Select
                            items={paginaWebItems}
                            value={link.paginaWeb ? "sim" : "nao"}
                            onValueChange={(v) => {
                              const sim = v === "sim";
                              updateVinculo(localId, {
                                paginaWeb: sim,
                                portaWeb: sim ? link.portaWeb ?? 80 : undefined,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nao">Não</SelectItem>
                              <SelectItem value="sim">Sim</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {link.paginaWeb ? (
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Porta web</Label>
                            <Input
                              type="number"
                              min={1}
                              max={65535}
                              value={link.portaWeb ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateVinculo(localId, {
                                  portaWeb:
                                    raw === ""
                                      ? undefined
                                      : Number.parseInt(raw, 10) || undefined,
                                });
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <div className="hidden sm:block" aria-hidden />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setNovoEquipOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Novo equipamento
            </Button>
            <UnidadeNovoEquipamentoDialog
              open={novoEquipOpen}
              onOpenChange={setNovoEquipOpen}
              catalogo={catalogo}
              equipamentos={form.equipamentos}
              onAdd={(vinculos) =>
                onChange({
                  equipamentos: [...form.equipamentos, ...vinculos],
                })
              }
            />
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
