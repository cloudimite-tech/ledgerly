import "server-only";
import { prisma } from "./prisma";
import { toNumber } from "./money";

export function monthRange(d = new Date()) {
  const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
  const end = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1));
  return { start, end };
}

export async function totalsBetween(userId: string, start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  const income = toNumber(rows.find((r) => r.type === "INCOME")?._sum.amount);
  const expense = toNumber(rows.find((r) => r.type === "EXPENSE")?._sum.amount);
  const count = rows.reduce((a, r) => a + r._count, 0);
  return { income, expense, net: income - expense, count };
}

/** Income vs expense per month for the last `months` months (oldest first). */
export async function monthlySeries(userId: string, months = 6, anchor = new Date()) {
  const start = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  const rows = await prisma.$queryRaw<{ month: Date; type: "INCOME" | "EXPENSE"; total: string }[]>`
    SELECT date_trunc('month', "date")::date AS month, "type", SUM("amount")::text AS total
    FROM "Transaction"
    WHERE "userId" = ${userId} AND "date" >= ${start} AND "date" < ${end}
    GROUP BY 1, 2`;
  const out: { key: string; label: string; income: number; expense: number; net: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) + (months > 12 ? ` ${String(d.getUTCFullYear()).slice(2)}` : "");
    const inc = toNumber(rows.find((r) => new Date(r.month).toISOString().slice(0, 7) === key && r.type === "INCOME")?.total);
    const exp = toNumber(rows.find((r) => new Date(r.month).toISOString().slice(0, 7) === key && r.type === "EXPENSE")?.total);
    out.push({ key, label, income: inc, expense: exp, net: inc - exp });
  }
  return out;
}

export async function categoryBreakdown(userId: string, type: "INCOME" | "EXPENSE", start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  const cats = await prisma.category.findMany({ where: { userId, id: { in: rows.map((r) => r.categoryId) } } });
  return rows
    .map((r) => {
      const c = cats.find((x) => x.id === r.categoryId)!;
      return { id: c.id, name: c.name, color: c.color, icon: c.icon, total: toNumber(r._sum.amount), count: r._count };
    })
    .sort((a, b) => b.total - a.total);
}

export async function accountBalances(userId: string, includeArchived = false) {
  const accounts = await prisma.account.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ archived: "asc" }, { createdAt: "asc" }],
  });
  const sums = await prisma.transaction.groupBy({ by: ["accountId", "type"], where: { userId }, _sum: { amount: true }, _count: true });
  return accounts.map((a) => {
    const inc = toNumber(sums.find((s) => s.accountId === a.id && s.type === "INCOME")?._sum.amount);
    const exp = toNumber(sums.find((s) => s.accountId === a.id && s.type === "EXPENSE")?._sum.amount);
    const count = sums.filter((s) => s.accountId === a.id).reduce((x, s) => x + s._count, 0);
    return { ...a, openingBalance: toNumber(a.openingBalance), income: inc, expense: exp, balance: toNumber(a.openingBalance) + inc - exp, count };
  });
}

export async function budgetProgress(userId: string, anchor = new Date()) {
  const { start, end } = monthRange(anchor);
  const budgets = await prisma.budget.findMany({ where: { userId }, include: { category: true }, orderBy: { createdAt: "asc" } });
  const spent = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "EXPENSE", date: { gte: start, lt: end }, categoryId: { in: budgets.map((b) => b.categoryId) } },
    _sum: { amount: true },
  });
  return budgets.map((b) => {
    const s = toNumber(spent.find((x) => x.categoryId === b.categoryId)?._sum.amount);
    const limit = toNumber(b.amount);
    return { id: b.id, categoryId: b.categoryId, category: b.category, limit, spent: s, remaining: limit - s, pct: limit > 0 ? (s / limit) * 100 : 0 };
  });
}

export async function userOptions(userId: string) {
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true, color: true, icon: true } }),
  ]);
  return { accounts, categories };
}
export type UserOptions = Awaited<ReturnType<typeof userOptions>>;
