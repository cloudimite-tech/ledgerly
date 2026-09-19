import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listGroupsWithCounts } from "@/lib/groups";
import { GroupsView } from "./view";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  await requirePermission("groups:read");
  const [groups, users] = await Promise.all([
    listGroupsWithCounts(),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, status: true } }),
  ]);
  return (
    <div className="animate-in">
      <GroupsView
        groups={groups.map((g) => ({ ...g, createdAt: g.createdAt.toISOString() }))}
        users={users}
      />
    </div>
  );
}
