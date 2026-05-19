-- =================================================================
-- Milsaca — rate limiting backing store
-- Data: 2026-05-19
-- =================================================================
-- Sem Upstash/Redis externo. Usamos Supabase mesmo como contador de
-- janela deslizante por (key, bucket). Não é o backend mais eficiente
-- pra rate-limit, mas:
--   - funciona em prod serverless (estado compartilhado)
--   - sem custo extra
--   - simples
--
-- Cada chave (ex.: "signin:rick@example.com" ou "wa-leads:1.2.3.4") tem
-- uma janela; se a contagem ultrapassar o limite, bloqueia.
--
-- Limpeza periódica via função check_and_increment_rate (deleta janelas
-- expiradas no próprio insert).
-- =================================================================

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limits_key_idx
  on public.rate_limits (key);
create index if not exists rate_limits_window_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- Ninguém lê/escreve direto. Apenas a função SECURITY DEFINER
-- check_and_increment_rate manipula a tabela.
revoke all on public.rate_limits from anon, authenticated;

-- =================================================================
-- check_and_increment_rate(key, limit, window_seconds)
-- =================================================================
-- Retorna jsonb:
--   { allowed: boolean, hits: int, retry_after_seconds: int }
--
-- - Calcula janela atual = now() truncado em múltiplos de window_seconds
-- - Limpa entradas expiradas (>2x window pra trás)
-- - Faz upsert atômico do contador
-- - Compara com limit
-- =================================================================
create or replace function public.check_and_increment_rate(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_hits int;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return jsonb_build_object('allowed', true, 'hits', 0, 'retry_after_seconds', 0);
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  -- Limpa janelas antigas (housekeeping leve)
  delete from public.rate_limits
   where window_start < v_now - make_interval(secs => p_window_seconds * 2);

  -- Upsert atômico no contador da janela atual
  insert into public.rate_limits (key, window_start, hits)
    values (p_key, v_window_start, 1)
    on conflict (key, window_start)
    do update set hits = public.rate_limits.hits + 1
    returning hits into v_hits;

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits', v_hits,
    'retry_after_seconds', case
      when v_hits <= p_limit then 0
      else greatest(
        1,
        extract(epoch from v_window_start + make_interval(secs => p_window_seconds) - v_now)::int
      )
    end
  );
end;
$$;

revoke all on function public.check_and_increment_rate(text, int, int) from public;
grant execute on function public.check_and_increment_rate(text, int, int)
  to anon, authenticated;

comment on table public.rate_limits is
  'Backing store de rate limit. Manipulado só via check_and_increment_rate().';
comment on function public.check_and_increment_rate is
  'Incrementa contador atômico por chave/janela. Retorna allowed/hits/retry_after_seconds.';
