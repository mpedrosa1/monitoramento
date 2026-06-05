import { Badge } from "@/components/ui/badge";
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

export function ChamadosTable({ chamados }: { chamados: Chamado[] }) {
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
