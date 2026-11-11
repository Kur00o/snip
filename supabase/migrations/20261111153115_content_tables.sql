-- Snip · Phase 2 · Content, reels, publishing, analytics, queue, media library

-- ---------------------------------------------------------------------------
-- posts: every piece of content
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  conversation_id uuid,
  type text not null check (type in ('carousel', 'reel', 'single', 'short')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'scheduled', 'published', 'failed')),
  caption text,
  hashtags text[] not null default '{}',
  brief text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (conversation_id, business_id)
    references public.conversations (id, business_id) on delete set null (conversation_id)
);
comment on column public.posts.brief is 'The user prompt that started this post';
create index posts_business_id_idx on public.posts (business_id, created_at desc);
create index posts_template_id_idx on public.posts (template_id);
create index posts_conversation_id_idx on public.posts (conversation_id);

-- ---------------------------------------------------------------------------
-- slides: carousel slides
-- ---------------------------------------------------------------------------
create table public.slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  business_id uuid not null,
  position int not null check (position >= 0),
  headline text,
  body text,
  layout jsonb not null default '{}'::jsonb,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (post_id, business_id) references public.posts (id, business_id) on delete cascade,
  constraint slides_post_position_key unique (post_id, position) deferrable initially deferred
);
comment on column public.slides.image_path is 'Rendered PNG in the renders bucket';
create index slides_business_id_idx on public.slides (business_id);

-- ---------------------------------------------------------------------------
-- reels, shots, clips, timeline_items
-- ---------------------------------------------------------------------------
create table public.reels (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique,
  business_id uuid not null,
  script text,
  music_track text,
  target_seconds int check (target_seconds > 0),
  output_path text,
  subtitles_srt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (post_id, business_id) references public.posts (id, business_id) on delete cascade
);
comment on column public.reels.music_track is 'Royalty-free track id or path';
comment on column public.reels.output_path is 'Rendered MP4 in the renders bucket';
create index reels_business_id_idx on public.reels (business_id);

create table public.shots (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null,
  business_id uuid not null,
  position int not null check (position >= 0),
  description text,
  duration_sec double precision check (duration_sec > 0),
  framing text,
  tips text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (reel_id, business_id) references public.reels (id, business_id) on delete cascade,
  constraint shots_reel_position_key unique (reel_id, position) deferrable initially deferred
);
comment on column public.shots.framing is 'e.g. close-up, wide';
comment on column public.shots.tips is 'Lighting and angle tips';
create index shots_business_id_idx on public.shots (business_id);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null,
  business_id uuid not null,
  shot_id uuid,
  storage_path text not null,
  duration_sec double precision check (duration_sec >= 0),
  transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (reel_id, business_id) references public.reels (id, business_id) on delete cascade,
  foreign key (shot_id, business_id)
    references public.shots (id, business_id) on delete set null (shot_id)
);
comment on column public.clips.storage_path is 'Raw footage in the clips bucket';
create index clips_reel_id_idx on public.clips (reel_id);
create index clips_shot_id_idx on public.clips (shot_id);
create index clips_business_id_idx on public.clips (business_id);

create table public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null,
  business_id uuid not null,
  clip_id uuid not null,
  position int not null check (position >= 0),
  start_sec double precision not null default 0 check (start_sec >= 0),
  end_sec double precision,
  transition text,
  overlay_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_sec is null or end_sec > start_sec),
  foreign key (reel_id, business_id) references public.reels (id, business_id) on delete cascade,
  foreign key (clip_id, business_id) references public.clips (id, business_id) on delete cascade,
  constraint timeline_items_reel_position_key unique (reel_id, position) deferrable initially deferred
);
create index timeline_items_clip_id_idx on public.timeline_items (clip_id);
create index timeline_items_business_id_idx on public.timeline_items (business_id);

-- ---------------------------------------------------------------------------
-- schedules: publishing queue (driven by pg_cron + Edge Function)
-- ---------------------------------------------------------------------------
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  business_id uuid not null,
  social_account_id uuid not null,
  publish_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'publishing', 'done', 'failed')),
  external_post_id text,
  error text,
  attempts int not null default 0 check (attempts >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (post_id, business_id) references public.posts (id, business_id) on delete cascade,
  foreign key (social_account_id, business_id)
    references public.social_accounts (id, business_id) on delete cascade
);
create index schedules_post_id_idx on public.schedules (post_id);
create index schedules_social_account_id_idx on public.schedules (social_account_id);
create index schedules_business_id_idx on public.schedules (business_id, publish_at);
create index schedules_due_idx on public.schedules (publish_at) where status = 'pending';

-- ---------------------------------------------------------------------------
-- post_insights: daily metrics per published schedule
-- ---------------------------------------------------------------------------
create table public.post_insights (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null,
  business_id uuid not null,
  captured_on date not null default current_date,
  reach int,
  views int,
  likes int,
  comments int,
  shares int,
  saves int,
  watch_time_sec double precision,
  created_at timestamptz not null default now(),
  unique (schedule_id, captured_on),
  foreign key (schedule_id, business_id)
    references public.schedules (id, business_id) on delete cascade
);
create index post_insights_business_id_idx on public.post_insights (business_id, captured_on desc);

-- ---------------------------------------------------------------------------
-- jobs: render and publish queue. Workers claim with FOR UPDATE SKIP LOCKED.
-- ---------------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('render_carousel', 'edit_reel', 'transcribe', 'publish')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  attempts int not null default 0 check (attempts >= 0),
  error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_business_id_idx on public.jobs (business_id, created_at desc);
create index jobs_claimable_idx on public.jobs (kind, created_at) where status in ('pending', 'running');

-- ---------------------------------------------------------------------------
-- assets: media library
-- ---------------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('logo', 'photo', 'clip', 'render')),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index assets_business_id_idx on public.assets (business_id, kind);

-- updated_at triggers
create trigger set_updated_at before update on public.posts
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.slides
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.reels
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.shots
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.clips
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.timeline_items
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.schedules
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.jobs
  for each row execute function private.set_updated_at();
