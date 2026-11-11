-- Snip · Phase 2 · Vault-backed OAuth tokens and the job queue RPCs
-- Functions in `public` are reachable through the Data API, so each one either checks
-- ownership itself or is executable by service_role only.

-- ---------------------------------------------------------------------------
-- OAuth tokens in Supabase Vault (server only)
-- ---------------------------------------------------------------------------

-- Store or rotate a connected account's token (JSON string with access/refresh tokens).
create or replace function public.set_social_token(
  p_account_id uuid,
  p_token text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select sa.token_secret_id into v_secret_id
  from public.social_accounts sa
  where sa.id = p_account_id
  for update;

  if not found then
    raise exception 'social account % not found', p_account_id using errcode = 'P0002';
  end if;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_token,
      'social_token_' || p_account_id::text,
      'OAuth token for social_accounts ' || p_account_id::text
    );
  else
    perform vault.update_secret(v_secret_id, p_token);
  end if;

  update public.social_accounts
  set token_secret_id = v_secret_id,
      token_expires_at = p_expires_at,
      status = 'active'
  where id = p_account_id;
end;
$$;

-- Read a decrypted token. Used by the publish Edge Function and insights fetcher.
create or replace function public.get_social_token(p_account_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.social_accounts sa
  join vault.decrypted_secrets ds on ds.id = sa.token_secret_id
  where sa.id = p_account_id;
$$;

revoke all on function public.set_social_token(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_social_token(uuid) from public, anon, authenticated;
grant execute on function public.set_social_token(uuid, text, timestamptz) to service_role;
grant execute on function public.get_social_token(uuid) to service_role;

-- Owner-callable: disconnect an account. Deletes the token from Vault and marks the
-- account revoked (history and insights are kept).
create or replace function public.disconnect_social_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select sa.token_secret_id into v_secret_id
  from public.social_accounts sa
  where sa.id = p_account_id
    and (
      (select auth.role()) = 'service_role'
      or sa.business_id in (select private.my_business_ids())
    )
  for update;

  if not found then
    raise exception 'social account % not found', p_account_id using errcode = 'P0002';
  end if;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;

  update public.social_accounts
  set token_secret_id = null, token_expires_at = null, status = 'revoked'
  where id = p_account_id;

  update public.schedules
  set status = 'failed', error = 'Account disconnected'
  where social_account_id = p_account_id and status = 'pending';
end;
$$;

revoke all on function public.disconnect_social_account(uuid) from public, anon;
grant execute on function public.disconnect_social_account(uuid) to authenticated, service_role;

-- When a business (and so its accounts) is deleted, remove the Vault secrets too.
create or replace function private.delete_social_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.token_secret_id is not null then
    delete from vault.secrets where id = old.token_secret_id;
  end if;
  return old;
end;
$$;

create trigger on_social_account_deleted
  after delete on public.social_accounts
  for each row execute function private.delete_social_token();

-- ---------------------------------------------------------------------------
-- Job queue (render worker)
-- ---------------------------------------------------------------------------

-- Atomically claim the oldest claimable job of the given kinds.
-- A 'running' job whose lock is older than p_stale_after is assumed dead and re-claimed.
create or replace function public.claim_job(
  p_kinds text[],
  p_stale_after interval default interval '15 minutes',
  p_max_attempts int default 3
)
returns setof public.jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.jobs j
  set status = 'running',
      locked_at = now(),
      attempts = j.attempts + 1
  where j.id = (
    select q.id
    from public.jobs q
    where q.kind = any (p_kinds)
      and q.attempts < p_max_attempts
      and (
        q.status = 'pending'
        or (q.status = 'running' and q.locked_at < now() - p_stale_after)
      )
    order by q.created_at
    for update skip locked
    limit 1
  )
  returning j.*;
end;
$$;

-- Finish a claimed job. With an error it goes back to 'pending' for a retry until
-- p_max_attempts is reached, then 'failed'.
create or replace function public.complete_job(
  p_job_id uuid,
  p_error text default null,
  p_max_attempts int default 3
)
returns public.jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs;
begin
  update public.jobs j
  set status = case
        when p_error is null then 'done'
        when j.attempts >= p_max_attempts then 'failed'
        else 'pending'
      end,
      error = p_error,
      locked_at = null
  where j.id = p_job_id and j.status = 'running'
  returning j.* into v_job;

  if v_job.id is null then
    raise exception 'job % is not running', p_job_id using errcode = 'P0002';
  end if;
  return v_job;
end;
$$;

revoke all on function public.claim_job(text[], interval, int) from public, anon, authenticated;
revoke all on function public.complete_job(uuid, text, int) from public, anon, authenticated;
grant execute on function public.claim_job(text[], interval, int) to service_role;
grant execute on function public.complete_job(uuid, text, int) to service_role;
