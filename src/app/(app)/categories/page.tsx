import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/queries";
import { toNumber } from "@/lib/money";
import { CategoriesView } from "./view";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const { start, end } = monthRange();
  const [cats, month] = await Promise.all([
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, include: { _count: { select: { transactions: true } } } }),
    prisma.transaction.groupBy({ by: ["categoryId"], where: { userId: user.id, date: { gte: start, lt: end } }, _sum: { amount: true } }),
  ]);
  const data = cats.map((c) => ({
    id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon, count: c._count.transactions,
    month: toNumber(month.find((m) => m.categoryId === c.id)?._sum.amount),
  }));
  return (
    <div className="animate-in">
      <CategoriesView categories={data} currency={user.currency} />
    </div>
  );
}
