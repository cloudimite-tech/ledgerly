import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, cn } from "@/components/ui";
import { AuditRow } from "./row";

export const metadata = { title: "Audit log" };
const SIZE = 30;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("audit:read");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * SIZE, take: SIZE, include: { actor: { select: { name: true, email: true } } } }),
    prisma.auditLog.count(),
  ]);
  const pages = Math.max(1, Math.ceil(total / SIZE));
  return (
    <div className="animate-in">
      <PageHeader title="Audit log" description="Security-relevant events across the platform." />
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">{logs.map((l) => <AuditRow key={l.id} log={l} />)}</div>
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
          <span>{total} events · page {page} of {pages}</span>
          <div className="flex gap-1">
            <Link href={`?page=${page - 1}`} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft size={16} /></Link>
            <Link href={`?page=${page + 1}`} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", page >= pages && "pointer-events-none opacity-40")}><ChevronRight size={16} /></Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
