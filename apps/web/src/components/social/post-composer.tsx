"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Clapperboard, Mic, Square, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";
import { createPost, type SocialFormState } from "@/lib/social/actions";
import { SocialAvatar } from "./avatar";

const AUDIO_MAX_SEGUNDOS = 120;

/**
 * Composer do feed: texto opcional + foto/vídeo (arquivo) + ÁUDIO gravado
 * na hora (MediaRecorder, estilo zap de voz — pensado pra quem não lê:
 * dá pra publicar só com o áudio, sem digitar nada).
 *
 * useActionState limpa o form só quando a action confirma — em erro o
 * conteúdo fica preservado com a mensagem inline.
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

  // ── gravação de áudio ──
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recErro, setRecErro] = useState<string | null>(null);

  const [state, formAction] = useActionState<SocialFormState, FormData>(
    createPost,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setFileName(null);
      limparAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- limparAudio é estável o bastante aqui
  }, [state]);

  // cleanup ao desmontar (objectURL + stream)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só no unmount
  }, []);

  async function comecarGravacao() {
    setRecErro(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setRecErro(
        "Não consegui acessar o microfone. Libere a permissão no navegador.",
      );
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4" // Safari/iPhone
        : "";
    const rec = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, {
        type: rec.mimeType || "audio/webm",
      });
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
    };
    recorderRef.current = rec;
    rec.start();
    setGravando(true);
    setSegundos(0);
    timerRef.current = setInterval(() => {
      setSegundos((s) => {
        if (s + 1 >= AUDIO_MAX_SEGUNDOS) pararGravacao();
        return s + 1;
      });
    }, 1000);
  }

  function pararGravacao() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setGravando(false);
  }

  function limparAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setSegundos(0);
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  }

  // anexa o áudio gravado ao FormData antes de despachar a action
  function publicar(fd: FormData) {
    if (audioBlob) {
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      fd.set(
        "audio",
        new File([audioBlob], `gravacao.${ext}`, { type: audioBlob.type }),
      );
    }
    formAction(fd);
  }

  const mmss = `${String(Math.floor(segundos / 60)).padStart(1, "0")}:${String(segundos % 60).padStart(2, "0")}`;

  return (
    <Card>
      <CardContent className="p-card pt-card">
        <form ref={formRef} action={publicar} className="flex gap-3">
          <SocialAvatar nome={nome} avatarUrl={avatarUrl} />
          <div className="min-w-0 flex-1 space-y-3">
            <textarea
              name="body"
              rows={3}
              maxLength={2000}
              placeholder="Escreva algo ou grave um áudio — novidades da lavoura, do mercado, do serviço…"
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-preto placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {/* Áudio gravado: preview + remover */}
            {audioUrl && !gravando ? (
              <div className="flex items-center gap-2 rounded-md bg-milsaca-cream/60 p-2">
                <Mic aria-hidden className="h-4 w-4 shrink-0 text-milsaca-dourado" />
                {/* eslint-disable-next-line jsx-a11y/media-has-caption -- gravação do usuário */}
                <audio src={audioUrl} controls className="h-10 min-w-0 flex-1" />
                <button
                  type="button"
                  onClick={limparAudio}
                  aria-label="Descartar áudio"
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-danger-600"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {(state && !state.ok && state.error) || recErro ? (
              <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
                {recErro ?? state?.error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {/* Gravar/parar áudio */}
                {gravando ? (
                  <button
                    type="button"
                    onClick={pararGravacao}
                    aria-label="Parar gravação"
                    className="inline-flex items-center gap-1.5 rounded-pill bg-danger-50 px-2.5 py-1.5 text-body-sm font-medium text-danger-700"
                  >
                    <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
                    <span className="tabular-nums">{mmss}</span>
                    <span
                      aria-hidden
                      className="h-2 w-2 animate-pulse rounded-full bg-danger-500"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={comecarGravacao}
                    aria-label="Gravar áudio"
                    disabled={Boolean(audioBlob)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-body-sm font-medium transition-colors",
                      audioBlob
                        ? "cursor-not-allowed text-neutral-400"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-milsaca-cafezal",
                    )}
                  >
                    <Mic aria-hidden className="h-4 w-4" />
                    Áudio
                  </button>
                )}

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
                      aria-label="Remover arquivo"
                      className="rounded-full p-0.5 hover:bg-neutral-100"
                    >
                      <X aria-hidden className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : null}
              </div>
              <SubmitButton
                size="sm"
                pendingLabel="Publicando..."
                disabled={gravando}
              >
                Publicar
              </SubmitButton>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
