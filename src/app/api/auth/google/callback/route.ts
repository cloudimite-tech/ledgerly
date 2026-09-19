import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { provisionUser } from "@/lib/provision";
import { GOOGLE_STATE_COOKIE, exchangeGoogleCode, googleEnabled } from "@/lib/google-auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

function fail(req: NextRequest, error: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}

// A code/state pair is a single-use, short opaque token from Google — anything
// wildly outside that shape is either a bug or someone poking at the endpoint.
const isPlausibleToken = (v: string) => v.length > 0 && v.length < 2048;

export async function GET(req: NextRequest) {
  if (!googleEnabled()) return fail(req, "google_disabled");

  const ip = await clientIp();
  if (!rateLimit(`google-callback:ip:${ip}`, 30, 15 * 60 * 1000).ok) return fail(req, "google_failed");

  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieState = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    if (!code || !state || !cookieState || !isPlausibleToken(code) || !isPlausibleToken(state)) return fail(req, "google_state");
    // Constant-time compare: state is a CSRF token, so leaking timing info about
    // partial matches is exactly the kind of thing a side-channel attack would use.
    if (!timingSafeEqual(state, cookieState)) return fail(req, "google_state");

    let profile;
    try {
      profile = await exchangeGoogleCode(code, req.nextUrl.origin);
    } catch (e) {
      console.error("Google sign-in failed", e);
      return fail(req, "google_failed");
    }
    if (!profile.emailVerified) return fail(req, "google_unverified");

    let user = await prisma.user.findUnique({ where: { email: profile.email } });

    if (!user) {
      if (process.env.ALLOW_SIGNUP === "false") return fail(req, "google_signup_disabled");
      // The very first account on a fresh install becomes the administrator (same rule as /register).
      const isFirst = (await prisma.user.count()) === 0;
      user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            role: isFirst ? "ADMIN" : "USER",
            // Google-authenticated accounts have no usable password until the user sets one.
            passwordHash: await bcrypt.hash(randomUUID(), 12),
            lastLoginAt: new Date(),
          },
        });
        await provisionUser(tx, u.id);
        return u;
      });
      await audit(user.id, "auth.register", user.email, { via: "google" });
    } else {
      if (user.status !== "ACTIVE") return fail(req, "google_suspended");
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      await audit(user.id, "auth.login", user.email, { via: "google" });
    }

    await createSession(user);
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.delete(GOOGLE_STATE_COOKIE);
    return res;
  } catch (e) {
    console.error("Unhandled error in Google OAuth callback", e);
    return fail(req, "google_failed");
  }
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
