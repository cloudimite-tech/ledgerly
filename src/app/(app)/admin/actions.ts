"use server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { provisionUser } from "@/lib/provision";
import { Prisma } from "@/generated/prisma/client";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import type { ActionResult } from "../_actions/finance";

type WithPassword = ActionResult & { tempPassword?: string };

function tempPassword() {
  return `Lg-${randomBytes(6).toString("base64url")}9A`;
}

function friendly(e: unknown): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "That email is already in use." };
    if (e.code === "P2025") return { ok: false, error: "User not found." };
  }
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function assertNotLastAdmin(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (target?.role !== "ADMIN") return null;
  const admins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
  return admins <= 1 ? "You can't remove the last active administrator." : null;
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "USER"]),
});

export async function createUser(input: z.input<typeof createSchema>): Promise<WithPassword> {
  const admin = await requirePermission("users:manage");
  const limit = rateLimit(`admin-user-create:${admin.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: tooManyRequestsMessage(limit.retryAfterSeconds) };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
    return { ok: false, error: "Email already registered.", fieldErrors: { email: ["Already in use"] } };
  }
  const pwd = tempPassword();
  try {
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { ...parsed.data, passwordHash: await bcrypt.hash(pwd, 12) } });
      await provisionUser(tx, u.id);
      return u;
    });
    await audit(admin.id, "user.created", user.email, { role: user.role });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Created ${user.email}`, tempPassword: pwd };
  } catch (e) {
    return friendly(e);
  }
}

export async function setUserRole(userId: string, role: "ADMIN" | "USER"): Promise<ActionResult> {
  const admin = await requirePermission("users:manage");
  if (userId === admin.id) return { ok: false, error: "You can't change your own role." };
  if (role === "USER") { const e = await assertNotLastAdmin(userId); if (e) return { ok: false, error: e }; }
  try {
    const u = await prisma.user.update({ where: { id: userId }, data: { role } });
    await audit(admin.id, "user.role_changed", u.email, { role });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `${u.name} is now ${role === "ADMIN" ? "an admin" : "a user"}` };
  } catch (e) {
    return friendly(e);
  }
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  const admin = await requirePermission("users:manage");
  if (userId === admin.id) return { ok: false, error: "You can't suspend yourself." };
  if (status === "SUSPENDED") { const e = await assertNotLastAdmin(userId); if (e) return { ok: false, error: e }; }
  try {
    const u = await prisma.user.update({ where: { id: userId }, data: { status } });
    await audit(admin.id, status === "ACTIVE" ? "user.activated" : "user.suspended", u.email);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `${u.name} ${status === "ACTIVE" ? "reactivated" : "suspended"}` };
  } catch (e) {
    return friendly(e);
  }
}

export async function resetUserPassword(userId: string): Promise<WithPassword> {
  const admin = await requirePermission("users:manage");
  const limit = rateLimit(`admin-pwd-reset:${admin.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: tooManyRequestsMessage(limit.retryAfterSeconds) };
  const pwd = tempPassword();
  try {
    const u = await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(pwd, 12) } });
    await audit(admin.id, "user.password_reset", u.email);
    return { ok: true, message: `Password reset for ${u.email}`, tempPassword: pwd };
  } catch (e) {
    return friendly(e);
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  const admin = await requirePermission("users:manage");
  if (userId === admin.id) return { ok: false, error: "You can't delete your own account." };
  const e = await assertNotLastAdmin(userId);
  if (e) return { ok: false, error: e };
  try {
    const u = await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } });
      return tx.user.delete({ where: { id: userId } });
    });
    await audit(admin.id, "user.deleted", u.email);
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Deleted ${u.email} and all their data` };
  } catch (err) {
    return friendly(err);
  }
}
