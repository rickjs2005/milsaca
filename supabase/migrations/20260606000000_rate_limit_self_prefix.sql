-- =================================================================
-- Milsaca — rate limit não-spoofável por user autenticado
-- Data: 2026-05-20
-- =================================================================
-- BUG fechado:
--   check_and_increment_rate(text, int, int) aceitava p_key arbitrário
--   de qualquer authenticated. Cliente malicioso podia chamar com
--   p_key='signin:vitima@x.com' em loop e exaurir a janela contra a
--   vítima, causando lockout de signin.
--
-- FIX:
--   Se o caller está autenticado, o p_key é forçado a um namespace
--   próprio (`auth:<uid>:<p_key>`) antes de incrementar. Quem é anon
--   (signin pre-auth, signup) continua usando p_key livre — é necessário
--   pra rate-limit por email no signin (a vítima ainda não tem sessão
--   válida quando o atacante tenta brute force).
--
-- Impacto na UX:
--   - signin com user já logado: rate limit fica por uid (não por email).
--     Sem regressão real, pq se já tem sessão não passa por signin
--     novamente.
--   - wa-leads: cada user tem bucket próprio (perde rate por IP, mas
--     ganha proteção contra spoofing). Trade-off aceitável — limite
--     existia pra antifraud de UX, não pra defesa contra DoS.
--   - signup: chamado anon (pre-auth), continua usando IP hash. OK.
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
  v_uid uuid := auth.uid();
  v_key text := p_key;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return jsonb_build_object('allowed', true, 'hits', 0, 'retry_after_seconds', 0);
  end if;

  -- Se caller é authenticated, namespaceia a chave pelo uid pra
  -- impedir spoofing cross-user. Anon (signin/signup pre-auth) usa
  -- p_key livre.
  if v_uid is not null then
    v_key := 'auth:' || v_uid::text || ':' || p_key;
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  -- Limpa janelas antigas (housekeeping leve)
  delete from public.rate_limits
   where window_start < v_now - make_interval(secs => p_window_seconds * 2);

  -- Upsert atômico no contador da janela atual
  insert into public.rate_limits (key, window_start, hits)
    values (v_key, v_window_start, 1)
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

comment on function public.check_and_increment_rate is
  'Incrementa contador atômico por chave/janela. Authenticated tem chave forçada pra auth:<uid>:<p_key> (anti-spoof). Anon usa p_key livre.';
