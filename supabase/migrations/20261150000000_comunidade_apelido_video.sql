-- 2026-06-12 — Comunidade v1.1: apelido (nome social) + vídeo nos posts.
-- Público rural: muita gente não lê — vídeo é o formato natural; e o nome na
-- Comunidade pode ser o apelido ("Zé do Café"), enquanto contrato/cadastro
-- seguem com o nome registrado (full_name intocado).

-- ─── Apelido no profile ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists apelido text
  constraint profiles_apelido_len
    check (apelido is null or char_length(btrim(apelido)) between 2 and 40);

-- ─── Vídeo no post (mesmo bucket público `social`) ─────────────────────
alter table public.social_posts
  add column if not exists video_path text;

-- ─── View de perfis: expõe o apelido (coluna nova no FIM, replace-safe) ─
create or replace view public.social_perfis as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.roles,
  p.corretora_id,
  c.name as corretora_nome,
  p.created_at,
  p.apelido
from public.profiles p
left join public.corretoras c on c.id = p.corretora_id
where p.status = 'ativo' and p.deleted_at is null;

-- ─── Notificações passam a usar o apelido quando houver ────────────────
create or replace function public.tg_social_notify_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid;
  v_nome text;
begin
  select author_id into v_autor from public.social_posts where id = new.post_id;
  if v_autor is null or v_autor = new.user_id then
    return new;
  end if;
  select coalesce(nullif(btrim(apelido), ''), full_name, 'Alguém')
    into v_nome from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_autor, 'social', 'Curtiram sua publicação',
    v_nome || ' curtiu sua publicação na Comunidade.',
    jsonb_build_object('post_id', new.post_id)
  );
  return new;
end;
$$;

create or replace function public.tg_social_notify_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_autor uuid;
  v_nome text;
begin
  select author_id into v_autor from public.social_posts where id = new.post_id;
  if v_autor is null or v_autor = new.author_id then
    return new;
  end if;
  select coalesce(nullif(btrim(apelido), ''), full_name, 'Alguém')
    into v_nome from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_autor, 'social', 'Novo comentário',
    v_nome || ' comentou na sua publicação.',
    jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
  );
  return new;
end;
$$;

create or replace function public.tg_social_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  select coalesce(nullif(btrim(apelido), ''), full_name, 'Alguém')
    into v_nome from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    new.followed_id, 'social', 'Novo seguidor',
    v_nome || ' começou a seguir você na Comunidade.',
    jsonb_build_object('perfil_id', new.follower_id)
  );
  return new;
end;
$$;
