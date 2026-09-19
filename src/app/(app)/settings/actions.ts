"use server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CURRENCIES } from "@/lib/money";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import type { ActionResult } from "../_actions/finance";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  currency: z.enum(CURRENCIES.map((c) => c.code) as [string, ...string[]]),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated" };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Include an uppercase letter").regex(/[0-9]/, "Include a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export async function changePassword(input: z.input<typeof passwordSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const limit = rateLimit(`change-password:${user.id}`, 8, 15 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: tooManyRequestsMessage(limit.retryAfterSeconds) };
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(parsed.data.current, record.passwordHash))) {
    await audit(user.id, "auth.password_change_failed", user.email);
    return { ok: false, error: "Current password is incorrect.", fieldErrors: { current: ["Incorrect password"] } };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  await audit(user.id, "auth.password_changed", user.email);
  return { ok: true, message: "Password changed" };
}
