-- Snip · RLS and RPC smoke test
-- Run in the Supabase SQL editor (or via the MCP execute_sql tool). Everything happens
-- inside one DO block that ends by raising 'ALL_TESTS_PASSED', which rolls back every
-- change, so it is safe to run against the real project. Any other error = a failed check.

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  biz_a uuid;
  biz_b uuid;
  post_a uuid;
  post_b uuid;
  conv_a uuid;
  acct uuid;
  sched uuid;
  n int;
  t text;
  j public.jobs;
begin
  -- Two people sign up
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values
    (a, 'asha@test.snip', '{"full_name": "Asha"}', 'authenticated', 'authenticated'),
    (b, 'ben@test.snip', '{}', 'authenticated', 'authenticated');
  select count(*) into n from public.users where id in (a, b);
  assert n = 2, 'profile rows are created on sign-up';

  -- Ben's brand (written as the server)
  insert into public.businesses (owner_id, name) values (b, 'Bean There') returning id into biz_b;
  insert into public.posts (business_id, type) values (biz_b, 'carousel') returning id into post_b;

  -- ---------------- Asha, signed in ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  insert into public.businesses (owner_id, name, category, city, tone)
  values (a, 'Chai Point', 'cafe', 'Pune', 'friendly')
  returning id into biz_a;

  select count(*) into n from public.businesses;
  assert n = 1, 'Asha sees only her business';
  select count(*) into n from public.brand_kits;
  assert n = 1, 'brand kit is auto-created and only hers is visible';
  select count(*) into n from public.posts;
  assert n = 0, 'Asha cannot see Ben''s posts';
  select count(*) into n from public.templates where is_system;
  assert n = 6, 'system templates are readable';

  insert into public.conversations (business_id, title) values (biz_a, 'First chat') returning id into conv_a;
  insert into public.messages (conversation_id, business_id, role, content)
  values (conv_a, biz_a, 'user', 'Make a carousel about our monsoon menu');
  insert into public.posts (business_id, conversation_id, type, hashtags)
  values (biz_a, conv_a, 'carousel', array['#punecafe']) returning id into post_a;
  insert into public.slides (post_id, business_id, position, headline)
  values (post_a, biz_a, 0, 'Monsoon menu is here');
  update public.brand_kits set primary_color = '#0F9D8F', heading_font = 'Inter' where business_id = biz_a;
  get diagnostics n = row_count;
  assert n = 1, 'Asha can edit her brand kit';

  begin
    insert into public.businesses (owner_id, name) values (b, 'Hijack');
    raise exception 'FAIL: created a business for someone else';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.slides (post_id, business_id, position) values (post_b, biz_a, 5);
    raise exception 'FAIL: attached a slide to another business''s post';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into public.slides (post_id, business_id, position) values (post_b, biz_b, 5);
    raise exception 'FAIL: wrote into another business';
  exception when insufficient_privilege then null;
  end;

  update public.posts set caption = 'pwned' where id = post_b;
  get diagnostics n = row_count;
  assert n = 0, 'Asha cannot update Ben''s post';

  begin
    insert into public.templates (name, kind, html_path, is_system) values ('Fake', 'carousel', 'x.html', true);
    raise exception 'FAIL: created a system template';
  exception when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.jobs (business_id, kind) values (biz_a, 'publish');
    raise exception 'FAIL: queued a publish job from the browser';
  exception when insufficient_privilege then null;
  end;

  insert into public.jobs (business_id, kind, payload)
  values (biz_a, 'render_carousel', jsonb_build_object('post_id', post_a));

  update public.jobs set status = 'done' where business_id = biz_a;
  get diagnostics n = row_count;
  assert n = 0, 'browser cannot change job status';

  begin
    select sa.token_secret_id::text into t from public.social_accounts sa limit 1;
    raise exception 'FAIL: token column is readable';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.get_social_token(gen_random_uuid());
    raise exception 'FAIL: browser can read tokens';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.claim_job(array['render_carousel']);
    raise exception 'FAIL: browser can claim jobs';
  exception when insufficient_privilege then null;
  end;

  -- ---------------- Server (service role) ----------------
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

  insert into public.social_accounts (business_id, platform, external_id, handle)
  values (biz_a, 'instagram', '17841400000000', '@chaipoint')
  returning id into acct;
  perform public.set_social_token(acct, '{"access_token":"first"}', now() + interval '60 days');
  assert public.get_social_token(acct) = '{"access_token":"first"}', 'Vault stores the token';
  perform public.set_social_token(acct, '{"access_token":"rotated"}');
  assert public.get_social_token(acct) = '{"access_token":"rotated"}', 'Vault rotates the token';

  insert into public.schedules (post_id, business_id, social_account_id, publish_at)
  values (post_a, biz_a, acct, now() + interval '1 day')
  returning id into sched;

  select * into j from public.claim_job(array['render_carousel']);
  assert j.status = 'running' and j.attempts = 1 and j.locked_at is not null, 'worker claims a job';
  select count(*) into n from public.claim_job(array['render_carousel']);
  assert n = 0, 'a running job is not claimed twice';
  perform public.complete_job(j.id, 'Chromium crashed');
  assert (select status from public.jobs where id = j.id) = 'pending', 'failed attempt is retried';
  select * into j from public.claim_job(array['render_carousel']);
  perform public.complete_job(j.id);
  assert (select status from public.jobs where id = j.id) = 'done', 'job completes';

  -- ---------------- Browsers cannot call the disconnect RPC directly ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.social_accounts;
  assert n = 0, 'Ben cannot see Asha''s connected account';
  begin
    perform public.disconnect_social_account(acct);
    raise exception 'FAIL: browser called disconnect directly';
  exception when insufficient_privilege or no_data_found then null;
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.social_accounts;
  assert n = 1, 'Asha sees her connected account';

  -- ---------------- Server disconnects it for Asha ----------------
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform public.disconnect_social_account(acct);

  assert (select status = 'revoked' and token_secret_id is null from public.social_accounts where id = acct),
    'account is revoked';
  assert not exists (select 1 from vault.secrets where name = 'social_token_' || acct::text),
    'token is deleted from Vault';
  assert (select status from public.schedules where id = sched) = 'failed',
    'pending posts for that account are failed';

  -- ---------------- Signed-out visitor ----------------
  perform set_config('role', 'anon', true);
  begin
    perform 1 from public.businesses;
    raise exception 'FAIL: anon can query businesses';
  exception when insufficient_privilege then null;
  end;
  perform set_config('role', 'none', true);

  raise exception 'ALL_TESTS_PASSED';
end;
$$;
