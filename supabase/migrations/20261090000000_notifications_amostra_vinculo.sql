-- =================================================================
-- Milsaca — notifications: amostra como vínculo válido (Brief 3, Fase D)
-- Data: 2026-06-04
-- =================================================================
-- A policy notifications_insert exigia lead/contrato/entrega entre corretora e
-- produtor. Agora uma AMOSTRA endereçada à corretora também autoriza o aviso
-- (recebida / laudo+preço / recusa) aparecer na tela do produtor. Idempotente.
-- =================================================================
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
with check (
  is_admin() OR (
    is_corretora() AND (
      EXISTS (SELECT 1 FROM public.leads l WHERE l.produtor_id = notifications.user_id AND l.corretora_id = current_corretora())
      OR EXISTS (SELECT 1 FROM public.contratos c WHERE c.produtor_id = notifications.user_id AND c.corretora_id = current_corretora())
      OR EXISTS (SELECT 1 FROM public.entregas e WHERE e.produtor_id = notifications.user_id AND e.corretora_id = current_corretora())
      OR EXISTS (SELECT 1 FROM public.amostras a WHERE a.produtor_id = notifications.user_id AND a.corretora_id = current_corretora())
    )
  )
);
