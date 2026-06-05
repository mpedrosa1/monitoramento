import { Pencil, Trash2 } from "lucide-react";
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
import type { Chamado } from "@/lib/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function chamadoLabel(c: Chamado): string {
  return c.numero ? formatNumeroExibicao(c.numero) : c.titulo;
}

export function ChamadosTable({
  chamados,
  onEdit,
  onDelete,
  deleting = false,
}: {
  chamados: Chamado[];
  onEdit?: (chamado: Chamado) => void;
  onDelete?: (chamado: Chamado) => void;
  deleting?: boolean;
}) {
  const showActions = Boolean(onEdit || onDelete);

  if (chamados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum chamado registrado.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Chamado</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Data</TableHead>
          {showActions && (
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {chamados.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              {c.numero ? formatNumeroExibicao(c.numero) : c.titulo}
            </TableCell>
            <TableCell>
              <Badge variant={chamadoStatusVariant[c.status]}>
                {chamadoStatusLabel[c.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatDate(c.createdAt)}
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
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
