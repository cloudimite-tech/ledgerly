"use client";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBudget, saveBudget } from "../_actions/finance";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CategoryIcon } from "@/components/icon";
import { ConfirmAction } from "@/components/confirm";
import { formatMoney } from "@/lib/money";

type B = { id: string; categoryId: string; name: string; color: string; icon: string; limit: number; spent: number; pct: number };
type Cat = { id: string; name: string; color: string; icon: string };

export function BudgetsView({ budgets, expenseCategories, currency, monthLabel, monthProgress, daysLeft }: {
  budgets: B[]; expenseCategories: Cat[]; currency: string; monthLabel: string; monthProgress: number; daysLeft: number;
}) {
  const [editing, setEditing] = useState<{ categoryId: string; amount: string; locked?: boolean } | null>(null);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalLimit ? (totalSpent / totalLimit) * 100 : 0;
  const available = expenseCategories.filter((c) => !budgets.some((b) => b.categoryId === c.id));
  const over = budgets.filter((b) => b.pct >= 100).length;

  return (
    <>
      <PageHeader title="Budgets" description={`Monthly spending limits · ${monthLabel}`}>
        <Button disabled={available.length === 0} onClick={() => setEditing({ categoryId: available[0]?.id ?? "", amount: "" })}><Plus size={16} /> New budget</Button>
      </PageHeader>

      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-sm text-muted">Spent of total budget</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular">
              {formatMoney(totalSpent, currency)} <span className="text-base font-normal text-muted">/ {formatMoney(totalLimit, currency)}</span>
            </p>
            <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
              <div className={cn("h-full rounded-full transition-all", totalPct >= 100 ? "bg-expense" : totalPct > monthProgress ? "bg-warn" : "bg-income")} style={{ width: `${Math.min(totalPct, 100)}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-fg/50" style={{ left: `${monthProgress}%` }} title="Today" />
            </div>
            <p className="mt-2 text-xs text-muted">The marker shows how far through the month you are · {daysLeft} days left</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-72">
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-xs text-muted">Remaining</p><p className={cn("mt-1 font-semibold tabular", totalLimit - totalSpent < 0 && "text-expense")}>{formatMoney(totalLimit - totalSpent, currency, { compact: true })}</p></div>
            <div className="rounded-2xl bg-surface-2 p-4"><p className="text-xs text-muted">Over budget</p><p className={cn("mt-1 font-semibold", over > 0 && "text-expense")}>{over} of {budgets.length}</p></div>
          </div>
        </div>
      </Card>

      {budgets.length === 0 ? (
        <Card><EmptyState icon={<PiggyBank size={20} />} title="No budgets yet" description="Set a monthly limit for a category to keep spending in check." action={<Button onClick={() => setEditing({ categoryId: available[0]?.id ?? "", amount: "" })}><Plus size={16} /> Create budget</Button>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const status = b.pct >= 100 ? "over" : b.pct >= 80 ? "near" : "ok";
            return (
              <Card key={b.id} className="group p-5">
                <div className="flex items-center gap-3">
                  <CategoryIcon name={b.icon} color={b.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.name}</p>
                    {status === "over" ? <Badge tone="expense"><AlertTriangle size={11} /> Over budget</Badge> : status === "near" ? <Badge tone="warn"><AlertTriangle size={11} /> Almost there</Badge> : <Badge tone="income"><CheckCircle2 size={11} /> On track</Badge>}
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={() => setEditing({ categoryId: b.categoryId, amount: String(b.limit), locked: true })} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit"><Pencil size={14} /></button>
                    <ConfirmAction title="Remove budget?" description={`The monthly limit for ${b.name} will be removed. Transactions are not affected.`} confirmLabel="Remove" action={() => deleteBudget(b.id)}
                      trigger={(open) => <button onClick={open} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Delete"><Trash2 size={14} /></button>} />
                  </div>
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <p className="text-xl font-semibold tabular">{formatMoney(b.spent, currency)}</p>
                  <p className="text-xs text-muted tabular">of {formatMoney(b.limit, currency)}</p>
                </div>
                <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className={cn("h-full rounded-full", status === "over" ? "bg-expense" : status === "near" ? "bg-warn" : "bg-income")} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span className="tabular">{b.pct.toFixed(0)}% used</span>
                  <span className={cn("tabular", b.limit - b.spent < 0 && "font-medium text-expense")}>
                    {b.limit - b.spent >= 0 ? `${formatMoney(b.limit - b.spent, currency)} left` : `${formatMoney(b.spent - b.limit, currency)} over`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.locked ? "Edit budget" : "New budget"} description="Limits reset at the start of each month." width="max-w-md">
        {editing && <BudgetForm initial={editing} categories={editing.locked ? expenseCategories : available} currency={currency} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function BudgetForm({ initial, categories, currency, onDone }: { initial: { categoryId: string; amount: string; locked?: boolean }; categories: Cat[]; currency: string; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveBudget(d); if (r.ok) { toast.success(r.message); onDone(); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); } }); }}>
      <Field label="Category" htmlFor="bcat" error={err.categoryId?.[0]}>
        <Select id="bcat" disabled={initial.locked} value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={`Monthly limit (${currency})`} htmlFor="bamt" error={err.amount?.[0]}>
        <Input id="bamt" autoFocus type="number" step="0.01" min="0" value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} placeholder="25000" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Save budget</Button>
      </div>
    </form>
  );
}
