"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { VEICULO_FOTO_PADRAO } from "@/lib/veiculo-imagem";
import {
  VEICULO_FOTO_ACCEPT,
  isVeiculoFotoCustomUrl,
  uploadVeiculoFoto,
} from "@/lib/veiculo-foto";
import { Button } from "@/components/ui/button";

export function VeiculoFotoUpload({
  fotoUrl,
  rotulo,
  onChange,
}: {
  fotoUrl: string;
  rotulo?: string;
  onChange: (fotoUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const preview =
    localPreview || fotoUrl?.trim() || VEICULO_FOTO_PADRAO;
  const temFotoCustom = isVeiculoFotoCustomUrl(fotoUrl);
  const usaImgNativo =
    preview.startsWith("blob:") ||
    preview.startsWith("http") ||
    preview.startsWith("/pics/");

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  async function handleFile(file: File | null) {
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blobUrl;
    });

    setUploading(true);
    setErro(null);
    try {
      const url = await uploadVeiculoFoto(
        file,
        temFotoCustom ? fotoUrl : undefined
      );
      onChange(url);
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removerFoto() {
    onChange(VEICULO_FOTO_PADRAO);
    setErro(null);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="relative aspect-[16/10] w-40 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
        {usaImgNativo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={rotulo || "Foto do veículo"}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <Image
            src={preview}
            alt={rotulo || "Foto do veículo"}
            fill
            className="object-contain p-2"
            sizes="160px"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">Foto do veículo</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP até 5 MB. A imagem é redimensionada para exibição
          nos cards.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={VEICULO_FOTO_ACCEPT}
            className="sr-only"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {uploading
              ? "Enviando…"
              : temFotoCustom
                ? "Trocar foto"
                : "Enviar foto"}
          </Button>
          {temFotoCustom ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={removerFoto}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remover
            </Button>
          ) : null}
        </div>
        {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
      </div>
    </div>
  );
}
