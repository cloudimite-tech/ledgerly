import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { groupCategoryBreakdown, groupMonthlySeries, groupTotalsBetween, groupWithMembers } from "@/lib/groups";
import { totalsBetween } from "@/lib/queries";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { isCrossSiteRequest } from "@/lib/http-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "groups:read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (isCrossSiteRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = rateLimit(`export:${user.id}`, 20, 5 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooManyRequestsMessage(limit.retryAfterSeconds) }, { status: 429 });

  try {
    const { id } = await params;
    const group = await groupWithMembers(id);
    if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sp = req.nextUrl.searchParams;
    const memberId = sp.get("member") || undefined;
    const selectedMember = memberId ? group.members.find((m) => m.id === memberId) : undefined;
    const selected = selectedMember ? [selectedMember] : group.members;
    const memberIds = selected.map((m) => m.id);
    const currencies = new Set(selected.map((m) => m.currency));
    const currencyLabel = currencies.size === 1 ? [...currencies][0] : "mixed — members use different currencies";

    const nowYear = new Date().getFullYear();
    const year = Math.min(nowYear, Math.max(2000, Number(sp.get("year")) || nowYear));
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const anchor = new Date(year, 11, 1);

    const [series, totals, expenseCats, incomeCats, memberTotals] = await Promise.all([
      groupMonthlySeries(memberIds, 12, anchor),
      groupTotalsBetween(memberIds, start, end),
      groupCategoryBreakdown(memberIds, "EXPENSE", start, end),
      groupCategoryBreakdown(memberIds, "INCOME", start, end),
      Promise.all(group.members.map(async (m) => ({ name: m.name, currency: m.currency, ...(await totalsBetween(m.id, start, end)) }))),
    ]);

    const rows: unknown[][] = [
      [`Ledgerly group report — ${group.name} — ${year}${selectedMember ? ` — ${selectedMember.name}` : ""}`],
      [],
      ["Member", "Currency", "Income", "Expenses", "Net"],
      ...memberTotals.map((m) => [m.name, m.currency, m.income, m.expense, m.net]),
      [],
      [`Combined totals (${currencyLabel})`],
      ["Total income", totals.income],
      ["Total expenses", totals.expense],
      ["Net savings", totals.net],
      [],
      ["Month", "Income", "Expenses", "Net"],
      ...series.map((m) => [m.label, m.income, m.expense, m.net]),
      [],
      ["Expenses by category (merged across members)", "Amount", "Transactions"],
      ...expenseCats.map((c) => [c.name, c.total, c.count]),
      [],
      ["Income by category (merged across members)", "Amount", "Transactions"],
      ...incomeCats.map((c) => [c.name, c.total, c.count]),
    ];

    await audit(user.id, "data.export", `${group.name} ${year} group report`);
    const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return csvResponse(`ledgerly-${slug || "group"}-report-${year}.csv`, rows);
  } catch (e) {
    console.error("Group report export failed", e);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
