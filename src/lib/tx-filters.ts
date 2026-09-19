import type { Prisma } from "@/generated/prisma/client";

export type TxFilters = { q?: string; type?: string; category?: string; account?: string; from?: string; to?: string; page?: string };

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function buildTxWhere(userId: string, f: TxFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (f.type === "INCOME" || f.type === "EXPENSE") where.type = f.type;
  if (f.category) where.categoryId = f.category;
  if (f.account) where.accountId = f.account;
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
