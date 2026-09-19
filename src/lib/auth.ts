import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";
import { can, type Permission } from "./rbac";

export async function createSession(user: { id: string; role: "ADMIN" | "USER"; name: string }) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Returns the current user, re-validated against the database on every request
 * so role changes and suspensions take effect immediately.
 */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, status: true, currency: true, createdAt: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    // A cookie may still exist for a suspended/deleted user: clear it via a route handler to avoid redirect loops.
    const hasCookie = (await cookies()).has(SESSION_COOKIE);
    redirect(hasCookie ? "/api/auth/signout" : "/login");
  }
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard?denied=1");
  return user;
}
