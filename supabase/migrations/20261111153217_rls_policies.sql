-- Snip · Phase 2 · Row Level Security
-- Every table has RLS on. Browser roles only ever see rows of businesses they own.
-- The worker, Edge Functions and server routes use the secret key (service_role), which
-- bypasses RLS, so those writes are deliberately not granted to `authenticated` here.

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.brand_kits enable row level security;
alter table public.social_accounts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.templates enable row level security;
alter table public.posts enable row level security;
alter table public.slides enable row level security;
alter table public.reels enable row level security;
alter table public.shots enable row level security;
alter table public.clips enable row level security;
alter table public.timeline_items enable row level security;
alter table public.schedules enable row level security;
alter table public.post_insights enable row level security;
alter table public.jobs enable row level security;
alter table public.assets enable row level security;

-- Defence in depth: signed-out visitors get nothing from any Snip table.
revoke all on public.users, public.businesses, public.brand_kits, public.social_accounts, public.conversations, public.messages, public.templates, public.posts, public.slides, public.reels, public.shots, public.clips, public.timeline_items, public.schedules, public.post_insights, public.jobs, public.assets from anon;

-- users: a person can read and edit only their own profile
create policy "users: read own" on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy "users: update own" on public.users
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- businesses: owner has full control
create policy "businesses: read own" on public.businesses
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "businesses: create own" on public.businesses
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "businesses: update own" on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "businesses: delete own" on public.businesses
  for delete to authenticated using (owner_id = (select auth.uid()));

-- brand_kits: created automatically with the business; owner reads and edits
create policy "brand_kits: read own" on public.brand_kits
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "brand_kits: update own" on public.brand_kits
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));

-- Owner-scoped tables with full create/read/update/delete
create policy "conversations: read own" on public.conversations
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "conversations: create own" on public.conversations
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "conversations: update own" on public.conversations
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "conversations: delete own" on public.conversations
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "messages: read own" on public.messages
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "messages: create own" on public.messages
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "messages: update own" on public.messages
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "messages: delete own" on public.messages
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "posts: read own" on public.posts
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "posts: create own" on public.posts
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "posts: update own" on public.posts
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "posts: delete own" on public.posts
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "slides: read own" on public.slides
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "slides: create own" on public.slides
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "slides: update own" on public.slides
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "slides: delete own" on public.slides
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "reels: read own" on public.reels
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "reels: create own" on public.reels
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "reels: update own" on public.reels
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "reels: delete own" on public.reels
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "shots: read own" on public.shots
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "shots: create own" on public.shots
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "shots: update own" on public.shots
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "shots: delete own" on public.shots
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "clips: read own" on public.clips
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "clips: create own" on public.clips
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "clips: update own" on public.clips
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "clips: delete own" on public.clips
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "timeline_items: read own" on public.timeline_items
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "timeline_items: create own" on public.timeline_items
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "timeline_items: update own" on public.timeline_items
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "timeline_items: delete own" on public.timeline_items
  for delete to authenticated using (business_id in (select private.my_business_ids()));

create policy "assets: read own" on public.assets
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "assets: create own" on public.assets
  for insert to authenticated with check (business_id in (select private.my_business_ids()));
create policy "assets: update own" on public.assets
  for update to authenticated using (business_id in (select private.my_business_ids())) with check (business_id in (select private.my_business_ids()));
create policy "assets: delete own" on public.assets
  for delete to authenticated using (business_id in (select private.my_business_ids()));

-- social_accounts: read-only for owners. Rows are written by the OAuth callback (server)
-- and removed with public.disconnect_social_account(). The Vault reference column is not
-- granted to browser roles at all.
create policy "social_accounts: read own" on public.social_accounts
  for select to authenticated using (business_id in (select private.my_business_ids()));
revoke all on public.social_accounts from authenticated;
grant select (id, business_id, platform, external_id, handle, token_expires_at, status, created_at, updated_at)
  on public.social_accounts to authenticated;

-- templates: everyone signed in can read system templates; businesses manage their own
create policy "templates: read system and own" on public.templates
  for select to authenticated using (is_system or business_id in (select private.my_business_ids()));
create policy "templates: create own" on public.templates
  for insert to authenticated with check (not is_system and business_id in (select private.my_business_ids()));
create policy "templates: update own" on public.templates
  for update to authenticated
  using (not is_system and business_id in (select private.my_business_ids())) with check (not is_system and business_id in (select private.my_business_ids()));
create policy "templates: delete own" on public.templates
  for delete to authenticated using (not is_system and business_id in (select private.my_business_ids()));

-- schedules: owners schedule, reschedule and cancel; only the publisher moves a post
-- past 'pending'
create policy "schedules: read own" on public.schedules
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "schedules: create own" on public.schedules
  for insert to authenticated
  with check (business_id in (select private.my_business_ids()) and status = 'pending' and attempts = 0 and external_post_id is null);
create policy "schedules: reschedule own" on public.schedules
  for update to authenticated
  using (business_id in (select private.my_business_ids()) and status in ('pending', 'failed'))
  with check (business_id in (select private.my_business_ids()) and status = 'pending');
create policy "schedules: cancel own" on public.schedules
  for delete to authenticated using (business_id in (select private.my_business_ids()) and status in ('pending', 'failed'));

-- post_insights: written by the daily fetcher; owners read
create policy "post_insights: read own" on public.post_insights
  for select to authenticated using (business_id in (select private.my_business_ids()));

-- jobs: owners can queue work and watch it; only workers change status
create policy "jobs: read own" on public.jobs
  for select to authenticated using (business_id in (select private.my_business_ids()));
create policy "jobs: queue own" on public.jobs
  for insert to authenticated
  with check (
    business_id in (select private.my_business_ids())
    and kind in ('render_carousel', 'edit_reel', 'transcribe')
    and status = 'pending' and attempts = 0 and locked_at is null and error is null
  );
