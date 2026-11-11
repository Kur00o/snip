-- Snip · Phase 2 · Advisor fixes
-- 1. Cover every composite foreign key (parent_id, business_id) with a matching index.
-- 2. Disconnecting an account deletes from Vault, so it runs server-side only: the
--    Next.js route checks ownership with the user's session, then calls this RPC with
--    the secret key.

drop index if exists public.messages_conversation_id_idx;
create index messages_conversation_business_idx
  on public.messages (conversation_id, business_id, created_at);

drop index if exists public.posts_conversation_id_idx;
create index posts_conversation_business_idx on public.posts (conversation_id, business_id);

create index slides_post_business_idx on public.slides (post_id, business_id);
create index reels_post_business_idx on public.reels (post_id, business_id);
create index shots_reel_business_idx on public.shots (reel_id, business_id);

drop index if exists public.clips_reel_id_idx;
drop index if exists public.clips_shot_id_idx;
create index clips_reel_business_idx on public.clips (reel_id, business_id);
create index clips_shot_business_idx on public.clips (shot_id, business_id);

drop index if exists public.timeline_items_clip_id_idx;
create index timeline_items_reel_business_idx on public.timeline_items (reel_id, business_id);
create index timeline_items_clip_business_idx on public.timeline_items (clip_id, business_id);

drop index if exists public.schedules_post_id_idx;
drop index if exists public.schedules_social_account_id_idx;
create index schedules_post_business_idx on public.schedules (post_id, business_id);
create index schedules_account_business_idx on public.schedules (social_account_id, business_id);

create index post_insights_schedule_business_idx on public.post_insights (schedule_id, business_id);

revoke execute on function public.disconnect_social_account(uuid) from authenticated;
