import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupCategoryBreakdown, groupMonthlySeries, groupTotalsBetween, groupWithMembers } from "@/lib/groups";
import { totalsBetween } from "@/lib/queries";
import { GroupReportsView } from "./view";

export const metadata = { title: "Group reports" };

export default async function GroupReportsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ year?: string; member?: string }> }) {
  await requirePermission("groups:read");
  const { id } = await params;
  const group = await groupWithMembers(id);
  if (!group) notFound();

  const sp = await searchParams;
  const selectedMember = sp.member ? group.members.find((m) => m.id === sp.member) : undefined;
  const selected = selectedMember ? [selectedMember] : group.members;
  const memberIds = selected.map((m) => m.id);
  const currencies = new Set(selected.map((m) => m.currency));
  const currency = currencies.size === 1 ? [...currencies][0] : null;

  const nowYear = new Date().getFullYear();
  const first = memberIds.length
    ? await prisma.transaction.findFirst({ where: { userId: { in: memberIds } }, orderBy: { date: "asc" }, select: { date: true } })
    : null;
  const minYear = first ? first.date.getUTCFullYear() : nowYear;
  const year = Math.min(nowYear, Math.max(minYear, Number(sp.year) || nowYear));
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const anchor = new Date(year, 11, 1);

  const [series, totals, expenseCats, incomeCats, memberTotals] = await Promise.all([
    groupMonthlySeries(memberIds, 12, anchor),
    groupTotalsBetween(memberIds, start, end),
    groupCategoryBreakdown(memberIds, "EXPENSE", start, end),
    groupCategoryBreakdown(memberIds, "INCOME", start, end),
    Promise.all(group.members.map(async (m) => ({ userId: m.id, ...(await totalsBetween(m.id, start, end)) }))),
  ]);
  const activeMonths = series.filter((m) => m.income || m.expense).length || 1;

  return (
    <div className="animate-in">
      <GroupReportsView
        group={{ id: group.id, name: group.name }}
        members={group.members.map((m) => ({ id: m.id, name: m.name, currency: m.currency }))}
        memberTotals={memberTotals}
        selectedMemberId={selectedMember?.id ?? null}
        year={year}
        nowYear={nowYear}
        minYear={minYear}
        currency={currency}
        series={series}
        totals={totals}
        activeMonths={activeMonths}
        expenseCats={expenseCats}
        incomeCats={incomeCats}
      />
    </div>
  );
}
