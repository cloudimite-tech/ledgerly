"use client";
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2, MoreHorizontal, Search, ShieldCheck, ShieldOff, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { createUser, deleteUser, resetUserPassword, setUserRole, setUserStatus } from "../actions";
import { Badge, Button, Card, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import { Modal } from "@/components/modal";
import { Dropdown, DropdownItem } from "@/components/dropdown";
import { ConfirmAction } from "@/components/confirm";
import { Avatar } from "@/components/avatar";

type U = { id: string; name: string; email: string; role: "ADMIN" | "USER"; status: "ACTIVE" | "SUSPENDED"; createdAt: string; lastLoginAt: string | null; txCount: number };

function relative(iso: string | null) {
  if (!iso) return "Never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function UsersView({ users, meId }: { users: U[]; meId: string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(
    () => users.filter((u) => (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))),
    [users, q, role],
  );

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; tempPassword?: string }>, email?: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); if (r.tempPassword && email) setSecret({ email, password: r.tempPassword }); }
      else toast.error(r.error);
    });

  return (
    <>
      <PageHeader title="Users" description={`${users.length} account${users.length === 1 ? "" : "s"} on this workspace`}>
        <Button onClick={() => setCreating(true)}><UserPlus size={16} /> Add user</Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="sm:w-44" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option><option value="ADMIN">Admins</option><option value="USER">Users</option>
        </Select>
      </div>

      <Card className={cn("overflow-visible transition", pending && "opacity-70")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Transactions</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Last sign-in</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Joined</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((u) => {
                const me = u.id === meId;
                return (
                  <tr key={u.id} className="hover:bg-surface-2/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} suspended={u.status === "SUSPENDED"} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name} {me && <span className="text-xs font-normal text-muted">(you)</span>}</p>
                          <p className="truncate text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{u.role === "ADMIN" ? <Badge tone="primary"><ShieldCheck size={11} /> Admin</Badge> : <Badge>User</Badge>}</td>
                    <td className="px-3 py-3">{u.status === "ACTIVE" ? <Badge tone="income">Active</Badge> : <Badge tone="expense">Suspended</Badge>}</td>
                    <td className="hidden px-3 py-3 text-muted tabular md:table-cell">{u.txCount.toLocaleString()}</td>
                    <td className="hidden px-3 py-3 text-muted lg:table-cell">{relative(u.lastLoginAt)}</td>
                    <td className="hidden px-3 py-3 text-muted lg:table-cell">{new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="relative px-3 py-3">
                      {!me && (
                        <Dropdown
                          trigger={({ onClick, ref }) => (
                            <button ref={ref} onClick={onClick} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Actions"><MoreHorizontal size={16} /></button>
                          )}
                        >
                          {(close) => (
                            <>
                              <DropdownItem icon={u.role === "ADMIN" ? ShieldOff : ShieldCheck} onClick={() => { close(); run(() => setUserRole(u.id, u.role === "ADMIN" ? "USER" : "ADMIN")); }}>
                                {u.role === "ADMIN" ? "Make regular user" : "Make admin"}
                              </DropdownItem>
                              <DropdownItem icon={u.status === "ACTIVE" ? UserX : UserCheck} onClick={() => { close(); run(() => setUserStatus(u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")); }}>
                                {u.status === "ACTIVE" ? "Suspend access" : "Reactivate"}
                              </DropdownItem>
                              <DropdownItem icon={KeyRound} onClick={() => { close(); run(() => resetUserPassword(u.id), u.email); }}>Reset password</DropdownItem>
                              <div className="my-1 h-px bg-border" />
                              <ConfirmAction
                                title={`Delete ${u.name}?`}
                                description={`This permanently deletes ${u.email} and all of their accounts, categories, budgets and ${u.txCount} transactions. This can't be undone.`}
                                confirmLabel="Delete user"
                                action={() => deleteUser(u.id)}
                                onDone={close}
                                trigger={(open) => <DropdownItem icon={Trash2} danger onClick={() => { close(); open(); }}>Delete user</DropdownItem>}
                              />
                            </>
                          )}
                        </Dropdown>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-8 text-center text-sm text-muted">No users match your search.</p>}
        </div>
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add user" description="A temporary password will be generated for them." width="max-w-md">
        {creating && <CreateUserForm onDone={(email, password) => { setCreating(false); if (password) setSecret({ email, password }); }} />}
      </Modal>

      <Modal open={!!secret} onClose={() => setSecret(null)} title="Temporary password" description="Share this securely. It won't be shown again." width="max-w-md">
        {secret && <SecretBox {...secret} onClose={() => setSecret(null)} />}
      </Modal>
    </>
  );
}


function CreateUserForm({ onDone }: { onDone: (email: string, password?: string) => void }) {
  const [d, setD] = useState({ name: "", email: "", role: "USER" as "ADMIN" | "USER" });
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await createUser(d); if (r.ok) { toast.success(r.message); onDone(d.email, r.tempPassword); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); } }); }}>
      <Field label="Full name" htmlFor="uname" error={err.name?.[0]}><Input id="uname" autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Email" htmlFor="uemail" error={err.email?.[0]}><Input id="uemail" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
      <Field label="Role">
        <div className="grid grid-cols-2 gap-2">
          {(["USER", "ADMIN"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setD({ ...d, role: r })} className={cn("cursor-pointer rounded-xl border p-3 text-left transition", d.role === r ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2")}>
              <p className="text-sm font-medium">{r === "ADMIN" ? "Admin" : "User"}</p>
              <p className="text-xs text-muted">{r === "ADMIN" ? "Manages users & audit" : "Own finances only"}</p>
            </button>
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => onDone("")}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Create user</Button>
      </div>
    </form>
  );
}

function SecretBox({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-sm text-muted">For <b className="text-fg">{email}</b></p>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3">
        <code className="flex-1 font-mono text-base">{password}</code>
        <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(password); setCopied(true); }}>
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted">Ask them to change it from Settings after signing in.</p>
      <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
    </div>
  );
}
