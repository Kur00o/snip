-- Snip · Phase 2 · Accounts, brands, connections, chat, templates
-- Conventions:
--   * uuid primary keys, timestamptz everywhere, created_at on every table.
--   * Every table that belongs to a brand carries business_id (denormalised on child
--     tables) so RLS is a single indexed check. Composite foreign keys
--     (child.parent_id, child.business_id) -> parent(id, business_id) guarantee a child
--     can never point at another business's parent row.

-- ---------------------------------------------------------------------------
-- users: one profile row per auth user, created by trigger on sign-up
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.users is 'Profile mirrored from auth.users (id from Supabase Auth).';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- businesses: one per brand
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text,
  target_audience text,
  goals text,
  city text,
  tone text,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.businesses.category is 'e.g. cafe, salon, creator';
comment on column public.businesses.tone is 'e.g. friendly, bold, premium';
create index businesses_owner_id_idx on public.businesses (owner_id);

-- RLS helpers. Return the caller's business ids once per statement (fast "in (select …)").
create or replace function private.my_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.businesses b where b.owner_id = (select auth.uid());
$$;

create or replace function private.my_business_folders()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select b.id::text from public.businesses b where b.owner_id = (select auth.uid());
$$;

revoke all on function private.my_business_ids() from public;
revoke all on function private.my_business_folders() from public;
grant execute on function private.my_business_ids() to authenticated, service_role;
grant execute on function private.my_business_folders() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- brand_kits: exactly one per business (auto-created)
-- ---------------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  primary_color text not null default '#0F9D8F' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  heading_font text,
  body_font text,
  logo_path text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.brand_kits.logo_path is 'Storage path in the brand-assets bucket: <business_id>/logo.png';
comment on column public.brand_kits.extra is 'Agent context: voice, banned words, do/don''t lists';

create or replace function private.create_brand_kit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.brand_kits (business_id) values (new.id) on conflict (business_id) do nothing;
  return new;
end;
$$;

create trigger on_business_created
  after insert on public.businesses
  for each row execute function private.create_brand_kit();

-- ---------------------------------------------------------------------------
-- social_accounts: connected Instagram / Facebook / YouTube
-- OAuth tokens live in Supabase Vault; only the secret's id is stored here, and that
-- column is never granted to browser roles.
-- ---------------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'youtube')),
  external_id text not null,
  handle text,
  token_secret_id uuid,
  token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, platform, external_id),
  unique (id, business_id)
);
comment on column public.social_accounts.external_id is 'IG user id, Facebook page id or YouTube channel id';
comment on column public.social_accounts.token_secret_id is 'vault.secrets.id holding the OAuth token JSON';

-- ---------------------------------------------------------------------------
-- conversations and messages: chat threads with the agent
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);
create index conversations_business_id_idx on public.conversations (business_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  business_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text,
  tool_calls jsonb,
  model_used text check (model_used in ('gemini', 'nvidia', 'local')),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id)
    references public.conversations (id, business_id) on delete cascade
);
create index messages_conversation_id_idx on public.messages (conversation_id, created_at);
create index messages_business_id_idx on public.messages (business_id);

-- ---------------------------------------------------------------------------
-- templates: system templates (business_id null) and a business's own templates
-- ---------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('carousel', 'reel', 'thumbnail')),
  html_path text not null,
  slots jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_system = (business_id is null))
);
comment on column public.templates.html_path is 'Storage path in the templates bucket';
comment on column public.templates.slots is 'Editable fields: [{key, kind, label, maxChars, required}]';
create unique index templates_system_name_key on public.templates (name) where is_system;
create index templates_business_id_idx on public.templates (business_id);

-- updated_at triggers
create trigger set_updated_at before update on public.users
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.businesses
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.brand_kits
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.social_accounts
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.conversations
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function private.set_updated_at();
