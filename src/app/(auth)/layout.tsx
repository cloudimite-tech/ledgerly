import { Logo } from "@/components/logo";
import { Blob } from "@/components/blob";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#17130e] p-10 text-white lg:flex lg:flex-col">
        <Blob className="pointer-events-none absolute -left-40 -top-40 size-[560px] opacity-20 blur-[60px]" />
        <Blob className="pointer-events-none absolute -bottom-56 -right-40 size-[520px] rotate-45 opacity-[0.08] blur-[40px]" tone="income" />
        <Logo className="relative" />
        <div className="relative my-auto max-w-md">
          <h2 className="font-serif text-4xl font-medium leading-tight tracking-tight">
            Know where every rupee <span className="text-[#e5a479]">comes and goes.</span>
          </h2>
          <p className="mt-4 text-white/55">Track income and expenses across accounts, set budgets, and see the full picture in seconds.</p>

          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="grid size-10 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><ArrowDownLeft size={18} /></span>
              <div className="flex-1"><p className="text-sm font-medium">Salary</p><p className="text-xs text-white/50">Bank Account · Today</p></div>
              <p className="font-mono text-sm font-semibold text-emerald-300 tabular">+ Rs 385,000</p>
            </div>
            <div className="ml-8 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="grid size-10 place-items-center rounded-lg bg-rose-400/15 text-rose-300"><ArrowUpRight size={18} /></span>
              <div className="flex-1"><p className="text-sm font-medium">Groceries</p><p className="text-xs text-white/50">Cash · Yesterday</p></div>
              <p className="font-mono text-sm font-semibold text-rose-300 tabular">− Rs 12,450</p>
            </div>
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/40"><ShieldCheck size={14} /> Your data is private to your account.</p>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-in">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
