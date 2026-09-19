"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { provisionUser } from "@/lib/provision";
import { clientIp, rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";

export type AuthState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

// Very small in-memory brute-force guard (per email, per server instance).
const attempts = new Map<string, { count: number; until: number }>();
function isLocked(key: string) {
  const a = attempts.get(key);
  return !!a && a.count >= 5 && a.until > Date.now();
}
function fail(key: string) {
  const a = attempts.get(key);
  const count = a && a.until > Date.now() ? a.count + 1 : 1;
  attempts.set(key, { count, until: Date.now() + 15 * 60 * 1000 });
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, password } = parsed.data;

  // Two independent guards: per-email (stops one account being hammered) and
  // per-IP (stops one attacker spraying passwords across many email addresses).
  const ip = await clientIp();
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.ok) return { error: tooManyRequestsMessage(ipLimit.retryAfterSeconds) };
  if (isLocked(email)) return { error: "Too many failed attempts. Try again in 15 minutes." };

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok) {
    fail(email);
    await audit(null, "auth.login_failed", email);
    return { error: "Invalid email or password." };
  }
  if (user.status !== "ACTIVE") return { error: "Your account has been suspended. Contact an administrator." };

  attempts.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user);
  await audit(user.id, "auth.login", user.email);
  redirect(safeNext(formData.get("next")));
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(60),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  if (process.env.ALLOW_SIGNUP === "false") return { error: "Sign-up is disabled. Ask an administrator for an account." };
  const ip = await clientIp();
  const limit = rateLimit(`register:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return { error: tooManyRequestsMessage(limit.retryAfterSeconds) };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: ["An account with this email already exists"] } };
  }

  // The very first account on a fresh install becomes the administrator.
  const isFirst = (await prisma.user.count()) === 0;
  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 12), role: isFirst ? "ADMIN" : "USER", lastLoginAt: new Date() },
    });
    await provisionUser(tx, u.id);
    return u;
  });

  await createSession(user);
  await audit(user.id, "auth.register", user.email);
  redirect("/dashboard?welcome=1");
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit(user.id, "auth.logout", user.email);
  await destroySession();
  redirect("/login");
}
