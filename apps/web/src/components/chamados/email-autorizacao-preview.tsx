"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailAutorizacaoPreview({
  assunto,
  corpo,
  title = "E-mail de autorização de entrada",
}: {
  assunto: string;
  corpo: string;
  title?: string;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Assunto</Label>
        <Input
          readOnly
          value={assunto}
          className="bg-background font-mono text-xs"
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Corpo</Label>
        <textarea
          readOnly
          rows={12}
          value={corpo}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-xs outline-none"
        />
      </div>
    </div>
  );
}
