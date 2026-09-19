"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Receipt, Trash2 } from "lucide-react";
import type { UserOptions } from "@/lib/queries";
import { deleteTransaction } from "../_actions/finance";
import { Card, EmptyState, cn } from "@/components/ui";
import { CategoryIcon } from "@/components/icon";
import { ConfirmAction } from "@/components/confirm";
import { TransactionModal, type TxDraft } from "@/components/transaction-form";
import { TxAmount } from "@/components/tx-row";

type Row = Omit<TxDraft, "amount"> & { id: string; amount: number; category: { name: string; color: string; icon: string }; account: { name: string; color: string } };

export function TxTable({ rows, options, currency, page, pageCount, total }: { rows: Row[]; options: UserOptions; currency: string; page: number; pageCount: number; total: number }) {
  const [editing, setEditing] = useState<TxDraft | null>(null);
  const params = useSearchParams();
  const pageHref = (p: number) => { const n = new URLSearchParams(params.toString()); n.set("page", String(p)); return `?${n}`; };

  if (rows.length === 0) {
    return <Card><EmptyState icon={<Receipt size={20} />} title="No transactions found" description="Try changing the filters, or add a new transaction." /></Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/60 text-left text-xs font-medium text-muted">
              <th className="px-5 py-3 font-medium">Transaction</th>
              <th className="hidden px-3 py-3 font-medium md:table-cell">Category</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">Account</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell">Date</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="w-24 px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="group transition hover:bg-surface-2/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon name={r.category.icon} color={r.category.color} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.description}</p>
                      <p className="truncate text-xs text-muted md:hidden">{r.category.name} · {r.date}</p>
                      {r.notes && <p className="hidden max-w-xs truncate text-xs text-muted md:block">{r.notes}</p>}
                    </div>
                  </div>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
                    <span className="size-1.5 rounded-full" style={{ background: r.category.color }} /> {r.category.name}
                  </span>
                </td>
                <td className="hidden px-3 py-3 text-muted lg:table-cell">{r.account.name}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-muted tabular sm:table-cell">
                  {new Date(r.date + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                </td>
                <td className="px-3 py-3 text-right"><TxAmount type={r.type} amount={r.amount} currency={currency} /></td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                    <button onClick={() => setEditing({ ...r, amount: String(r.amount) })} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-fg" aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <ConfirmAction
                      title="Delete transaction?"
                      description={`“${r.description}” will be permanently removed.`}
                      action={() => deleteTransaction(r.id)}
                      trigger={(open) => (
                        <button onClick={open} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-expense-soft hover:text-expense" aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      )}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
        <span>{total} transaction{total === 1 ? "" : "s"} · page {page} of {pageCount}</span>
        <div className="flex gap-1">
          <Link aria-disabled={page <= 1} href={pageHref(page - 1)} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft size={16} /></Link>
          <Link aria-disabled={page >= pageCount} href={pageHref(page + 1)} className={cn("grid size-8 place-items-center rounded-lg border border-border hover:bg-surface-2", page >= pageCount && "pointer-events-none opacity-40")}><ChevronRight size={16} /></Link>
        </div>
      </div>
      {editing && <TransactionModal open onClose={() => setEditing(null)} options={options} initial={editing} currency={currency} />}
    </Card>
  );
}
