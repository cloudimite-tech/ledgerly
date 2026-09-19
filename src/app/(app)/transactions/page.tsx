import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userOptions } from "@/lib/queries";
import { buildTxWhere, type TxFilters } from "@/lib/tx-filters";
import { formatMoney, toNumber } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { AddTransactionButton } from "@/components/transaction-form";
import { TxFiltersBar } from "./filters";
import { TxTable } from "./table";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Transactions" };
const PAGE_SIZE = 20;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TxFilters> }) {
  const user = await requireUser();
  const f = await searchParams;
  const where = buildTxWhere(user.id, f);
  const page = Math.max(1, Number(f.page) || 1);

  const [rows, total, sums, options] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true, color: true, icon: true } }, account: { select: { name: true, color: true } } },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    userOptions(user.id),
  ]);

  const income = toNumber(sums.find((s) => s.type === "INCOME")?._sum.amount);
  const expense = toNumber(sums.find((s) => s.type === "EXPENSE")?._sum.amount);
  const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const cur = user.currency;

  return (
    <div className="animate-in">
      <PageHeader title="Transactions" description="Every rupee in and out, searchable and filterable.">
        <a href={`/api/export?${qs}`} className={buttonClass("secondary")}><Download size={16} /> Export CSV</a>
        <AddTransactionButton options={options} currency={cur} />
      </PageHeader>

      <TxFiltersBar options={options} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Income", value: income, cls: "text-income" },
          { label: "Expenses", value: expense, cls: "text-expense" },
          { label: "Net", value: income - expense, cls: income - expense >= 0 ? "text-fg" : "text-expense" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`mt-0.5 truncate text-base font-semibold tabular sm:text-lg ${s.cls}`}>{formatMoney(s.value, cur)}</p>
          </div>
        ))}
      </div>

      <TxTable
        rows={rows.map((r) => ({
          id: r.id, type: r.type, amount: toNumber(r.amount), date: r.date.toISOString().slice(0, 10), description: r.description,
          notes: r.notes ?? "", accountId: r.accountId, categoryId: r.categoryId, category: r.category, account: r.account,
        }))}
        options={options}
        currency={cur}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
      />
    </div>
  );
}
