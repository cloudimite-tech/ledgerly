import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, cn } from "./ui";

export function StatCard({ label, value, icon, tone = "primary", delta, deltaGoodWhenUp = true, sub }: {
  label: string; value: string; icon: React.ReactNode; tone?: "primary" | "income" | "expense" | "neutral";
  delta?: number | null; deltaGoodWhenUp?: boolean; sub?: string;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    income: "bg-income-soft text-income",
    expense: "bg-expense-soft text-expense",
    neutral: "bg-surface-2 text-muted",
  };
  const up = (delta ?? 0) >= 0;
  const good = up === deltaGoodWhenUp;
  return (
    <Card interactive className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", good ? "text-income" : "text-expense")}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-muted">{sub}</span>}
      </div>
    </Card>
  );
}
