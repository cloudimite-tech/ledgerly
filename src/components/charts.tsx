"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

type Point = { label: string; income: number; expense: number; net: number };

function TooltipBox({ active, payload, label, currency }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-muted">{p.name}</span>
          <span className="ml-auto pl-4 font-medium">{formatMoney(p.value, currency)}</span>
        </p>
      ))}
    </div>
  );
}

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function CashflowChart({ data, currency, height = 260 }: { data: Point[]; currency: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={68} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<TooltipBox currency={currency} />} />
        <Bar dataKey="income" name="income" fill="var(--income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" name="expense" fill="var(--expense)" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NetTrendChart({ data, currency, height = 220 }: { data: Point[]; currency: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((d) => ({ ...d, net: d.income || d.expense ? d.net : null }))} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={68} tickFormatter={(v) => formatMoney(v, currency, { compact: true })} />
        <Tooltip content={<TooltipBox currency={currency} />} />
        <Area type="monotone" dataKey="net" name="net savings" stroke="var(--primary)" strokeWidth={2.5} fill="url(#netFill)" dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, currency, centerLabel }: { data: { name: string; total: number; color: string }[]; currency: string; centerLabel: string }) {
  const total = data.reduce((a, d) => a + d.total, 0);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="none" cornerRadius={4}>
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip content={<TooltipBox currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-muted">{centerLabel}</p>
        <p className="text-lg font-semibold tabular">{formatMoney(total, currency, { compact: true })}</p>
      </div>
    </div>
  );
}
