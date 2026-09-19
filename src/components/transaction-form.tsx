"use client";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveTransaction } from "@/app/(app)/_actions/finance";
import type { UserOptions } from "@/lib/queries";
import { Modal } from "./modal";
import { Button, Field, Input, Select, Textarea, cn } from "./ui";
import { CategoryIcon } from "./icon";

export type TxDraft = {
  id?: string; type: "INCOME" | "EXPENSE"; amount: string; date: string; description: string;
  accountId: string; categoryId: string; notes: string;
};

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function blankTx(options: UserOptions, type: "INCOME" | "EXPENSE" = "EXPENSE"): TxDraft {
  return { type, amount: "", date: today(), description: "", accountId: options.accounts[0]?.id ?? "", categoryId: "", notes: "" };
}

export function TransactionModal({ open, onClose, options, initial, currency }: {
  open: boolean; onClose: () => void; options: UserOptions; initial: TxDraft; currency: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={initial.id ? "Edit transaction" : "New transaction"} description="Record money coming in or going out.">
      {open && <TransactionForm key={initial.id ?? "new"} options={options} initial={initial} onDone={onClose} currency={currency} />}
    </Modal>
  );
}

function TransactionForm({ options, initial, onDone, currency }: { options: UserOptions; initial: TxDraft; onDone: () => void; currency: string }) {
  const [d, setD] = useState<TxDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const cats = useMemo(() => options.categories.filter((c) => c.type === d.type), [options.categories, d.type]);
  const set = <K extends keyof TxDraft>(k: K, v: TxDraft[K]) => setD((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveTransaction(d);
      if (r.ok) { toast.success(r.message); onDone(); }
      else { setErrors(r.fieldErrors ?? {}); toast.error(r.error); }
    });
  };

  if (options.accounts.length === 0) {
    return <p className="text-sm text-muted">Create an account first (Accounts page) before adding transactions.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setD((p) => ({ ...p, type: t, categoryId: "" }))}
            className={cn(
              "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition",
              d.type === t ? (t === "INCOME" ? "bg-surface text-income shadow-sm" : "bg-surface text-expense shadow-sm") : "text-muted hover:text-fg",
            )}
          >
            {t === "INCOME" ? <Plus size={16} /> : <Minus size={16} />} {t === "INCOME" ? "Income" : "Expense"}
          </button>
        ))}
      </div>

      <Field label={`Amount (${currency})`} htmlFor="amount" error={errors.amount?.[0]}>
        <Input id="amount" inputMode="decimal" type="number" step="0.01" min="0" autoFocus placeholder="0.00" value={d.amount}
          onChange={(e) => set("amount", e.target.value)} className="h-14 text-2xl font-semibold tabular" />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description?.[0]}>
        <Input id="description" placeholder={d.type === "INCOME" ? "e.g. Monthly salary" : "e.g. Weekly groceries"} value={d.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <Field label="Category" error={errors.categoryId?.[0]}>
        <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
          {cats.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => set("categoryId", c.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-left text-xs font-medium transition",
                d.categoryId === c.id ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
              )}
            >
              <CategoryIcon name={c.icon} color={c.color} size="sm" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          {cats.length === 0 && <p className="col-span-full text-xs text-muted">No {d.type.toLowerCase()} categories yet.</p>}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account" htmlFor="accountId" error={errors.accountId?.[0]}>
          <Select id="accountId" value={d.accountId} onChange={(e) => set("accountId", e.target.value)}>
            {options.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" htmlFor="date" error={errors.date?.[0]}>
          <Input id="date" type="date" value={d.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" hint="Optional">
        <Textarea id="notes" rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />} {initial.id ? "Save changes" : "Add transaction"}
        </Button>
      </div>
    </form>
  );
}

export function AddTransactionButton({ options, currency, label = "Add transaction" }: { options: UserOptions; currency: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> {label}</Button>
      <TransactionModal open={open} onClose={() => setOpen(false)} options={options} initial={blankTx(options)} currency={currency} />
    </>
  );
}
