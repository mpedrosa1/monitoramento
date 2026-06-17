"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch, asArray } from "@/lib/api";
import type { Colaborador } from "@/lib/types";
import { usePermissions } from "@/hooks/use-permissions";
import { ColaboradorDetail } from "@/components/colaboradores/colaborador-detail";

export default function ColaboradorRhDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { canManageData } = usePermissions();
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const cols = await apiFetch<Colaborador[] | null>(
        "/api/v1/colaboradores"
      );
      const found = asArray(cols).find((c) => c.id === id) ?? null;
      setColaborador(found);
      setNotFound(!found);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-6">
      {loading && (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}
      {notFound && !loading && (
        <p className="text-sm text-muted-foreground">
          Colaborador não encontrado.
        </p>
      )}
      {colaborador && !loading && (
        <ColaboradorDetail
          colaborador={colaborador}
          canManage={canManageData}
          onChanged={load}
        />
      )}
    </div>
  );
}
