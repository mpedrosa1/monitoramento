"use client";

import type { Colaborador } from "@/lib/types";
import type { VeiculoFormState } from "@/lib/veiculo-form";
import { VeiculoFotoUpload } from "@/components/veiculos/veiculo-foto-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: {
  form: VeiculoFormState;
  onChange: (patch: Partial<VeiculoFormState>) => void;
  colaboradores: Colaborador[];
}) {
  const colaboradoresOrdenados = [...colaboradores].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );
  const colaboradorItems = colaboradoresOrdenados.map((c) => ({
    value: c.id,
    label: c.cargo ? `${c.nome} — ${c.cargo}` : c.nome,
  }));

  const rotuloPreview =
    [form.marca, form.modelo].filter(Boolean).join(" ").trim() || undefined;

  return (
    <div className="space-y-4">
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
              onChange({ kmAtual: e.target.value.replace(/\D/g, "").slice(0, 7) })
            }
            inputMode="numeric"
            placeholder="Ex.: 45320"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="space-y-2">
          <Label htmlFor="veiculo-ano-fab">Ano fabricação</Label>
          <Input
            id="veiculo-ano-fab"
            value={form.anoFabricacao}
            onChange={(e) =>
              onChange({ anoFabricacao: e.target.value.replace(/\D/g, "").slice(0, 4) })
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
              onChange({ anoModelo: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
            inputMode="numeric"
            placeholder="2021"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="veiculo-cor">Cor</Label>
          <Input
            id="veiculo-cor"
            value={form.cor}
            onChange={(e) => onChange({ cor: e.target.value })}
            placeholder="Ex.: Branco"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="veiculo-renavam">RENAVAM</Label>
          <Input
            id="veiculo-renavam"
            value={form.renavam}
            onChange={(e) =>
              onChange({ renavam: e.target.value.replace(/\D/g, "").slice(0, 11) })
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
              onChange({ chassi: e.target.value.toUpperCase().slice(0, 17) })
            }
            className="font-mono text-xs uppercase"
            placeholder="Opcional"
            maxLength={17}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Colaborador responsável</Label>
        <Select
          items={colaboradorItems}
          value={form.colaboradorId || null}
          onValueChange={(v) => onChange({ colaboradorId: v ?? "" })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o condutor responsável" />
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
    </div>
  );
}
