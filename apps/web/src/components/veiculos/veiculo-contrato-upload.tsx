"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";
import {
  uploadVeiculoContrato,
  VEICULO_CONTRATO_ACCEPT,
} from "@/lib/veiculo-contrato";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function VeiculoContratoUpload({
  contratoUrl,
  onChange,
  disabled,
}: {
  contratoUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadVeiculoContrato(file, contratoUrl || undefined);
      onChange(url);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao enviar contrato");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remover() {
    onChange("");
  }

  return (
    <div className="grid gap-2">
      <Label>Contrato (PDF)</Label>
      {contratoUrl ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">Contrato anexado</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={contratoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir PDF
            </a>
            {!disabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  Trocar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  onClick={remover}
                  disabled={uploading}
                  aria-label="Remover contrato"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Anexe o contrato de locação em PDF (máx. 20 MB)
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={VEICULO_CONTRATO_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void onFileChange(e.target.files?.[0])}
      />
      {!disabled && !contratoUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {uploading ? "Enviando…" : "Anexar contrato"}
        </Button>
      ) : null}
    </div>
  );
}
