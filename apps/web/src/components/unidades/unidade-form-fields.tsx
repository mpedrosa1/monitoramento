"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  BR_ESTADOS,
  sanitizeUnidadeCodigo,
  unidadeCoordenadasPreenchidas,
  type UnidadeFormState,
} from "@/lib/unidade-form";
import { areaResumo, verticesToLatLng } from "@/lib/unidade-area";
import {
  buscarEnderecoPorCep,
  cepDigits,
  formatCepInput,
  isCepComplete,
  mergeEnderecoViaCep,
} from "@/lib/viacep";
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
import {
  SelecionarAreaButton,
  UnidadeAreaMapDialog,
} from "@/components/unidades/unidade-area-map-dialog";

export function UnidadeFormFields({
  form,
  onChange,
}: {
  form: UnidadeFormState;
  onChange: (patch: Partial<UnidadeFormState>) => void;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);
  const [mapaCoordsOpen, setMapaCoordsOpen] = useState(false);
  const [mapaAreaOpen, setMapaAreaOpen] = useState(false);
  const coordsPreenchidas = unidadeCoordenadasPreenchidas(form);
  const areaResumoTexto = useMemo(
    () => areaResumo(verticesToLatLng(form.areaVertices)),
    [form.areaVertices]
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
  }, []);

  function patchEndereco(field: keyof UnidadeFormState["endereco"], value: string) {
    onChange({ endereco: { ...form.endereco, [field]: value } });
  }

  function patchCoordenadas(patch: Partial<Pick<UnidadeFormState, "latitude" | "longitude">>) {
    const next = {
      latitude: patch.latitude ?? form.latitude,
      longitude: patch.longitude ?? form.longitude,
    };
    const validas = unidadeCoordenadasPreenchidas(next);
    onChange({
      ...patch,
      ...(validas
        ? {}
        : {
            areaM2: "",
            areaVertices: [],
          }),
    });
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
            onChange={(e) => patchCoordenadas({ latitude: e.target.value })}
            placeholder="-23.550520"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={form.longitude}
            onChange={(e) => patchCoordenadas({ longitude: e.target.value })}
            placeholder="-46.633308"
          />
        </div>
        <div className="sm:col-span-2">
          <SelecionarCoordenadasButton onClick={() => setMapaCoordsOpen(true)} />
        </div>
        {coordsPreenchidas ? (
          <>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="unidade-area">Área da unidade</Label>
              <Input
                id="unidade-area"
                readOnly
                value={areaResumoTexto}
                className="bg-muted/40"
              />
            </div>
            <div className="sm:col-span-2">
              <SelecionarAreaButton onClick={() => setMapaAreaOpen(true)} />
            </div>
          </>
        ) : null}
      </div>

      <CoordenadasMapDialog
        open={mapaCoordsOpen}
        onOpenChange={setMapaCoordsOpen}
        endereco={form.endereco}
        latitude={form.latitude}
        longitude={form.longitude}
        onConfirm={(latitude, longitude) =>
          patchCoordenadas({ latitude, longitude })
        }
      />

      {coordsPreenchidas ? (
        <UnidadeAreaMapDialog
          open={mapaAreaOpen}
          onOpenChange={setMapaAreaOpen}
          latitude={form.latitude}
          longitude={form.longitude}
          areaVertices={form.areaVertices}
          onConfirm={(areaVertices, areaM2) =>
            onChange({
              areaVertices,
              areaM2: String(areaM2),
            })
          }
        />
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="ip">Endereço IP</Label>
        <Input
          id="ip"
          value={form.ip}
          onChange={(e) => onChange({ ip: e.target.value })}
          placeholder="192.168.1.10"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Equipamentos são vinculados na aba de detalhes da unidade (clique na
        linha da tabela).
      </p>

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
