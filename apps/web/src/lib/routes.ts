/** Paths that need a signed-in user. Checked by the proxy before rendering. */
export const PROTECTED_PREFIXES = [
  "/home",
  "/onboarding",
  "/brand",
  "/accounts",
  "/create",
  "/calendar",
  "/insights",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Only allow same-site relative redirects ("/home", "/brand?x=1"). Anything else — absolute
 * URLs, protocol-relative "//evil.com", backslash tricks — falls back to the default.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
