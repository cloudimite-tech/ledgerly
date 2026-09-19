import Link from "next/link";
import { Activity, ArrowRight, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/queries";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { AuditRow } from "./audit/row";

export const metadata = { title: "Admin" };

export default async function AdminOverview() {
  await requirePermission("users:read");
  const { start } = monthRange();
  const since = new Date(Date.now() - 7 * 864e5);
  const [total, active, admins, newThisMonth, activeWeek, txCount, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: since } } }),
    prisma.transaction.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true, email: true } } } }),
  ]);

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Admin" title="Administration" description="Platform health and user management. Admins can't see a user's financial records unless that user is in a group the admin set up." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={String(total)} icon={<Users size={18} />} sub={`${admins} admin${admins === 1 ? "" : "s"}`} />
        <StatCard label="Active accounts" value={String(active)} icon={<UserCheck size={18} />} tone="income" sub={`${total - active} suspended`} />
        <StatCard label="New this month" value={String(newThisMonth)} icon={<UserPlus size={18} />} tone="neutral" sub="sign-ups" />
        <StatCard label="Active last 7 days" value={String(activeWeek)} icon={<Activity size={18} />} tone="neutral" sub={`${txCount.toLocaleString()} transactions stored`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" action={<Link href="/admin/audit" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Full audit log <ArrowRight size={12} /></Link>} />
          <div className="mt-2 divide-y divide-border">{recent.map((r) => <AuditRow key={r.id} log={r} />)}</div>
        </Card>
        <Card className="h-fit p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><ShieldCheck size={20} /></span>
          <h3 className="mt-4 font-semibold">Role-based access</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><b className="text-fg">User</b> — manages only their own accounts, categories, transactions & budgets.</li>
            <li><b className="text-fg">Admin</b> — everything a user can do, plus create / suspend users, change roles, reset passwords, read the audit log, and set up groups to review specific members' transactions together.</li>
          </ul>
          <Link href="/admin/users" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Manage users <ArrowRight size={14} /></Link>
        </Card>
      </div>
    </div>
  );
}
