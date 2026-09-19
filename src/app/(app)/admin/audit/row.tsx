import { ArrowLeftRight, Download, KeyRound, Layers, LogIn, LogOut, ShieldAlert, UserCog, UserMinus, UserPlus } from "lucide-react";

const META: Record<string, { label: string; icon: typeof LogIn; cls: string }> = {
  "auth.login": { label: "Signed in", icon: LogIn, cls: "bg-surface-2 text-muted" },
  "auth.logout": { label: "Signed out", icon: LogOut, cls: "bg-surface-2 text-muted" },
  "auth.register": { label: "Registered", icon: UserPlus, cls: "bg-income-soft text-income" },
  "auth.password_changed": { label: "Changed password", icon: KeyRound, cls: "bg-primary-soft text-primary" },
  "user.created": { label: "Created user", icon: UserPlus, cls: "bg-income-soft text-income" },
  "user.role_changed": { label: "Changed role", icon: UserCog, cls: "bg-primary-soft text-primary" },
  "user.suspended": { label: "Suspended user", icon: ShieldAlert, cls: "bg-expense-soft text-expense" },
  "user.activated": { label: "Reactivated user", icon: UserCog, cls: "bg-income-soft text-income" },
  "user.password_reset": { label: "Reset password", icon: KeyRound, cls: "bg-amber-500/10 text-warn" },
  "user.deleted": { label: "Deleted user", icon: UserMinus, cls: "bg-expense-soft text-expense" },
  "data.export": { label: "Exported CSV", icon: Download, cls: "bg-surface-2 text-muted" },
  "group.created": { label: "Created group", icon: Layers, cls: "bg-income-soft text-income" },
  "group.updated": { label: "Renamed group", icon: Layers, cls: "bg-primary-soft text-primary" },
  "group.deleted": { label: "Deleted group", icon: Layers, cls: "bg-expense-soft text-expense" },
  "group.member_added": { label: "Added to group", icon: UserPlus, cls: "bg-income-soft text-income" },
  "group.member_removed": { label: "Removed from group", icon: UserMinus, cls: "bg-expense-soft text-expense" },
};

export function AuditRow({ log }: { log: { action: string; target: string | null; createdAt: Date; meta: unknown; actor: { name: string; email: string } | null } }) {
  const m = META[log.action] ?? { label: log.action, icon: ArrowLeftRight, cls: "bg-surface-2 text-muted" };
  const meta = log.meta && typeof log.meta === "object" ? Object.entries(log.meta as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${m.cls}`}><m.icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm"><span className="font-medium">{log.actor?.name ?? "Deleted user"}</span> <span className="text-muted">{m.label.toLowerCase()}</span>{log.target && <span className="font-medium"> {log.target}</span>}{meta && <span className="text-muted"> ({meta})</span>}</p>
        <p className="text-xs text-muted">{log.actor?.email}</p>
      </div>
      <time className="shrink-0 text-xs text-muted tabular" dateTime={log.createdAt.toISOString()}>
        {log.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })}
      </time>
    </div>
  );
}
