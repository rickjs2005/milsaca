-- =================================================================
-- Milsaca — Notificações vivas
-- Data: 2026-05-19
-- =================================================================
-- 1. Adiciona valores ao enum notification_kind: entrega, pagamento.
-- 2. Permite corretora inserir notification pra produtor envolvido
--    em algum lead/contrato/entrega da própria corretora.
--
-- Antes: só admin inseria (notifications_admin_insert).
-- Agora: corretora também pode, restrita ao seu próprio tenant.
-- =================================================================

-- 1) Enum: novos valores
alter type public.notification_kind add value if not exists 'entrega';
alter type public.notification_kind add value if not exists 'pagamento';

-- 2) Policy: corretora pode notificar produtor envolvido
--
-- Critério: o user_id alvo da notification precisa ser produtor de algum
-- lead, contrato OU entrega cuja corretora_id = current_corretora().
-- Isso impede corretora notificar produtores que não fazem parte do tenant.
create policy "notifications_corretora_insert_envolvido"
  on public.notifications for insert
  with check (
    public.is_corretora()
    and (
      exists (
        select 1 from public.leads l
        where l.produtor_id = notifications.user_id
          and l.corretora_id = public.current_corretora()
      )
      or exists (
        select 1 from public.contratos c
        where c.produtor_id = notifications.user_id
          and c.corretora_id = public.current_corretora()
      )
      or exists (
        select 1 from public.entregas e
        where e.produtor_id = notifications.user_id
          and e.corretora_id = public.current_corretora()
      )
    )
  );
