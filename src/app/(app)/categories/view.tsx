"use client";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory, saveCategory } from "../_actions/finance";
import { Button, Card, Field, Input, PageHeader, cn } from "@/components/ui";
import { Modal } from "@/components/modal";
import { CategoryIcon } from "@/components/icon";
import { ColorPicker, IconPicker } from "@/components/pickers";
import { ConfirmAction } from "@/components/confirm";
import { formatMoney } from "@/lib/money";

type Cat = { id?: string; name: string; type: "INCOME" | "EXPENSE"; color: string; icon: string };
type Row = Required<Cat> & { count: number; month: number };

export function CategoriesView({ categories, currency }: { categories: Row[]; currency: string }) {
  const [editing, setEditing] = useState<Cat | null>(null);
  const groups = [
    { type: "EXPENSE" as const, title: "Expense categories", tone: "text-expense" },
    { type: "INCOME" as const, title: "Income categories", tone: "text-income" },
  ];
  return (
    <>
      <PageHeader title="Categories" description="Organise your income and spending the way you think about it.">
        <Button onClick={() => setEditing({ name: "", type: "EXPENSE", color: "#64748b", icon: "tag" })}><Plus size={16} /> New category</Button>
      </PageHeader>

      <div className="space-y-8">
        {groups.map((g) => {
          const list = categories.filter((c) => c.type === g.type);
          return (
            <section key={g.type}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <span className={g.tone}>●</span> {g.title} <span className="font-normal text-muted">({list.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((c) => (
                  <Card key={c.id} className="group relative p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start gap-3">
                      <CategoryIcon name={c.icon} color={c.color} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted">{c.count} transaction{c.count === 1 ? "" : "s"}</p>
                      </div>
                      <div className="absolute right-3 top-3 flex gap-0.5 rounded-lg bg-surface opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                        <button onClick={() => setEditing(c)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Edit"><Pencil size={14} /></button>
                        <ConfirmAction
                          title={`Delete “${c.name}”?`}
                          description={c.count > 0 ? "This category has transactions, so it can't be deleted until they're moved or removed." : "This category will be permanently removed."}
                          action={() => deleteCategory(c.id)}
                          trigger={(open) => <button onClick={open} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Delete"><Trash2 size={14} /></button>}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
                      <span className="text-xs text-muted">This month</span>
                      <span className={cn("text-sm font-semibold tabular", c.month === 0 && "text-muted")}>{formatMoney(c.month, currency)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit category" : "New category"}>
        {editing && <CategoryForm initial={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function CategoryForm({ initial, onDone }: { initial: Cat; onDone: () => void }) {
  const [c, setC] = useState(initial);
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveCategory(c);
          if (r.ok) { toast.success(r.message); onDone(); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); }
        });
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <CategoryIcon name={c.icon} color={c.color} size="lg" />
        <div>
          <p className="font-medium">{c.name || "Category name"}</p>
          <p className="text-xs text-muted">{c.type === "INCOME" ? "Income" : "Expense"}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setC({ ...c, type: t })}
            className={cn("h-9 cursor-pointer rounded-xl text-sm font-medium", c.type === t ? "bg-surface shadow-sm" : "text-muted")}>
            {t === "INCOME" ? "Income" : "Expense"}
          </button>
        ))}
      </div>
      <Field label="Name" htmlFor="cname" error={err.name?.[0]}>
        <Input id="cname" autoFocus value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. Coffee" />
      </Field>
      <Field label="Color"><ColorPicker value={c.color} onChange={(color) => setC({ ...c, color })} /></Field>
      <Field label="Icon"><IconPicker value={c.icon} color={c.color} onChange={(icon) => setC({ ...c, icon })} /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Save</Button>
      </div>
    </form>
  );
}
