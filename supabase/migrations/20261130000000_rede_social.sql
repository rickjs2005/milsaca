-- 2026-06-12 — Rede social "Comunidade": posts (texto+foto), curtidas, comentários, seguidores.
-- Qualquer usuário ativo (produtor ou corretora) publica; conteúdo visível a todos os autenticados.
-- Contadores denormalizados por trigger; notificações in-app por trigger (security definer);
-- view social_perfis expõe só os campos públicos do profile (a RLS de profiles é restrita).

-- ─── Enum de notificação ───────────────────────────────────────────────
alter type public.notification_kind add value if not exists 'social';

-- ─── Tabelas ───────────────────────────────────────────────────────────
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null constraint social_posts_body_len
    check (char_length(btrim(body)) between 1 and 2000),
  image_path text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_posts_author_idx on public.social_posts (author_id, created_at desc);
create index social_posts_created_idx on public.social_posts (created_at desc);

create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row execute function public.tg_set_updated_at();

create table public.social_likes (
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index social_likes_user_idx on public.social_likes (user_id);

create table public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null constraint social_comments_body_len
    check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index social_comments_post_idx on public.social_comments (post_id, created_at);
create index social_comments_author_idx on public.social_comments (author_id);

create table public.social_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint social_follows_nao_segue_a_si check (follower_id <> followed_id)
);

create index social_follows_followed_idx on public.social_follows (followed_id);

-- ─── RLS ───────────────────────────────────────────────────────────────
alter table public.social_posts enable row level security;
alter table public.social_likes enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_follows enable row level security;

-- só usuário ATIVO e não-deletado cria conteúdo (a própria linha do profile é visível ao dono)
create or replace function public.social_pode_publicar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'ativo'
      and p.deleted_at is null
  );
$$;

create policy social_posts_select on public.social_posts
  for select to authenticated using (true);

create policy social_posts_insert on public.social_posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.social_pode_publicar());

create policy social_posts_update on public.social_posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy social_posts_delete on public.social_posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

create policy social_likes_select on public.social_likes
  for select to authenticated using (true);

create policy social_likes_insert on public.social_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.social_pode_publicar());

create policy social_likes_delete on public.social_likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy social_comments_select on public.social_comments
  for select to authenticated using (true);

create policy social_comments_insert on public.social_comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.social_pode_publicar());

-- autor do comentário, autor do post (modera o próprio post) ou admin
create policy social_comments_delete on public.social_comments
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.social_posts sp
      where sp.id = post_id and sp.author_id = (select auth.uid())
    )
    or public.is_admin()
  );

create policy social_follows_select on public.social_follows
  for select to authenticated using (true);

create policy social_follows_insert on public.social_follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and public.social_pode_publicar());

create policy social_follows_delete on public.social_follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

-- ─── Contadores denormalizados ─────────────────────────────────────────
-- security definer: quem curte/comenta não tem UPDATE no post alheio via RLS.
create or replace function public.tg_social_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.social_posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  end if;
  update public.social_posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger social_likes_count
  after insert or delete on public.social_likes
  for each row execute function public.tg_social_likes_count();

create or replace function public.tg_social_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.social_posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  end if;
  update public.social_posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger social_comments_count
  after insert or delete on public.social_comments
  for each row execute function public.tg_social_comments_count();

-- ─── Notificações in-app ───────────────────────────────────────────────
-- Só sininho, SEM WhatsApp de propósito: interação social não pode virar spam.
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
  select coalesce(full_name, 'Alguém') into v_nome from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_autor, 'social', 'Curtiram sua publicação',
    v_nome || ' curtiu sua publicação na Comunidade.',
    jsonb_build_object('post_id', new.post_id)
  );
  return new;
end;
$$;

create trigger social_likes_notify
  after insert on public.social_likes
  for each row execute function public.tg_social_notify_like();

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
  select coalesce(full_name, 'Alguém') into v_nome from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    v_autor, 'social', 'Novo comentário',
    v_nome || ' comentou na sua publicação.',
    jsonb_build_object('post_id', new.post_id, 'comment_id', new.id)
  );
  return new;
end;
$$;

create trigger social_comments_notify
  after insert on public.social_comments
  for each row execute function public.tg_social_notify_comment();

create or replace function public.tg_social_notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  select coalesce(full_name, 'Alguém') into v_nome from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, kind, title, body, data)
  values (
    new.followed_id, 'social', 'Novo seguidor',
    v_nome || ' começou a seguir você na Comunidade.',
    jsonb_build_object('perfil_id', new.follower_id)
  );
  return new;
end;
$$;

create trigger social_follows_notify
  after insert on public.social_follows
  for each row execute function public.tg_social_notify_follow();

-- ─── Perfis públicos ───────────────────────────────────────────────────
-- A RLS de profiles só deixa ver o próprio + produtores envolvidos com a corretora.
-- A view (security definer por padrão, dona postgres) expõe SÓ campos públicos de
-- perfis ativos — mesmo padrão aceito das demais views definer do projeto.
create view public.social_perfis as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.roles,
  p.corretora_id,
  c.name as corretora_nome,
  p.created_at
from public.profiles p
left join public.corretoras c on c.id = p.corretora_id
where p.status = 'ativo' and p.deleted_at is null;

grant select on public.social_perfis to authenticated;

-- ─── Storage: imagens de post ──────────────────────────────────────────
-- Bucket PÚBLICO (leitura): a imagem acompanha o post, visível a todos.
-- Escrita só na própria pasta: social/{user_id}/{arquivo}.
insert into storage.buckets (id, name, public)
values ('social', 'social', true)
on conflict (id) do nothing;

create policy social_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'social'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy social_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'social'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
