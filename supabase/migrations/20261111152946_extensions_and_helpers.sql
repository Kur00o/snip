-- Snip · Phase 2 · Extensions and private helpers
-- The `private` schema is NOT exposed through the Data API, so nothing in it can be
-- called from the browser. RLS policies may still call its functions.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- supabase_vault and pgcrypto are installed by default on Supabase.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Keep updated_at honest on every UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
