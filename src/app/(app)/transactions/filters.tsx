"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { UserOptions } from "@/lib/queries";
import { Input, Select, cn } from "@/components/ui";

export function TxFiltersBar({ options }: { options: UserOptions }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, start] = useTransition();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    start(() => router.replace(`${path}?${next.toString()}`));
  };

  useEffect(() => {
    const t = setTimeout(() => { if ((params.get("q") ?? "") !== q) update("q", q); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const type = params.get("type") ?? "";
  const cats = options.categories.filter((c) => !type || c.type === type);
  const active = ["type", "category", "account", "from", "to", "q"].some((k) => params.get(k));

  return (
    <div className={cn("mb-4 rounded-2xl border border-border bg-surface p-3 transition", pending && "opacity-70")}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input placeholder="Search description or notes…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={type} onChange={(e) => { const n = new URLSearchParams(params.toString()); e.target.value ? n.set("type", e.target.value) : n.delete("type"); n.delete("category"); n.delete("page"); start(() => router.replace(`${path}?${n}`)); }}>
          <option value="">All types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </Select>
        <Select value={params.get("category") ?? ""} onChange={(e) => update("category", e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={params.get("account") ?? ""} onChange={(e) => update("account", e.target.value)}>
          <option value="">All accounts</option>
          {options.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Input type="date" aria-label="From" value={params.get("from") ?? ""} onChange={(e) => update("from", e.target.value)} />
        <Input type="date" aria-label="To" value={params.get("to") ?? ""} onChange={(e) => update("to", e.target.value)} />
        <button
          disabled={!active}
          onClick={() => { setQ(""); start(() => router.replace(path)); }}
          className="flex h-10 cursor-pointer items-center justify-center gap-1 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg disabled:cursor-default disabled:opacity-40"
        >
          <X size={14} /> Clear
        </button>
      </div>
    </div>
  );
}
