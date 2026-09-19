import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so long-lived processes don't leak memory. This is a
// single-instance, in-memory limiter — good enough for one server; put a shared
// store (Redis, etc.) behind this same function if you ever run more than one.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** Fixed-window limiter: `limit` hits per `windowMs`, keyed however the caller likes. */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  bucket.count++;
  return { ok: true };
}

/**
 * Best-effort client IP for rate-limiting. Only trustworthy behind a reverse proxy
 * that sets these headers itself (Nginx/ALB/Cloudflare) and strips client-supplied
 * ones — if you deploy without one, every request looks like it comes from the
 * same place, which just makes the limiter coarser, not insecure.
 */
export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

export function tooManyRequestsMessage(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
