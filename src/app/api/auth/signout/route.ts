import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** Clears a stale session (e.g. user suspended or deleted) and sends them to /login. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?expired=1", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
