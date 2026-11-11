/** Escape text for HTML content and double-quoted attributes. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Replace `{{slot}}` placeholders. Unknown placeholders are left untouched; values are HTML-escaped. */
export function fillSlots(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (match, key: string) =>
    key in values ? escapeHtml(values[key] ?? "") : match,
  );
}

/** Only http(s) URLs may reach an src attribute. */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Google Fonts stylesheet for the given families (weights 400/600/800 where available). */
export function googleFontsUrl(families: readonly (string | null | undefined)[]): string | null {
  const unique = [
    ...new Set(families.filter((f): f is string => Boolean(f && /^[A-Za-z0-9 ]+$/.test(f)))),
  ];
  if (unique.length === 0) return null;
  const single = new Set(["Bebas Neue", "Anton", "Pacifico", "DM Serif Display"]);
  const params = unique
    .map((f) => `family=${f.replaceAll(" ", "+")}${single.has(f) ? "" : ":wght@400;600;800"}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=block`;
}
