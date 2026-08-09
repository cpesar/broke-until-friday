const DEFAULT_WEB_ORIGIN = "http://localhost:5173";

export function getTrustedOrigins(
  raw: string | undefined = process.env.WEB_ORIGIN,
): string[] {
  const origins = (raw ?? "")
    .split(/[\s,]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : [DEFAULT_WEB_ORIGIN];
}
