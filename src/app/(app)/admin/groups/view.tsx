"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteGroup, saveGroup } from "./actions";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { Modal } from "@/components/modal";
import { ConfirmAction } from "@/components/confirm";

type G = { id: string; name: string; description: string | null; memberCount: number; createdBy: string | null; createdAt: string };
type UserLite = { id: string; name: string; email: string; status: "ACTIVE" | "SUSPENDED" };

export function GroupsView({ groups, users }: { groups: G[]; users: UserLite[] }) {
  const [editing, setEditing] = useState<{ id?: string; name: string; description: string } | null>(null);
  const router = useRouter();

  return (
    <>
      <PageHeader eyebrow="Admin" title="Groups" description="Group users together to review their transactions side by side — for households, teams or shared budgets.">
        <Button onClick={() => setEditing({ name: "", description: "" })}><Plus size={16} /> New group</Button>
      </PageHeader>

      {groups.length === 0 ? (
        <Card><EmptyState icon={<Layers size={20} />} title="No groups yet" description="Create a group and add members to see their combined transactions in one place." action={<Button onClick={() => setEditing({ name: "", description: "" })}><Plus size={16} /> Create group</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} interactive className="group relative p-5">
              <div className="absolute right-3 top-3 flex gap-0.5 rounded-lg bg-surface opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                <button onClick={() => setEditing({ id: g.id, name: g.name, description: g.description ?? "" })} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit"><Pencil size={14} /></button>
                <ConfirmAction
                  title={`Delete “${g.name}”?`}
                  description="Members keep their own accounts and transactions — only the group itself is removed."
                  action={() => deleteGroup(g.id)}
                  trigger={(open) => <button onClick={open} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Delete"><Trash2 size={14} /></button>}
                />
              </div>
              <Link href={`/admin/groups/${g.id}`} className="block">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><Layers size={20} /></span>
                <p className="mt-4 truncate pr-16 font-semibold">{g.name}</p>
                {g.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{g.description}</p>}
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-xs text-muted">
                  <Badge><Users size={11} /> {g.memberCount} member{g.memberCount === 1 ? "" : "s"}</Badge>
                  {g.createdBy && <span>· by {g.createdBy}</span>}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit group" : "New group"} width="max-w-md">
        {editing && (
          <GroupForm
            initial={editing}
            users={users}
            onDone={(id) => { setEditing(null); if (id && !editing.id) router.push(`/admin/groups/${id}`); }}
          />
        )}
      </Modal>
    </>
  );
}

function GroupForm({ initial, onDone }: { initial: { id?: string; name: string; description: string }; users: UserLite[]; onDone: (id?: string) => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveGroup(d);
          if (r.ok) { toast.success(r.message); onDone(r.id); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); }
        });
      }}
    >
      <Field label="Name" htmlFor="gname" error={err.name?.[0]}>
        <Input id="gname" autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Household, Family, Engineering team" />
      </Field>
      <Field label="Description" htmlFor="gdesc" hint="Optional">
        <Textarea id="gdesc" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="What this group is for" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => onDone()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} {initial.id ? "Save changes" : "Create group"}</Button>
      </div>
    </form>
  );
}
