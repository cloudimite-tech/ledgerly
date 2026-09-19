import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { groupMemberSummaries, groupTransactions, groupWithMembers, type GroupTxFilters } from "@/lib/groups";
import { GroupDetailView } from "./view";

export const metadata = { title: "Group" };

export default async function GroupDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<GroupTxFilters> }) {
  await requirePermission("groups:read");
  const { id } = await params;
  const group = await groupWithMembers(id);
  if (!group) notFound();

  const memberIds = group.members.map((m) => m.id);
  const f = await searchParams;

  // Members can each pick their own display currency, so a combined total is only
  // meaningful when every transaction in the current view shares one currency.
  const selectedMembers = f.member ? group.members.filter((m) => m.id === f.member) : group.members;
  const currencies = new Set(selectedMembers.map((m) => m.currency));
  const feedCurrency = currencies.size === 1 ? [...currencies][0] : null;

  const [summaries, feed, availableUsers] = await Promise.all([
    groupMemberSummaries(memberIds),
    groupTransactions(memberIds, f),
    prisma.user.findMany({
      where: { id: { notIn: memberIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, status: true },
    }),
  ]);

  return (
    <div className="animate-in">
      <GroupDetailView
        group={{ id: group.id, name: group.name, description: group.description, createdAt: group.createdAt.toISOString() }}
        members={group.members.map((m) => ({ ...m, addedAt: m.addedAt.toISOString() }))}
        summaries={summaries}
        feed={feed}
        feedCurrency={feedCurrency}
        availableUsers={availableUsers}
      />
    </div>
  );
}
