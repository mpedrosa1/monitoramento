"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { asArray } from "@/lib/api";
import type { DeviceMetric, Equipamento, Unidade } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  UnidadeEquipamentosGrid,
  contarEquipamentosUnidade,
} from "@/components/unidades/unidade-equipamentos-grid";
import { UnidadeEquipamentosManageDialog } from "@/components/unidades/unidade-equipamentos-manage-dialog";

export function UnidadeEquipamentosSection({
  unidade,
  catalogo,
  metricMap,
  canManage,
  onUnidadeUpdated,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  canManage: boolean;
  onUnidadeUpdated: (unidade: Unidade) => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const equipamentos = asArray(unidade.equipamentos);
  const count = contarEquipamentosUnidade(unidade);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Equipamentos ({count})</h3>
        {canManage ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setManageOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo equipamento
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <UnidadeEquipamentosManageDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          unidade={unidade}
          catalogo={catalogo}
          metricMap={metricMap}
          onUnidadeUpdated={onUnidadeUpdated}
        />
      ) : null}

      {equipamentos.length > 0 ? (
        <UnidadeEquipamentosGrid
          unidade={unidade}
          catalogo={catalogo}
          metricMap={metricMap}
        />
      ) : canManage ? (
        <p className="text-sm text-muted-foreground">
          Nenhum equipamento vinculado. Use &quot;Novo equipamento&quot; para
          adicionar.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum equipamento vinculado.
        </p>
      )}
    </section>
  );
}
