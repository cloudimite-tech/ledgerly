import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { categoryBreakdown, monthlySeries, totalsBetween } from "@/lib/queries";
import { audit } from "@/lib/audit";
import { csvResponse } from "@/lib/csv";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { isCrossSiteRequest } from "@/lib/http-guard";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "reports:own")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (isCrossSiteRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = rateLimit(`export:${user.id}`, 20, 5 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooManyRequestsMessage(limit.retryAfterSeconds) }, { status: 429 });

  try {
    const nowYear = new Date().getFullYear();
    const year = Math.min(nowYear, Math.max(2000, Number(req.nextUrl.searchParams.get("year")) || nowYear));
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const anchor = new Date(year, 11, 1);

    const [series, totals, expenseCats, incomeCats] = await Promise.all([
      monthlySeries(user.id, 12, anchor),
      totalsBetween(user.id, start, end),
      categoryBreakdown(user.id, "EXPENSE", start, end),
      categoryBreakdown(user.id, "INCOME", start, end),
    ]);

    const rows: unknown[][] = [
      [`Ledgerly report — ${user.name} — ${year}`, `Currency: ${user.currency}`],
      [],
      ["Summary"],
      ["Total income", totals.income],
      ["Total expenses", totals.expense],
      ["Net savings", totals.net],
      [],
      ["Month", "Income", "Expenses", "Net"],
      ...series.map((m) => [m.label, m.income, m.expense, m.net]),
      [],
      ["Expenses by category", "Amount", "Transactions"],
      ...expenseCats.map((c) => [c.name, c.total, c.count]),
      [],
      ["Income by category", "Amount", "Transactions"],
      ...incomeCats.map((c) => [c.name, c.total, c.count]),
    ];

    await audit(user.id, "data.export", `${year} report`);
    return csvResponse(`ledgerly-report-${year}.csv`, rows);
  } catch (e) {
    console.error("Report export failed", e);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
