# Carousel templates

HTML templates rendered by the worker (Playwright) to 1080×1350 PNG.

- One `.html` file per template, fully self-contained (inline CSS, no remote assets).
- Editable fields use `{{slot_key}}` placeholders; each slot is declared in the template's manifest (see `src/index.ts`).
- Brand values (`{{primary_color}}`, `{{heading_font}}`, …) come from the business's brand kit.

System templates are added in Phase 5 and seeded into the `templates` table.
