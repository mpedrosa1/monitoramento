"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chamadoStatusLabel, chamadoStatusVariant } from "@/lib/labels";
import { formatNumeroExibicao } from "@/lib/chamado-email";
import { isAtribuidoMissao } from "@/lib/permissions";
import type { Chamado } from "@/lib/types";
import { formatDateTimeBR } from "@/lib/time";

function formatDate(iso: string) {
  return formatDateTimeBR(iso);
}

function chamadoLabel(c: Chamado): string {
  return c.numero ? formatNumeroExibicao(c.numero) : c.titulo;
}

export function ChamadosTable({
  chamados,
  onRowClick,
  onEdit,
  onDelete,
  deleting = false,
  emptyMessage = "Nenhum chamado registrado.",
  unidadeLabel,
}: {
  chamados: Chamado[];
  onRowClick?: (chamado: Chamado) => void;
  onEdit?: (chamado: Chamado) => void;
  onDelete?: (chamado: Chamado) => void;
  deleting?: boolean;
  emptyMessage?: string;
  unidadeLabel?: (unidadeId: string) => string;
}) {
  const { user } = useAuth();
  const showActions = Boolean(onEdit || onDelete);
  const clickable = Boolean(onRowClick);

  if (chamados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chamado</TableHead>
          {unidadeLabel && <TableHead>Unidade</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Data</TableHead>
          {showActions && (
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {chamados.map((c) => (
          <TableRow
            key={c.id}
            className={clickable ? "cursor-pointer hover:bg-muted/40" : undefined}
            onClick={clickable ? () => onRowClick?.(c) : undefined}
          >
            <TableCell className="font-medium">
              {c.numero ? formatNumeroExibicao(c.numero) : c.titulo}
            </TableCell>
            {unidadeLabel && (
              <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                {unidadeLabel(c.unidadeId)}
              </TableCell>
            )}
            <TableCell>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={chamadoStatusVariant[c.status]}>
                  {chamadoStatusLabel[c.status]}
                </Badge>
                {isAtribuidoMissao(user?.id, c) && (
                  <Badge className="border-amber-300 bg-amber-400 font-semibold text-amber-950 shadow-sm ring-1 ring-amber-300/80 dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950">
                    Atribuído a você
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatDate(c.createdAt)}
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                <div
                  className="flex justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(c)}
                      aria-label={`Editar ${chamadoLabel(c)}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(c)}
                      disabled={deleting}
                      aria-label={`Excluir ${chamadoLabel(c)}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
