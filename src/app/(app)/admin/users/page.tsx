import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersView } from "./view";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requirePermission("users:read");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true, _count: { select: { transactions: true } } },
  });
  return (
    <div className="animate-in">
      <UsersView
        meId={me.id}
        users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null, txCount: u._count.transactions }))}
      />
    </div>
  );
}
