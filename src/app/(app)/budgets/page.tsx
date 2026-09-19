import { requireUser } from "@/lib/auth";
import { budgetProgress, userOptions } from "@/lib/queries";
import { BudgetsView } from "./view";

export const metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const user = await requireUser();
  const [budgets, options] = await Promise.all([budgetProgress(user.id), userOptions(user.id)]);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (
    <div className="animate-in">
      <BudgetsView
        currency={user.currency}
        monthLabel={now.toLocaleString("en-US", { month: "long", year: "numeric" })}
        monthProgress={(now.getDate() / daysInMonth) * 100}
        daysLeft={daysInMonth - now.getDate()}
        budgets={budgets.map((b) => ({ id: b.id, categoryId: b.categoryId, name: b.category.name, color: b.category.color, icon: b.category.icon, limit: b.limit, spent: b.spent, pct: b.pct }))}
        expenseCategories={options.categories.filter((c) => c.type === "EXPENSE")}
      />
    </div>
  );
}
