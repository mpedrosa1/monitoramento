"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { COLABORADOR_AVATAR_PADRAO } from "@/lib/colaborador-avatar";
import {
  COLABORADOR_FOTO_ACCEPT,
  isColaboradorFotoCustomUrl,
  uploadColaboradorFoto,
} from "@/lib/colaborador-foto";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ColaboradorFotoUpload({
  nome,
  fotoUrl,
  onChange,
}: {
  nome: string;
  fotoUrl: string;
  onChange: (fotoUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const preview = fotoUrl || COLABORADOR_AVATAR_PADRAO;
  const temFotoCustom = isColaboradorFotoCustomUrl(fotoUrl);

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setErro(null);
    try {
      const url = await uploadColaboradorFoto(file, temFotoCustom ? fotoUrl : undefined);
      onChange(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removerFoto() {
    onChange(COLABORADOR_AVATAR_PADRAO);
    setErro(null);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Avatar className="h-20 w-20 shrink-0">
        <AvatarImage src={preview} alt={nome || "Foto do colaborador"} />
        <AvatarFallback>{iniciais(nome || "?")}</AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <p className="text-sm font-medium">Foto de perfil</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP até 5 MB. A imagem é redimensionada para 256×256 px
          em WebP.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={COLABORADOR_FOTO_ACCEPT}
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
            {uploading ? "Enviando…" : temFotoCustom ? "Trocar foto" : "Enviar foto"}
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
