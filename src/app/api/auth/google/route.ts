import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { GOOGLE_STATE_COOKIE, googleAuthorizeUrl, googleEnabled } from "@/lib/google-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Kicks off "Sign in with Google": stash a CSRF state token in a short-lived cookie, then redirect to Google. */
export async function GET(req: NextRequest) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL("/login?error=google_disabled", req.url));
  }
  const ip = await clientIp();
  if (!rateLimit(`google-start:ip:${ip}`, 30, 15 * 60 * 1000).ok) {
    return NextResponse.redirect(new URL("/login?error=google_failed", req.url));
  }
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(googleAuthorizeUrl(req.nextUrl.origin, state));
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: 600,
  });
  return res;
}
