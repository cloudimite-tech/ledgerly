import "server-only";
import { prisma } from "./prisma";
import { monthRange } from "./queries";
import { toNumber } from "./money";
import type { Prisma } from "@/generated/prisma/client";

export async function listGroupsWithCounts() {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true } }, createdBy: { select: { name: true } } },
  });
  return groups.map((g) => ({ id: g.id, name: g.name, description: g.description, memberCount: g._count.members, createdBy: g.createdBy?.name ?? null, createdAt: g.createdAt }));
}

export async function groupWithMembers(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { addedAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, currency: true, status: true, role: true } } },
      },
    },
  });
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    members: group.members.map((m) => ({ membershipId: m.id, addedAt: m.addedAt, ...m.user })),
  };
}

/** Per-member income/expense/net for the current month, for the group overview cards. */
export async function groupMemberSummaries(userIds: string[], anchor = new Date()) {
  if (userIds.length === 0) return [];
  const { start, end } = monthRange(anchor);
  const rows = await prisma.transaction.groupBy({
    by: ["userId", "type"],
    where: { userId: { in: userIds }, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  return userIds.map((userId) => {
    const income = toNumber(rows.find((r) => r.userId === userId && r.type === "INCOME")?._sum.amount);
    const expense = toNumber(rows.find((r) => r.userId === userId && r.type === "EXPENSE")?._sum.amount);
    const count = rows.filter((r) => r.userId === userId).reduce((a, r) => a + r._count, 0);
    return { userId, income, expense, net: income - expense, count };
  });
}

export async function groupTotalsBetween(userIds: string[], start: Date, end: Date) {
  if (userIds.length === 0) return { income: 0, expense: 0, net: 0, count: 0 };
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId: { in: userIds }, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  const income = toNumber(rows.find((r) => r.type === "INCOME")?._sum.amount);
  const expense = toNumber(rows.find((r) => r.type === "EXPENSE")?._sum.amount);
  const count = rows.reduce((a, r) => a + r._count, 0);
  return { income, expense, net: income - expense, count };
}

/**
 * Income vs expense per month across a set of members, for the last `months` months
 * (oldest first). Only meaningful as one combined trend when every included member
 * shares a currency — callers should check that before charting it as one series.
 */
export async function groupMonthlySeries(userIds: string[], months = 12, anchor = new Date()) {
  const start = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth() - (months - 1), 1));
  const end = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  const rows = userIds.length
    ? await prisma.transaction.findMany({
        where: { userId: { in: userIds }, date: { gte: start, lt: end } },
        select: { type: true, amount: true, date: true },
      })
    : [];
  const out: { key: string; label: string; income: number; expense: number; net: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) + (months > 12 ? ` ${String(d.getUTCFullYear()).slice(2)}` : "");
    let income = 0;
    let expense = 0;
    for (const r of rows) {
      if (r.date.toISOString().slice(0, 7) !== key) continue;
      if (r.type === "INCOME") income += toNumber(r.amount);
      else expense += toNumber(r.amount);
    }
    out.push({ key, label, income, expense, net: income - expense });
  }
  return out;
}

/**
 * Category totals across a set of members. Each member owns their own Category rows,
 * so equivalent categories (e.g. everyone's "Groceries") are merged by name rather
 * than by id — otherwise the same category would show up once per member.
 */
export async function groupCategoryBreakdown(userIds: string[], type: "INCOME" | "EXPENSE", start: Date, end: Date) {
  if (userIds.length === 0) return [];
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: { in: userIds }, type, date: { gte: start, lt: end } },
    _sum: { amount: true },
    _count: true,
  });
  if (rows.length === 0) return [];
  const cats = await prisma.category.findMany({ where: { id: { in: rows.map((r) => r.categoryId) } } });
  const merged = new Map<string, { id: string; name: string; color: string; icon: string; total: number; count: number }>();
  for (const r of rows) {
    const c = cats.find((x) => x.id === r.categoryId);
    if (!c) continue;
    const key = c.name.trim().toLowerCase();
    const total = toNumber(r._sum.amount);
    const cur = merged.get(key);
    if (cur) { cur.total += total; cur.count += r._count; }
    else merged.set(key, { id: key, name: c.name, color: c.color, icon: c.icon, total, count: r._count });
  }
  return [...merged.values()].sort((a, b) => b.total - a.total);
}

export type GroupTxFilters = { member?: string; type?: string; q?: string; from?: string; to?: string; page?: string };
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

function buildGroupTxWhere(userIds: string[], f: GroupTxFilters): Prisma.TransactionWhereInput {
  const memberIds = f.member && userIds.includes(f.member) ? [f.member] : userIds;
  const where: Prisma.TransactionWhereInput = { userId: { in: memberIds } };
  if (f.type === "INCOME" || f.type === "EXPENSE") where.type = f.type;
  if (isDate(f.from) || isDate(f.to)) {
    where.date = {
      ...(isDate(f.from) ? { gte: new Date(`${f.from}T00:00:00Z`) } : {}),
      ...(isDate(f.to) ? { lte: new Date(`${f.to}T00:00:00Z`) } : {}),
    };
  }
  if (f.q?.trim()) {
    where.OR = [
      { description: { contains: f.q.trim(), mode: "insensitive" } },
      { notes: { contains: f.q.trim(), mode: "insensitive" } },
    ];
  }
  return where;
}

const PAGE_SIZE = 25;

/** Combined, paginated transaction feed across every member of a group (or one member when filtered). */
export async function groupTransactions(userIds: string[], f: GroupTxFilters) {
  const where = buildGroupTxWhere(userIds, f);
  const page = Math.max(1, Number(f.page) || 1);
  const [rows, total, sums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true, color: true, icon: true } },
        account: { select: { name: true } },
        user: { select: { id: true, name: true, currency: true } },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id, type: r.type, amount: toNumber(r.amount), date: r.date.toISOString().slice(0, 10), description: r.description,
      category: r.category, account: r.account, member: r.user,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    income: toNumber(sums.find((s) => s.type === "INCOME")?._sum.amount),
    expense: toNumber(sums.find((s) => s.type === "EXPENSE")?._sum.amount),
  };
}
