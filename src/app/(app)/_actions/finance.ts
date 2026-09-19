"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function invalid(e: z.ZodError): ActionResult {
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(e).fieldErrors };
}
function friendly(e: unknown): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "That name is already in use." };
    if (e.code === "P2003") return { ok: false, error: "This item is still used by transactions and can't be deleted." };
    if (e.code === "P2025") return { ok: false, error: "Item not found." };
  }
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}
function refresh() {
  for (const p of ["/dashboard", "/transactions", "/budgets", "/reports", "/accounts", "/categories"]) revalidatePath(p);
}

/** A generous per-user cap on writes — normal usage never comes close, it just
 *  stops a runaway script or compromised session from hammering the database. */
function writeLimited(userId: string): ActionResult | null {
  const limit = rateLimit(`finance-write:${userId}`, 120, 60 * 1000);
  return limit.ok ? null : { ok: false, error: tooManyRequestsMessage(limit.retryAfterSeconds) };
}

const amount = z.coerce.number({ message: "Enter an amount" }).positive("Must be greater than 0").max(999_999_999_999, "Too large");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color");

/* ───────────── Transactions ───────────── */

const txSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  description: z.string().trim().min(1, "Add a short description").max(120),
  accountId: z.string().min(1, "Choose an account"),
  categoryId: z.string().min(1, "Choose a category"),
  notes: z.string().trim().max(500).optional(),
});

export async function saveTransaction(input: z.input<typeof txSchema>): Promise<ActionResult> {
  const user = await requirePermission("finance:own");
  const limited = writeLimited(user.id);
  if (limited) return limited;
  const parsed = txSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;

  // Ownership checks: a user can only post to their own account & category.
  const [account, category] = await Promise.all([
    prisma.account.findFirst({ where: { id: d.accountId, userId: user.id } }),
    prisma.category.findFirst({ where: { id: d.categoryId, userId: user.id } }),
  ]);
  if (!account) return { ok: false, error: "Account not found.", fieldErrors: { accountId: ["Invalid account"] } };
  if (!category || category.type !== d.type) return { ok: false, error: "Category doesn't match the transaction type.", fieldErrors: { categoryId: ["Invalid category"] } };

  const data = {
    type: d.type,
    amount: d.amount,
    date: new Date(`${d.date}T00:00:00.000Z`),
    description: d.description,
    notes: d.notes || null,
    accountId: account.id,
    categoryId: category.id,
  };
  try {
    if (d.id) {
      const res = await prisma.transaction.updateMany({ where: { id: d.id, userId: user.id }, data });
      if (res.count === 0) return { ok: false, error: "Transaction not found." };
    } else {
      await prisma.transaction.create({ data: { ...data, userId: user.id } });
    }
  } catch (e) {
    return friendly(e);
  }
  refresh();
  return { ok: true, message: d.id ? "Transaction updated" : "Transaction added" };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const limited = writeLimited(user.id);
  if (limited) return limited;
  const res = await prisma.transaction.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return { ok: false, error: "Transaction not found." };
  refresh();
  return { ok: true, message: "Transaction deleted" };
}

/* ───────────── Categories ───────────── */

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(40),
  type: z.enum(["INCOME", "EXPENSE"]),
  color: hex,
  icon: z.string().min(1).max(30),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<ActionResult> {
  const user = await requirePermission("finance:own");
  const limited = writeLimited(user.id);
  if (limited) return limited;
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  try {
    if (id) {
      const existing = await prisma.category.findFirst({ where: { id, userId: user.id }, include: { _count: { select: { transactions: true } } } });
      if (!existing) return { ok: false, error: "Category not found." };
      if (existing.type !== data.type && existing._count.transactions > 0) return { ok: false, error: "Can't change the type of a category that has transactions." };
      await prisma.category.update({ where: { id }, data });
    } else {
      await prisma.category.create({ data: { ...data, userId: user.id } });
    }
  } catch (e) {
    return friendly(e);
  }
  refresh();
  return { ok: true, message: id ? "Category updated" : "Category created" };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const res = await prisma.category.deleteMany({ where: { id, userId: user.id } });
    if (res.count === 0) return { ok: false, error: "Category not found." };
  } catch (e) {
    return friendly(e);
  }
  refresh();
  return { ok: true, message: "Category deleted" };
}

/* ───────────── Accounts ───────────── */

const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name is required").max(40),
  type: z.enum(["CASH", "BANK", "CARD", "SAVINGS", "OTHER"]),
  openingBalance: z.coerce.number().min(-999_999_999_999).max(999_999_999_999),
  color: hex,
});

export async function saveAccount(input: z.input<typeof accountSchema>): Promise<ActionResult> {
  const user = await requirePermission("finance:own");
  const limited = writeLimited(user.id);
  if (limited) return limited;
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  try {
    if (id) {
      const res = await prisma.account.updateMany({ where: { id, userId: user.id }, data });
      if (res.count === 0) return { ok: false, error: "Account not found." };
    } else {
      await prisma.account.create({ data: { ...data, userId: user.id } });
    }
  } catch (e) {
    return friendly(e);
  }
  refresh();
  return { ok: true, message: id ? "Account updated" : "Account created" };
}

export async function toggleArchiveAccount(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const acc = await prisma.account.findFirst({ where: { id, userId: user.id } });
  if (!acc) return { ok: false, error: "Account not found." };
  await prisma.account.update({ where: { id }, data: { archived: !acc.archived } });
  refresh();
  return { ok: true, message: acc.archived ? "Account restored" : "Account archived" };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const res = await prisma.account.deleteMany({ where: { id, userId: user.id } });
    if (res.count === 0) return { ok: false, error: "Account not found." };
  } catch (e) {
    const r = friendly(e);
    if (!r.ok && r.error.includes("still used")) return { ok: false, error: "This account has transactions. Archive it instead." };
    return r;
  }
  refresh();
  return { ok: true, message: "Account deleted" };
}

/* ───────────── Budgets ───────────── */

const budgetSchema = z.object({ categoryId: z.string().min(1, "Choose a category"), amount });

export async function saveBudget(input: z.input<typeof budgetSchema>): Promise<ActionResult> {
  const user = await requirePermission("finance:own");
  const limited = writeLimited(user.id);
  if (limited) return limited;
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const cat = await prisma.category.findFirst({ where: { id: parsed.data.categoryId, userId: user.id, type: "EXPENSE" } });
  if (!cat) return { ok: false, error: "Choose one of your expense categories." };
  await prisma.budget.upsert({
    where: { userId_categoryId: { userId: user.id, categoryId: cat.id } },
    create: { userId: user.id, categoryId: cat.id, amount: parsed.data.amount },
    update: { amount: parsed.data.amount },
  });
  refresh();
  return { ok: true, message: `Budget saved for ${cat.name}` };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await prisma.budget.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return { ok: false, error: "Budget not found." };
  refresh();
  return { ok: true, message: "Budget removed" };
}
