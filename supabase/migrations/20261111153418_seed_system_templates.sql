-- Snip · Phase 2 · System templates (reference data, so it ships as a migration)
-- HTML files live in the templates bucket at html_path. They are authored in
-- packages/templates and uploaded in Phase 5. Brand colours, fonts and logo are injected
-- from the brand kit; slots are the per-slide editable fields.

insert into public.templates (name, kind, html_path, slots, is_system, business_id)
values
  ('Bold statement', 'carousel', 'system/carousel/bold-statement.html',
    '[
      {"key": "kicker", "kind": "text", "label": "Small line above", "maxChars": 24, "required": false},
      {"key": "headline", "kind": "text", "label": "Headline", "maxChars": 60, "required": true},
      {"key": "body", "kind": "text", "label": "Supporting text", "maxChars": 160, "required": false}
    ]'::jsonb, true, null),
  ('Numbered tips', 'carousel', 'system/carousel/numbered-tips.html',
    '[
      {"key": "headline", "kind": "text", "label": "Tip title", "maxChars": 50, "required": true},
      {"key": "body", "kind": "text", "label": "Tip detail", "maxChars": 180, "required": true}
    ]'::jsonb, true, null),
  ('Quote card', 'carousel', 'system/carousel/quote-card.html',
    '[
      {"key": "quote", "kind": "text", "label": "Quote or review", "maxChars": 160, "required": true},
      {"key": "attribution", "kind": "text", "label": "Who said it", "maxChars": 40, "required": false}
    ]'::jsonb, true, null),
  ('Product spotlight', 'carousel', 'system/carousel/product-spotlight.html',
    '[
      {"key": "photo", "kind": "image", "label": "Product photo", "required": true},
      {"key": "headline", "kind": "text", "label": "Product name", "maxChars": 40, "required": true},
      {"key": "price", "kind": "text", "label": "Price", "maxChars": 16, "required": false},
      {"key": "body", "kind": "text", "label": "Why it is good", "maxChars": 120, "required": false}
    ]'::jsonb, true, null),
  ('Offer and call to action', 'carousel', 'system/carousel/offer-cta.html',
    '[
      {"key": "headline", "kind": "text", "label": "Headline", "maxChars": 50, "required": true},
      {"key": "offer", "kind": "text", "label": "Offer", "maxChars": 30, "required": true},
      {"key": "cta", "kind": "text", "label": "Call to action", "maxChars": 30, "required": true},
      {"key": "handle", "kind": "text", "label": "Handle or address", "maxChars": 30, "required": false}
    ]'::jsonb, true, null),
  ('Clean captions', 'reel', 'system/reel/clean-captions.html',
    '[
      {"key": "hook", "kind": "text", "label": "Opening hook card", "maxChars": 50, "required": true},
      {"key": "cta", "kind": "text", "label": "End card call to action", "maxChars": 40, "required": false}
    ]'::jsonb, true, null)
on conflict (name) where is_system do update
set kind = excluded.kind,
    html_path = excluded.html_path,
    slots = excluded.slots;
