const FALLBACK_REDIRECT = "/akun";

export function safeRedirectPath(
  value: string | string[] | null | undefined,
  fallback = FALLBACK_REDIRECT,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;

  const path = raw.trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }

  if (
    path.startsWith("/masuk") ||
    path.startsWith("/daftar") ||
    path.startsWith("/lupa-password")
  ) {
    return fallback;
  }

  return path;
}

export function loginHref(redirectTo: string): string {
  return `/masuk?redirect=${encodeURIComponent(safeRedirectPath(redirectTo))}`;
}
