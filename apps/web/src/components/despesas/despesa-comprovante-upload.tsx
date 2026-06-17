"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  DESPESA_COMPROVANTE_ACCEPT,
  uploadDespesaComprovante,
} from "@/lib/despesa-comprovante";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function DespesaComprovanteUpload({
  comprovanteUrl,
  onChange,
  disabled,
}: {
  comprovanteUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const exibicao = preview ?? comprovanteUrl;

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      const url = await uploadDespesaComprovante(file, comprovanteUrl || undefined);
      onChange(url);
    } catch (e) {
      setPreview(null);
      window.alert(e instanceof Error ? e.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remover() {
    setPreview(null);
    onChange("");
  }

  return (
    <div className="grid gap-2">
      <Label>Comprovante (imagem)</Label>
      {exibicao ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exibicao}
            alt="Comprovante da despesa"
            className="max-h-48 w-full object-contain"
          />
          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute right-2 top-2"
              onClick={remover}
              disabled={uploading}
              aria-label="Remover comprovante"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Foto do cupom ou nota fiscal
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={DESPESA_COMPROVANTE_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void onFileChange(e.target.files?.[0])}
      />
      {!disabled && (
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
            <ImagePlus className="mr-1.5 h-4 w-4" />
          )}
          {uploading
            ? "Enviando…"
            : exibicao
              ? "Trocar imagem"
              : "Enviar imagem"}
        </Button>
      )}
    </div>
  );
}
