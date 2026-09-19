"use client";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Banknote, CreditCard, Landmark, Loader2, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { deleteAccount, saveAccount, toggleArchiveAccount } from "../_actions/finance";
import { Badge, Button, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import { Modal } from "@/components/modal";
import { ColorPicker } from "@/components/pickers";
import { ConfirmAction } from "@/components/confirm";
import { Blob } from "@/components/blob";
import { formatMoney } from "@/lib/money";

type AccType = "CASH" | "BANK" | "CARD" | "SAVINGS" | "OTHER";
type Acc = { id: string; name: string; type: AccType; color: string; archived: boolean; openingBalance: number; balance: number; income: number; expense: number; count: number };
type Draft = { id?: string; name: string; type: AccType; color: string; openingBalance: string };

const TYPE_META: Record<AccType, { label: string; icon: typeof Wallet }> = {
  CASH: { label: "Cash", icon: Banknote },
  BANK: { label: "Bank", icon: Landmark },
  CARD: { label: "Credit card", icon: CreditCard },
  SAVINGS: { label: "Savings", icon: PiggyBank },
  OTHER: { label: "Other", icon: Wallet },
};

export function AccountsView({ accounts, currency }: { accounts: Acc[]; currency: string }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [, start] = useTransition();
  const active = accounts.filter((a) => !a.archived);
  const net = active.reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <PageHeader title="Accounts" description="Wallets, bank accounts and cards you track money in.">
        <Button onClick={() => setEditing({ name: "", type: "BANK", color: "#a8461f", openingBalance: "0" })}><Plus size={16} /> New account</Button>
      </PageHeader>

      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <Blob className="pointer-events-none absolute -right-16 -top-20 size-72 opacity-[0.07]" />
        <p className="text-sm text-muted">Net worth across {active.length} active account{active.length === 1 ? "" : "s"}</p>
        <p className={cn("mt-2 text-3xl font-semibold tracking-tight tabular sm:text-4xl", net < 0 && "text-expense")}>{formatMoney(net, currency)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => {
          const M = TYPE_META[a.type];
          return (
            <div key={a.id} className={cn("group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card transition", a.archived && "opacity-60")}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: a.color }} />
              <div className="flex items-start gap-3">
                <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `${a.color}1f`, color: a.color }}><M.icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.name}</p>
                  <div className="mt-0.5 flex gap-1.5"><Badge>{M.label}</Badge>{a.archived && <Badge tone="warn">Archived</Badge>}</div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => setEditing({ id: a.id, name: a.name, type: a.type, color: a.color, openingBalance: String(a.openingBalance) })} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => start(async () => { const r = await toggleArchiveAccount(a.id); r.ok ? toast.success(r.message) : toast.error(r.error); })} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Archive">
                    {a.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <ConfirmAction title={`Delete "${a.name}"?`} description={a.count > 0 ? "This account has transactions and can't be deleted. Archive it instead to hide it." : "This account will be permanently removed."}
                    action={() => deleteAccount(a.id)}
                    trigger={(open) => <button onClick={open} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Delete"><Trash2 size={14} /></button>} />
                </div>
              </div>
              <p className={cn("mt-5 text-2xl font-semibold tracking-tight tabular", a.balance < 0 && "text-expense")}>{formatMoney(a.balance, currency)}</p>
              <p className="text-xs text-muted">Current balance · {a.count} transactions</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
                <div><p className="text-muted">Opening</p><p className="mt-0.5 font-medium tabular">{formatMoney(a.openingBalance, currency, { compact: true })}</p></div>
                <div><p className="text-muted">In</p><p className="mt-0.5 font-medium text-income tabular">{formatMoney(a.income, currency, { compact: true })}</p></div>
                <div><p className="text-muted">Out</p><p className="mt-0.5 font-medium text-expense tabular">{formatMoney(a.expense, currency, { compact: true })}</p></div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit account" : "New account"}>
        {editing && <AccountForm initial={editing} currency={currency} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function AccountForm({ initial, onDone, currency }: { initial: Draft; onDone: () => void; currency: string }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveAccount(d); if (r.ok) { toast.success(r.message); onDone(); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); } }); }}>
      <Field label="Name" htmlFor="aname" error={err.name?.[0]}><Input id="aname" autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Commercial Bank" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor="atype">
          <Select id="atype" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as AccType })}>
            {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label={`Opening balance (${currency})`} htmlFor="aob" error={err.openingBalance?.[0]}>
          <Input id="aob" type="number" step="0.01" value={d.openingBalance} onChange={(e) => setD({ ...d, openingBalance: e.target.value })} />
        </Field>
      </div>
      <Field label="Color"><ColorPicker value={d.color} onChange={(color) => setD({ ...d, color })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Save</Button>
      </div>
    </form>
  );
}
