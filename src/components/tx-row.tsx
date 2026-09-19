import { formatMoney } from "@/lib/money";
import { CategoryIcon } from "./icon";
import { cn } from "./ui";

export function TxAmount({ type, amount, currency, className }: { type: "INCOME" | "EXPENSE"; amount: number; currency: string; className?: string }) {
  return (
    <span className={cn("font-semibold tabular whitespace-nowrap", type === "INCOME" ? "text-income" : "text-fg", className)}>
      {type === "INCOME" ? "+" : "−"} {formatMoney(amount, currency)}
    </span>
  );
}

export function TxRowCompact({ tx, currency }: {
  tx: { id: string; description: string; type: "INCOME" | "EXPENSE"; amount: number; date: Date; category: { name: string; color: string; icon: string }; account: { name: string } };
  currency: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <CategoryIcon name={tx.category.icon} color={tx.category.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="truncate text-xs text-muted">
          {tx.category.name} · {tx.account.name} · {tx.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
        </p>
      </div>
      <TxAmount type={tx.type} amount={tx.amount} currency={currency} className="text-sm" />
    </div>
  );
}
