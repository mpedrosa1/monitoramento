import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  colaboradorStatusLabel,
  colaboradorStatusVariant,
} from "@/lib/labels";
import type { Colaborador } from "@/lib/types";

export function ColaboradorCard({ colaborador }: { colaborador: Colaborador }) {
  const initials = colaborador.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={colaborador.fotoUrl} alt={colaborador.nome} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-medium leading-tight">{colaborador.nome}</p>
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
