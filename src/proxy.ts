import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { can, PROTECTED_ROUTES } from "@/lib/rbac";

const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Locked-down defaults for a same-origin app with no third-party embeds, iframes,
 * or CDN assets: nothing framed in or out, no unrelated script/style/image origins,
 * no plugins, no MIME sniffing. `script-src` stays same-origin only — the one
 * concession is `'unsafe-inline'`, which Next.js's own inline hydration/flight-data
 * scripts need; per-request nonces would be the stricter alternative, but they're
 * incompatible with this app's statically-prerendered routes (`/`, `/_not-found`),
 * so this is the practical middle ground: it still blocks every *cross-origin*
 * script injection (the actual point of the header), just not a same-document
 * inline one. `style-src 'unsafe-inline'` is needed for Tailwind's inline
 * `style={}` attributes (chart colors, progress bars).
 */
function applySecurityHeaders(res: NextResponse, request: NextRequest) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = request.nextUrl.protocol === "https:" || forwardedProto === "https";
  if (isHttps) res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!session && pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), request);
  }

  if (!session && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(url), request);
  }

  if (session && (isPublic || pathname === "/")) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)), request);
  }

  if (session) {
    const rule = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));
    if (rule && !can(session.role, rule.permission)) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard?denied=1", request.url)), request);
    }
  }

  return applySecurityHeaders(NextResponse.next(), request);
}

export const config = {
  // Everything except Next internals, static files, and routes that must be reachable
  // without a session (the health check, and the Google OAuth redirect + callback).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health|api/auth/google).*)"],
};
