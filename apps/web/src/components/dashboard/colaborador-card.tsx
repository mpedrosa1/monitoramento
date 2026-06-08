import { Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import type { Colaborador } from "@/lib/types";

export function ColaboradorCard({
  colaborador,
  onEdit,
  onDelete,
  deleting = false,
}: {
  colaborador: Colaborador;
  onEdit?: (colaborador: Colaborador) => void;
  onDelete?: (colaborador: Colaborador) => void;
  deleting?: boolean;
}) {
  const initials = colaborador.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showActions = Boolean(onEdit || onDelete);

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      {showActions && (
        <div className="absolute right-2 top-2 z-10 flex gap-0.5">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm"
              onClick={() => onEdit(colaborador)}
              aria-label={`Editar ${colaborador.nome}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="h-7 w-7 bg-background/80 backdrop-blur-sm"
              onClick={() => onDelete(colaborador)}
              disabled={deleting}
              aria-label={`Excluir ${colaborador.nome}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      )}
      <CardContent
        className={`flex flex-col items-center gap-3 p-4 ${showActions ? "pt-10" : "pt-4"}`}
      >
        <Avatar className="h-16 w-16">
          <AvatarImage src={colaborador.fotoUrl} alt={colaborador.nome} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-medium leading-tight">{colaborador.nome}</p>
          {colaborador.cargo && (
            <p className="mt-1 text-xs text-muted-foreground">
              {colaborador.cargo}
            </p>
          )}
          <Badge
            variant={colaboradorStatusVariant[colaborador.status]}
            className="mt-2"
          >
            {colaboradorStatusLabel[colaborador.status]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
