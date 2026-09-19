import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { buildTxWhere } from "@/lib/tx-filters";
import { audit } from "@/lib/audit";
import { rateLimit, tooManyRequestsMessage } from "@/lib/rate-limit";
import { isCrossSiteRequest } from "@/lib/http-guard";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent CSV formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "reports:own")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (isCrossSiteRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const limit = rateLimit(`export:${user.id}`, 20, 5 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: tooManyRequestsMessage(limit.retryAfterSeconds) }, { status: 429 });

  try {
    const f = Object.fromEntries(req.nextUrl.searchParams);
    const rows = await prisma.transaction.findMany({
      where: buildTxWhere(user.id, f),
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { category: true, account: true },
    });

    const header = ["Date", "Type", "Description", "Category", "Account", `Amount (${user.currency})`, "Notes"];
    const lines = [header, ...rows.map((r) => [r.date.toISOString().slice(0, 10), r.type, r.description, r.category.name, r.account.name, r.amount.toString(), r.notes ?? ""])]
      .map((l) => l.map(csvCell).join(","));

    await audit(user.id, "data.export", `${rows.length} transactions`);
    return new NextResponse("﻿" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledgerly-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Transaction export failed", e);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
