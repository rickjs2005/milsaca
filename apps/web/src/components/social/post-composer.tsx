"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Clapperboard, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { createPost, type SocialFormState } from "@/lib/social/actions";
import { SocialAvatar } from "./avatar";

/**
 * Composer do feed: texto + foto (JPG/PNG/WebP até 5 MB) ou vídeo
 * (MP4/WebM/MOV até 50 MB) opcionais.
 * Usa useActionState pra limpar o form só quando a action confirma — em
 * erro o texto fica preservado com a mensagem inline.
 */
export function PostComposer({
  nome,
  avatarUrl,
}: {
  nome: string;
  avatarUrl: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, formAction] = useActionState<SocialFormState, FormData>(
    createPost,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setFileName(null);
    }
  }, [state]);

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  }

  return (
    <Card>
      <CardContent className="p-card pt-card">
        <form ref={formRef} action={formAction} className="flex gap-3">
          <SocialAvatar nome={nome} avatarUrl={avatarUrl} />
          <div className="min-w-0 flex-1 space-y-3">
            <textarea
              name="body"
              rows={3}
              required
              maxLength={2000}
              placeholder="Compartilhe novidades da lavoura, do mercado ou da sua corretora…"
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-preto placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {state && !state.ok && state.error ? (
              <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-body-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-milsaca-cafezal">
                  <Clapperboard aria-hidden className="h-4 w-4" />
                  Foto ou vídeo
                  <input
                    ref={fileRef}
                    type="file"
                    name="midia"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="sr-only"
                    onChange={(e) =>
                      setFileName(e.target.files?.[0]?.name ?? null)
                    }
                  />
                </label>
                {fileName ? (
                  <span className="flex min-w-0 items-center gap-1 text-caption text-neutral-600">
                    <span className="truncate">{fileName}</span>
                    <button
                      type="button"
                      onClick={clearFile}
                      aria-label="Remover foto"
                      className="rounded-full p-0.5 hover:bg-neutral-100"
                    >
                      <X aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>
              <SubmitButton size="sm" pendingLabel="Publicando...">
                Publicar
              </SubmitButton>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
