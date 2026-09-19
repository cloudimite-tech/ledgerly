import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, PiggyBank, Receipt, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountBalances, budgetProgress, categoryBreakdown, monthlySeries, monthRange, totalsBetween, userOptions } from "@/lib/queries";
import { formatMoney, toNumber } from "@/lib/money";
import { Card, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { CashflowChart, DonutChart } from "@/components/charts";
import { TxRowCompact } from "@/components/tx-row";
import { AddTransactionButton } from "@/components/transaction-form";
import { CategoryIcon } from "@/components/icon";

export const metadata = { title: "Dashboard" };

function pctChange(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Colombo" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const cur = user.currency;
  const now = new Date();
  const { start, end } = monthRange(now);
  const prev = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [thisMonth, lastMonth, series, byCategory, accounts, budgets, recent, options] = await Promise.all([
    totalsBetween(user.id, start, end),
    totalsBetween(user.id, prev.start, prev.end),
    monthlySeries(user.id, 6),
    categoryBreakdown(user.id, "EXPENSE", start, end),
    accountBalances(user.id),
    budgetProgress(user.id),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 7,
      include: { category: true, account: true },
    }),
    userOptions(user.id),
  ]);

  const totalBalance = accounts.reduce((a, x) => a + x.balance, 0);
  const savingsRate = thisMonth.income > 0 ? (thisMonth.net / thisMonth.income) * 100 : 0;
  const topCats = byCategory.slice(0, 5);
  const otherTotal = byCategory.slice(5).reduce((a, c) => a + c.total, 0);
  const donut = [...topCats, ...(otherTotal > 0 ? [{ id: "other", name: "Other", color: "#94a3b8", icon: "tag", total: otherTotal, count: 0 }] : [])];

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Overview" title={`${greeting()}, ${user.name.split(" ")[0]}`} description={`Here's your money at a glance for ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}.`}>
        <AddTransactionButton options={options} currency={cur} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total balance" value={formatMoney(totalBalance, cur)} icon={<Wallet size={18} />} sub={`across ${accounts.length} account${accounts.length === 1 ? "" : "s"}`} />
        <StatCard label="Income this month" value={formatMoney(thisMonth.income, cur)} icon={<ArrowDownLeft size={18} />} tone="income" delta={pctChange(thisMonth.income, lastMonth.income)} sub="vs last month" />
        <StatCard label="Expenses this month" value={formatMoney(thisMonth.expense, cur)} icon={<ArrowUpRight size={18} />} tone="expense" delta={pctChange(thisMonth.expense, lastMonth.expense)} deltaGoodWhenUp={false} sub="vs last month" />
        <StatCard label="Savings rate" value={`${savingsRate.toFixed(1)}%`} icon={<PiggyBank size={18} />} tone="neutral" sub={`${formatMoney(thisMonth.net, cur, { sign: true })} net`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Cash flow"
            description="Income vs expenses, last 6 months"
            action={
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-income" />Income</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-expense" />Expenses</span>
              </div>
            }
          />
          <div className="px-3 pb-4 pt-2"><CashflowChart data={series} currency={cur} height={400} /></div>
        </Card>

        <Card>
          <CardHeader title="Spending by category" description="This month" />
          {donut.length === 0 ? (
            <EmptyState icon={<Receipt size={20} />} title="No expenses yet" description="Expenses you add this month will appear here." />
          ) : (
            <div className="p-5">
              <DonutChart data={donut} currency={cur} centerLabel="Spent" />
              <ul className="mt-5 space-y-2.5">
                {donut.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted tabular">{((c.total / thisMonth.expense) * 100).toFixed(0)}%</span>
                    <span className="w-28 text-right font-medium tabular">{formatMoney(c.total, cur)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent transactions" action={<Link href="/transactions" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight size={12} /></Link>} />
          {recent.length === 0 ? (
            <EmptyState icon={<Receipt size={20} />} title="No transactions yet" description="Add your first income or expense to get started." />
          ) : (
            <div className="mt-2 divide-y divide-border">
              {recent.map((t) => <TxRowCompact key={t.id} tx={{ ...t, amount: toNumber(t.amount) }} currency={cur} />)}
            </div>
          )}
        </Card>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Budgets" description="This month" action={<Link href="/budgets" className="text-xs font-medium text-primary hover:underline">Manage</Link>} />
            <div className="space-y-4 p-5">
              {budgets.length === 0 && <p className="text-sm text-muted">No budgets set. <Link className="text-primary hover:underline" href="/budgets">Create one</Link>.</p>}
              {budgets.slice(0, 4).map((b) => (
                <div key={b.id}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm">
                    <CategoryIcon name={b.category.icon} color={b.category.color} size="sm" />
                    <span className="flex-1 truncate font-medium">{b.category.name}</span>
                    <span className="text-xs text-muted tabular">{formatMoney(b.spent, cur, { compact: true })} / {formatMoney(b.limit, cur, { compact: true })}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className={cn("h-full rounded-full", b.pct >= 100 ? "bg-expense" : b.pct >= 80 ? "bg-warn" : "bg-income")} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Accounts" action={<Link href="/accounts" className="text-xs font-medium text-primary hover:underline">Manage</Link>} />
            <div className="space-y-1 p-3">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <span className="size-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="flex-1 truncate text-sm">{a.name}</span>
                  <span className={cn("text-sm font-semibold tabular", a.balance < 0 && "text-expense")}>{formatMoney(a.balance, cur)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
