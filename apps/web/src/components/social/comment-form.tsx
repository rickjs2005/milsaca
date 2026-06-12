"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { createComment, type SocialFormState } from "@/lib/social/actions";

/** Form de comentário — limpa o campo quando a action confirma. */
export function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<SocialFormState, FormData>(
    createComment,
    null,
  );

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="post_id" value={postId} />
      <div className="flex items-start gap-2">
        <textarea
          name="body"
          rows={2}
          required
          maxLength={1000}
          placeholder="Escreva um comentário…"
          className="min-w-0 flex-1 resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-body-sm text-milsaca-preto placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <SubmitButton size="sm" pendingLabel="Enviando...">
          Comentar
        </SubmitButton>
      </div>
      {state && !state.ok && state.error ? (
        <p className="rounded-md bg-danger-50 px-3 py-2 text-body-sm text-danger-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
