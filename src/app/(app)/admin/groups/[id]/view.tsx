"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Search, UserMinus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { addGroupMember, removeGroupMember } from "../actions";
import { Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader, Select, cn } from "@/components/ui";
import { Modal } from "@/components/modal";
import { ConfirmAction } from "@/components/confirm";
import { CategoryIcon } from "@/components/icon";
import { TxAmount } from "@/components/tx-row";
import { GroupTabs } from "@/components/group-tabs";
import { Avatar } from "@/components/avatar";
import { formatMoney } from "@/lib/money";

type Member = { id: string; name: string; email: string; currency: string; status: "ACTIVE" | "SUSPENDED"; role: "ADMIN" | "USER"; membershipId: string; addedAt: string };
type Summary = { userId: string; income: number; expense: number; net: number; count: number };
type Row = { id: string; type: "INCOME" | "EXPENSE"; amount: number; date: string; description: string; category: { name: string; color: string; icon: string }; account: { name: string }; member: { id: string; name: string; currency: string } };
type Feed = { rows: Row[]; total: number; page: number; pageCount: number; income: number; expense: number };
type AvailableUser = { id: string; name: string; email: string; status: "ACTIVE" | "SUSPENDED" };

export function GroupDetailView({ group, members, summaries, feed, feedCurrency, availableUsers }: {
  group: { id: string; name: string; description: string | null; createdAt: string };
  members: Member[];
  summaries: Summary[];
  feed: Feed;
  feedCurrency: string | null;
  availableUsers: AvailableUser[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Link href="/admin/groups" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft size={14} /> All groups</Link>
      <PageHeader eyebrow="Group" title={group.name} description={group.description ?? `${members.length} member${members.length === 1 ? "" : "s"}`}>
        <Button onClick={() => setAdding(true)}><UserPlus size={16} /> Add member</Button>
      </PageHeader>
      <GroupTabs groupId={group.id} />

      {members.length === 0 ? (
        <Card className="mb-6"><EmptyState icon={<UserPlus size={20} />} title="No members yet" description="Add users to this group to see their transactions here." action={<Button onClick={() => setAdding(true)}><UserPlus size={16} /> Add member</Button>} /></Card>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => {
            const s = summaries.find((x) => x.userId === m.id);
            return (
              <Card key={m.id} className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={m.name} size={10} suspended={m.status === "SUSPENDED"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted">{m.email}</p>
                  </div>
                  <ConfirmAction
                    title={`Remove ${m.name}?`}
                    description={`${m.name} will no longer be part of "${group.name}". Their accounts and transactions are unaffected.`}
                    confirmLabel="Remove"
                    action={() => removeGroupMember(group.id, m.id)}
                    trigger={(open) => <button onClick={open} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Remove member"><UserMinus size={14} /></button>}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
                  <div><p className="text-muted">Income</p><p className="mt-0.5 font-medium text-income tabular">{formatMoney(s?.income ?? 0, m.currency, { compact: true })}</p></div>
                  <div><p className="text-muted">Expense</p><p className="mt-0.5 font-medium text-expense tabular">{formatMoney(s?.expense ?? 0, m.currency, { compact: true })}</p></div>
                  <div><p className="text-muted">Net</p><p className={cn("mt-0.5 font-medium tabular", (s?.net ?? 0) < 0 && "text-expense")}>{formatMoney(s?.net ?? 0, m.currency, { compact: true })}</p></div>
                </div>
                <p className="mt-2 text-[11px] text-muted">This month · {s?.count ?? 0} transaction{s?.count === 1 ? "" : "s"}</p>
              </Card>
            );
          })}
        </div>
      )}

      {members.length > 0 && (
        <>
          <GroupFilters members={members} />
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: "Income", value: feed.income, cls: "text-income" },
              { label: "Expenses", value: feed.expense, cls: "text-expense" },
              { label: "Net", value: feed.income - feed.expense, cls: feed.income - feed.expense >= 0 ? "text-fg" : "text-expense" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface px-4 py-3">
                <p className="text-xs text-muted">{s.label}</p>
                {feedCurrency ? (
                  <p className={`mt-0.5 truncate text-base font-semibold tabular sm:text-lg ${s.cls}`}>{formatMoney(s.value, feedCurrency)}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-muted">Mixed currencies</p>
                )}
              </div>
            ))}
          </div>
          <GroupFeedTable feed={feed} />
        </>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add member" description="Only users who aren't already in this group are shown." width="max-w-md">
        {adding && <AddMemberForm groupId={group.id} groupName={group.name} candidates={availableUsers} onDone={() => setAdding(false)} />}
      </Modal>
    </>
  );
}

function GroupFilters({ members }: { members: Member[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    start(() => router.replace(`${path}?${next.toString()}`));
  };

  useEffect(() => {
    const t = setTimeout(() => { if ((params.get("q") ?? "") !== q) update("q", q); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["member", "type", "from", "to", "q"].some((k) => params.get(k));

  return (
    <div className={cn("mb-4 rounded-2xl border border-border bg-surface p-3 transition", pending && "opacity-70")}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Search description or notes…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={params.get("member") ?? ""} onChange={(e) => update("member", e.target.value)}>
          <option value="">All members</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <Select value={params.get("type") ?? ""} onChange={(e) => update("type", e.target.value)}>
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </Select>
        <Input type="date" aria-label="From" value={params.get("from") ?? ""} onChange={(e) => update("from", e.target.value)} />
        <Input type="date" aria-label="To" value={params.get("to") ?? ""} onChange={(e) => update("to", e.target.value)} />
        <button
          disabled={!active}
          onClick={() => { setQ(""); start(() => router.replace(path)); }}
          className="flex h-10 cursor-pointer items-center justify-center gap-1 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg disabled:cursor-default disabled:opacity-40"
        >
          <X size={14} /> Clear
        </button>
      </div>
    </div>
  );
}

function GroupFeedTable({ feed }: { feed: Feed }) {
  const params = useSearchParams();
  const pageHref = (p: number) => { const n = new URLSearchParams(params.toString()); n.set("page", String(p)); return `?${n}`; };

  if (feed.rows.length === 0) {
    return <Card><EmptyState icon={<Search size={20} />} title="No transactions found" description="Try a different member, date range or search term." /></Card>;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Transactions" description="Across the members shown above" />
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-medium text-muted">
              <th className="px-5 py-3 font-medium">Transaction</th>
              <th className="px-3 py-3 font-medium">Member</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Category</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Account</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell">Date</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {feed.rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-2/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon name={r.category.icon} color={r.category.color} />
                    <p className="truncate font-medium">{r.description}</p>
                  </div>
                </td>
                <td className="px-3 py-3"><Badge>{r.member.name}</Badge></td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ background: r.category.color }} /> {r.category.name}
                  </span>
                </td>
                <td className="hidden px-3 py-3 text-muted lg:table-cell">{r.account.name}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-muted tabular sm:table-cell">
                  {new Date(r.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                </td>
                <td className="px-3 py-3 text-right"><TxAmount type={r.type} amount={r.amount} currency={r.member.currency} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
        <span>{feed.total} transaction{feed.total === 1 ? "" : "s"} · page {feed.page} of {feed.pageCount}</span>
        <div className="flex gap-1">
          <Link href={pageHref(feed.page - 1)} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", feed.page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft size={16} /></Link>
          <Link href={pageHref(feed.page + 1)} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", feed.page >= feed.pageCount && "pointer-events-none opacity-40")}><ChevronRight size={16} /></Link>
        </div>
      </div>
    </Card>
  );
}

function AddMemberForm({ groupId, groupName, candidates, onDone }: { groupId: string; groupName: string; candidates: AvailableUser[]; onDone: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, start] = useTransition();
  const list = candidates.filter((u) => !addedIds.includes(u.id) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())));

  // Adding is a multi-select action: each tap adds one person and the list stays
  // open so the admin can add several members in a row, then close it when done.
  const add = (u: AvailableUser) => {
    setPendingId(u.id);
    start(async () => {
      const r = await addGroupMember(groupId, u.id);
      setPendingId(null);
      if (r.ok) {
        toast.success(r.message);
        setAddedIds((ids) => [...ids, u.id]);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input autoFocus className="pl-9" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted">{candidates.length === addedIds.length ? `Everyone is already in ${groupName}.` : "No matching users."}</p>}
        {list.map((u) => {
          const isPending = pendingId === u.id;
          return (
            <button key={u.id} disabled={pendingId !== null} onClick={() => add(u)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition hover:bg-surface-2 disabled:opacity-50">
              <Avatar name={u.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              {u.status === "SUSPENDED" && <Badge tone="expense">Suspended</Badge>}
              {isPending ? <Loader2 size={15} className="animate-spin text-muted" /> : <UserPlus size={15} className="text-muted" />}
            </button>
          );
        })}
        {addedIds.length > 0 && list.length === 0 && candidates.length > addedIds.length && (
          <p className="py-6 text-center text-sm text-muted">No more matches.</p>
        )}
      </div>
      {addedIds.length > 0 && <p className="mt-3 text-xs text-muted">Added {addedIds.length} member{addedIds.length === 1 ? "" : "s"}.</p>}
      <div className="mt-4 flex justify-end"><Button type="button" onClick={onDone}>Done</Button></div>
    </div>
  );
}
