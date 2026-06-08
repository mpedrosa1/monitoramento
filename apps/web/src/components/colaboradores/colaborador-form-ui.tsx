"use client";

import type { ReactNode } from "react";
import type { ColaboradorFormErrors } from "@/lib/colaborador-form";
import { listColaboradorFormErrors } from "@/lib/colaborador-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ColaboradorFormLegend() {
  return (
    <p className="text-xs text-muted-foreground">
      Campos marcados com <span className="text-destructive">*</span> são
      obrigatórios.
    </p>
  );
}

export function ColaboradorFormErrorsBanner({
  errors,
}: {
  errors: ColaboradorFormErrors;
}) {
  const messages = listColaboradorFormErrors(errors);
  if (messages.length === 0) return null;

  const visiveis = messages.slice(0, 5);
  const restantes = messages.length - visiveis.length;

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm"
    >
      <p className="font-medium text-destructive">
        Corrija os campos destacados abaixo
      </p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-destructive/90">
        {visiveis.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
        {restantes > 0 && (
          <li>…e mais {restantes} campo(s) com pendência</li>
        )}
      </ul>
    </div>
  );
}

export function ColaboradorField({
  fieldKey,
  label,
  required,
  error,
  className,
  children,
}: {
  fieldKey: string;
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-field={fieldKey}
      className={cn("grid gap-2", className)}
    >
      <Label>
        {label}
        {required && (
          <span
            className="ml-0.5 text-destructive"
            aria-hidden="true"
            title="Obrigatório"
          >
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
