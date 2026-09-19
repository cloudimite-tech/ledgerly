import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categoryBreakdown, monthlySeries, totalsBetween } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { Card, CardHeader, PageHeader, cn } from "@/components/ui";
import { CashflowChart, DonutChart, NetTrendChart } from "@/components/charts";
import { CategoryIcon } from "@/components/icon";
import { ReportActions } from "@/components/report-actions";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireUser();
  const cur = user.currency;
  const nowYear = new Date().getFullYear();
  const year = Math.min(nowYear, Math.max(2000, Number((await searchParams).year) || nowYear));
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const anchor = new Date(year, 11, 1);

  const [series, totals, expenseCats, incomeCats, first] = await Promise.all([
    monthlySeries(user.id, 12, anchor),
    totalsBetween(user.id, start, end),
    categoryBreakdown(user.id, "EXPENSE", start, end),
    categoryBreakdown(user.id, "INCOME", start, end),
    prisma.transaction.findFirst({ where: { userId: user.id }, orderBy: { date: "asc" }, select: { date: true } }),
  ]);
  const minYear = first ? first.date.getUTCFullYear() : nowYear;
  const activeMonths = series.filter((m) => m.income || m.expense).length || 1;

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Finance" title="Reports" description="Yearly trends and where your money goes.">
        <ReportActions exportHref={`/api/reports/export?year=${year}`} />
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
          <Link href={`?year=${year - 1}`} className={cn("grid size-8 place-items-center rounded-lg hover:bg-surface-2", year <= minYear && "pointer-events-none opacity-30")}><ChevronLeft size={16} /></Link>
          <span className="w-14 text-center text-sm font-semibold tabular">{year}</span>
          <Link href={`?year=${year + 1}`} className={cn("grid size-8 place-items-center rounded-lg hover:bg-surface-2", year >= nowYear && "pointer-events-none opacity-30")}><ChevronRight size={16} /></Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Total income", v: formatMoney(totals.income, cur), c: "text-income" },
          { l: "Total expenses", v: formatMoney(totals.expense, cur), c: "text-expense" },
          { l: "Net savings", v: formatMoney(totals.net, cur, { sign: true }), c: totals.net >= 0 ? "" : "text-expense" },
          { l: "Avg. monthly spend", v: formatMoney(totals.expense / activeMonths, cur), c: "" },
        ].map((s) => (
          <Card key={s.l} className="p-5"><p className="text-sm text-muted">{s.l}</p><p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular", s.c)}>{s.v}</p></Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card><CardHeader title="Monthly cash flow" description={`Income vs expenses in ${year}`} /><div className="px-3 pb-4 pt-2"><CashflowChart data={series} currency={cur} height={280} /></div></Card>
        <Card><CardHeader title="Net savings trend" description="Income minus expenses per month" /><div className="px-3 pb-4 pt-2"><NetTrendChart data={series} currency={cur} height={280} /></div></Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {[
          { title: "Expenses by category", data: expenseCats, total: totals.expense, label: "Spent" },
          { title: "Income by category", data: incomeCats, total: totals.income, label: "Earned" },
        ].map((block) => (
          <Card key={block.title}>
            <CardHeader title={block.title} description={`${year} total`} />
            {block.data.length === 0 ? <p className="p-5 text-sm text-muted">No data for this year.</p> : (
              <div className="grid items-center gap-6 p-5 sm:grid-cols-[200px_1fr]">
                <DonutChart data={block.data} currency={cur} centerLabel={block.label} />
                <ul className="space-y-3">
                  {block.data.slice(0, 7).map((c) => {
                    const pct = block.total ? (c.total / block.total) * 100 : 0;
                    return (
                      <li key={c.id}>
                        <div className="flex items-center gap-2 text-sm">
                          <CategoryIcon name={c.icon} color={c.color} size="sm" />
                          <span className="flex-1 truncate">{c.name}</span>
                          <span className="font-medium tabular">{formatMoney(c.total, cur, { compact: true })}</span>
                        </div>
                        <div className="ml-9 mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} /></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Monthly breakdown" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-border bg-surface-2/60 text-left text-xs text-muted">
              <th className="px-5 py-2.5 font-medium">Month</th><th className="px-3 py-2.5 text-right font-medium">Income</th><th className="px-3 py-2.5 text-right font-medium">Expenses</th><th className="px-3 py-2.5 text-right font-medium">Net</th><th className="px-5 py-2.5 text-right font-medium">Savings rate</th>
            </tr></thead>
            <tbody className="divide-y divide-border tabular">
              {series.map((m) => (
                <tr key={m.key} className={cn(!m.income && !m.expense && "text-muted/60")}>
                  <td className="px-5 py-2.5">{new Date(m.key + "-01T00:00:00Z").toLocaleString("en-US", { month: "long", timeZone: "UTC" })}</td>
                  <td className={cn("px-3 py-2.5 text-right", m.income > 0 && "text-income")}>{formatMoney(m.income, cur)}</td>
                  <td className="px-3 py-2.5 text-right">{formatMoney(m.expense, cur)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-medium", m.net < 0 && "text-expense")}>{formatMoney(m.net, cur, { sign: true })}</td>
                  <td className="px-5 py-2.5 text-right text-muted">{m.income ? `${((m.net / m.income) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
