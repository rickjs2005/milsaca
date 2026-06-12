-- 2026-06-12 — P0 da auditoria de pré-lançamento: fecha a injeção de escrita
-- cross-tenant em lead_events. A policy de INSERT validava só o corretora_id
-- do AUTOR; com o UUID de um lead alheio, dava pra inserir evento na timeline
-- de outra corretora (visível ao produtor dono do lead). Agora o lead_id
-- precisa pertencer ao tenant. (As actions addLeadComment/createProposta
-- também passaram a validar posse — defesa nas duas camadas.)
--
-- Quem NÃO quebra: produtor (contraproposta/aceite escrevem via RPCs
-- SECURITY DEFINER, que não passam por RLS) e admin (ramo is_admin()).

drop policy if exists lead_events_insert on public.lead_events;

create policy lead_events_insert on public.lead_events
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      corretora_id = public.current_corretora()
      and exists (
        select 1 from public.leads l
        where l.id = lead_id
          and l.corretora_id = public.current_corretora()
      )
    )
  );
