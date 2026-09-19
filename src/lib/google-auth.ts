import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const GOOGLE_STATE_COOKIE = "ledgerly_g_state";

export function googleEnabled() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthorizeUrl(origin: string, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

type GoogleProfile = { email: string; emailVerified: boolean; name: string; picture?: string };

/** Exchanges an auth code for tokens, then verifies the id_token's signature against Google's own JWKS. */
export async function exchangeGoogleCode(code: string, origin: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Google did not return an id_token");

  const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const email = String(payload.email ?? "").toLowerCase().trim();
  if (!email) throw new Error("Google account has no email");
  return {
    email,
    emailVerified: payload.email_verified !== false,
    name: String(payload.name ?? email.split("@")[0]),
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
