"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { Card, CardHeader, PageHeader, Select, cn } from "@/components/ui";
import { GroupTabs } from "@/components/group-tabs";
import { ReportActions } from "@/components/report-actions";
import { CashflowChart, DonutChart, NetTrendChart } from "@/components/charts";
import { CategoryIcon } from "@/components/icon";
import { formatMoney } from "@/lib/money";

type Member = { id: string; name: string; currency: string };
type MemberTotal = { userId: string; income: number; expense: number; net: number; count: number };
type Point = { key: string; label: string; income: number; expense: number; net: number };
type Cat = { id: string; name: string; color: string; icon: string; total: number; count: number };

export function GroupReportsView({ group, members, memberTotals, selectedMemberId, year, nowYear, minYear, currency, series, totals, activeMonths, expenseCats, incomeCats }: {
  group: { id: string; name: string };
  members: Member[];
  memberTotals: MemberTotal[];
  selectedMemberId: string | null;
  year: number; nowYear: number; minYear: number;
  currency: string | null;
  series: Point[];
  totals: { income: number; expense: number; net: number; count: number };
  activeMonths: number;
  expenseCats: Cat[];
  incomeCats: Cat[];
}) {
  return (
    <>
      <Link href={`/admin/groups/${group.id}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> {group.name}</Link>
      <PageHeader eyebrow="Group" title={`${group.name} reports`} description="Yearly trends across the group — or one member at a time.">
        <ReportActions exportHref={`/api/groups/${group.id}/reports/export?year=${year}${selectedMemberId ? `&member=${selectedMemberId}` : ""}`} />
      </PageHeader>
      <GroupTabs groupId={group.id} />

      <ReportsFilters members={members} selectedMemberId={selectedMemberId} year={year} nowYear={nowYear} minYear={minYear} />

      {members.length === 0 ? (
        <Card><div className="p-10 text-center text-sm text-muted">Add members to this group to see reports here.</div></Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {members.map((m) => {
              const t = memberTotals.find((x) => x.userId === m.id);
              const dimmed = selectedMemberId && selectedMemberId !== m.id;
              return (
                <Card key={m.id} className={cn("p-4 transition", dimmed && "opacity-50")}>
                  <p className="truncate text-xs text-muted">{m.name}</p>
                  <p className="mt-1 text-lg font-semibold tabular">{formatMoney(t?.net ?? 0, m.currency, { sign: true, compact: true })}</p>
                  <div className="mt-1.5 flex gap-3 text-[11px] text-muted">
                    <span className="text-income">{formatMoney(t?.income ?? 0, m.currency, { compact: true })} in</span>
                    <span className="text-expense">{formatMoney(t?.expense ?? 0, m.currency, { compact: true })} out</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {currency ? (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { l: "Total income", v: formatMoney(totals.income, currency), c: "text-income" },
                  { l: "Total expenses", v: formatMoney(totals.expense, currency), c: "text-expense" },
                  { l: "Net savings", v: formatMoney(totals.net, currency, { sign: true }), c: totals.net >= 0 ? "" : "text-expense" },
                  { l: "Avg. monthly spend", v: formatMoney(totals.expense / activeMonths, currency), c: "" },
                ].map((s) => (
                  <Card key={s.l} className="p-5"><p className="text-sm text-muted">{s.l}</p><p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular", s.c)}>{s.v}</p></Card>
                ))}
              </div>

              <div className="mb-4 grid gap-4 xl:grid-cols-2">
                <Card><CardHeader title="Monthly cash flow" description={`Income vs expenses in ${year}`} /><div className="px-3 pb-4 pt-2"><CashflowChart data={series} currency={currency} height={280} /></div></Card>
                <Card><CardHeader title="Net savings trend" description="Income minus expenses per month" /><div className="px-3 pb-4 pt-2"><NetTrendChart data={series} currency={currency} height={280} /></div></Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {[
                  { title: "Expenses by category", data: expenseCats, total: totals.expense, label: "Spent" },
                  { title: "Income by category", data: incomeCats, total: totals.income, label: "Earned" },
                ].map((block) => (
                  <Card key={block.title}>
                    <CardHeader title={block.title} description={`${year} total, merged across members`} />
                    {block.data.length === 0 ? <p className="p-5 text-sm text-muted">No data for this year.</p> : (
                      <div className="grid items-center gap-6 p-5 sm:grid-cols-[200px_1fr]">
                        <DonutChart data={block.data} currency={currency} centerLabel={block.label} />
                        <ul className="space-y-3">
                          {block.data.slice(0, 7).map((c) => {
                            const pct = block.total ? (c.total / block.total) * 100 : 0;
                            return (
                              <li key={c.id}>
                                <div className="flex items-center gap-2 text-sm">
                                  <CategoryIcon name={c.icon} color={c.color} size="sm" />
                                  <span className="flex-1 truncate">{c.name}</span>
                                  <span className="font-medium tabular">{formatMoney(c.total, currency, { compact: true })}</span>
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
            </>
          ) : (
            <Card>
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3.5 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary"><Layers size={20} /></div>
                <p className="font-medium">Members use different currencies</p>
                <p className="mt-1 max-w-sm text-sm text-muted">A combined yearly trend only makes sense when every member is shown in the same currency. Pick one member above to see their full report.</p>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function ReportsFilters({ members, selectedMemberId, year, nowYear, minYear }: { members: Member[]; selectedMemberId: string | null; year: number; nowYear: number; minYear: number }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  const setMember = (id: string) => {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("member", id); else next.delete("member");
    router.replace(`${path}?${next.toString()}`);
  };
  const yearHref = (y: number) => { const n = new URLSearchParams(params.toString()); n.set("year", String(y)); return `?${n}`; };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
        <Link href={yearHref(year - 1)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-surface-2", year <= minYear && "pointer-events-none opacity-30")}><ChevronLeft size={16} /></Link>
        <span className="w-14 text-center text-sm font-semibold tabular">{year}</span>
        <Link href={yearHref(year + 1)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-surface-2", year >= nowYear && "pointer-events-none opacity-30")}><ChevronRight size={16} /></Link>
      </div>
      <Select value={selectedMemberId ?? ""} onChange={(e) => setMember(e.target.value)} className="!w-auto">
        <option value="">All members</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </Select>
    </div>
  );
}
