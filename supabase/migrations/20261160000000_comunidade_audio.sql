-- 2026-06-12 — Comunidade v1.2: posts de ÁUDIO (zap de voz no feed).
-- Público rural mais velho tem pouca leitura: grava o áudio direto no
-- composer e publica SEM precisar escrever. Texto vira opcional — a regra
-- passa a ser "post precisa de conteúdo" (texto OU mídia).

alter table public.social_posts
  add column if not exists audio_path text;

-- texto deixa de ser obrigatório…
alter table public.social_posts
  alter column body drop not null;

-- …mas o post não pode ser vazio: texto (1–2000) OU alguma mídia.
alter table public.social_posts
  drop constraint if exists social_posts_body_len;

alter table public.social_posts
  add constraint social_posts_conteudo check (
    (body is null or char_length(btrim(body)) between 1 and 2000)
    and (
      (body is not null and char_length(btrim(body)) > 0)
      or image_path is not null
      or video_path is not null
      or audio_path is not null
    )
  );
