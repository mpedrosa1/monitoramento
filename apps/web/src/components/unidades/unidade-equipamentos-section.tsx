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
import {
  EquipamentosFiltroToggle,
  EquipamentosViewToggle,
} from "@/components/unidades/equipamentos-view-toggle";
import { UnidadeEquipamentosManageDialog } from "@/components/unidades/unidade-equipamentos-manage-dialog";
import {
  useEquipamentosFiltro,
  useEquipamentosLayout,
} from "@/lib/equipamentos-layout";

export function UnidadeEquipamentosSection({
  unidade,
  catalogo,
  metricMap,
  canManage,
  onUnidadeUpdated,
  showLayoutToggle = false,
}: {
  unidade: Unidade;
  catalogo: Equipamento[];
  metricMap: Map<string, DeviceMetric>;
  canManage: boolean;
  onUnidadeUpdated: (unidade: Unidade) => void;
  /** Exibe alternância grade/lista (ex.: aba Equipamentos do painel). */
  showLayoutToggle?: boolean;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [layout, setLayout] = useEquipamentosLayout();
  const [filtro, setFiltro] = useEquipamentosFiltro();
  const equipamentos = asArray(unidade.equipamentos);
  const count = contarEquipamentosUnidade(unidade);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Equipamentos ({count})</h3>
          {showLayoutToggle && equipamentos.length > 0 ? (
            <>
              <EquipamentosViewToggle value={layout} onChange={setLayout} />
              <EquipamentosFiltroToggle value={filtro} onChange={setFiltro} />
            </>
          ) : null}
        </div>
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
          layout={layout}
          filtro={showLayoutToggle ? filtro : "todos"}
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
