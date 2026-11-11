-- Snip · Phase 2 · Advisor fixes (additive only: nothing is dropped)
-- 1. Cover every composite foreign key (parent_id, business_id) with a matching index.
--    The older single-column indexes stay; they are small and can be dropped later from
--    the SQL editor if the "unused index" advisor flags them.
-- 2. Disconnecting an account deletes from Vault, so it runs server-side only: the
--    Next.js route checks ownership with the user's session, then calls this RPC with
--    the secret key.

create index if not exists messages_conversation_business_idx
  on public.messages (conversation_id, business_id, created_at);
create index if not exists posts_conversation_business_idx
  on public.posts (conversation_id, business_id);
create index if not exists slides_post_business_idx on public.slides (post_id, business_id);
create index if not exists reels_post_business_idx on public.reels (post_id, business_id);
create index if not exists shots_reel_business_idx on public.shots (reel_id, business_id);
create index if not exists clips_reel_business_idx on public.clips (reel_id, business_id);
create index if not exists clips_shot_business_idx on public.clips (shot_id, business_id);
create index if not exists timeline_items_reel_business_idx
  on public.timeline_items (reel_id, business_id);
create index if not exists timeline_items_clip_business_idx
  on public.timeline_items (clip_id, business_id);
create index if not exists schedules_post_business_idx
  on public.schedules (post_id, business_id);
create index if not exists schedules_account_business_idx
  on public.schedules (social_account_id, business_id);
create index if not exists post_insights_schedule_business_idx
  on public.post_insights (schedule_id, business_id);

revoke execute on function public.disconnect_social_account(uuid) from authenticated;
