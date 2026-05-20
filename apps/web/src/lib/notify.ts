import { createClient } from "@milsaca/db/web/server";
import type { Database, Json } from "@milsaca/types/database";

type NotificationKind = Database["public"]["Enums"]["notification_kind"];

/**
 * Insere uma notification pra um user específico. Falha silenciosa: erro só
 * loga (não interrompe o fluxo da server action principal).
 *
 * RLS controla quem pode inserir — em geral, corretora notifica produtor
 * envolvido em algum lead/contrato/entrega dela (ver migration
 * 20260519000000_notifications_vivas.sql).
 */
export async function notify(params: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    kind: params.kind,
    title: params.title,
    body: params.body ?? null,
    data: (params.data ?? {}) as Json,
  });

  if (error) {
    // Em prod: só código/mensagem do erro + kind (não-PII).
    // Em dev: detalhes pra debug, incluindo userId.
    if (process.env.NODE_ENV !== "production") {
      console.error("[notify] falha ao inserir notification:", error.message, {
        userId: params.userId,
        kind: params.kind,
      });
    } else {
      console.error("[notify] falha:", error.message, { kind: params.kind });
    }
  }
}
