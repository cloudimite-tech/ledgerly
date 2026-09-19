import clsx from "clsx";
import { motion } from "motion/react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const cn = clsx;

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:brightness-95 active:brightness-90",
  secondary: "bg-surface border border-border text-fg hover:bg-surface-2 hover:border-primary/30",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-expense text-white hover:opacity-90",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] cursor-pointer whitespace-nowrap",
    size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
    variants[variant],
    className,
  );
}

type NativeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration">;

export function Button({ variant = "primary", size = "md", className, disabled, ...props }: NativeButtonProps & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <motion.button
      className={buttonClass(variant, size, className)}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.015 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      {...props}
    />
  );
}

const field = "w-full min-w-0 h-10 rounded-xl border border-border bg-surface px-3 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-primary focus:ring-4 focus:ring-[var(--ring)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%238b93a9%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center]", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "h-auto py-2 min-h-20", className)} {...props} />;
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted">
      <span>{children}</span>
      {hint && <span className="font-normal opacity-70">{hint}</span>}
    </label>
  );
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor} hint={hint}>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
    </div>
  );
}

export function Card({ className, children, interactive }: { className?: string; children: ReactNode; interactive?: boolean }) {
  return <div className={cn("min-w-0 rounded-xl border border-border bg-surface shadow-card", interactive && "card-hover cursor-pointer", className)}>{children}</div>;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface-2 text-muted",
  primary: "bg-primary-soft text-primary",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  warn: "bg-amber-500/10 text-warn",
};
export function Badge({ tone = "neutral", children, className }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", badgeTones[tone], className)}>{children}</span>;
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
        <h1 className="font-serif text-[1.85rem] font-medium leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3.5 grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
