"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import {
  ArrowLeftRight, BarChart3, FolderKanban, Layers, LayoutDashboard, LogOut, Menu, PiggyBank, ScrollText, Settings, ShieldCheck,
  Users, Wallet, X,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar } from "./avatar";
import { Badge, cn } from "./ui";

type NavUser = { name: string; email: string; role: "ADMIN" | "USER"; isAdmin: boolean };

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/categories", label: "Categories", icon: FolderKanban },
];
const ADMIN = [
  { href: "/admin", label: "Overview", icon: ShieldCheck, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/groups", label: "Groups", icon: Layers },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function NavLink({ href, label, icon: Icon, exact }: { href: string; label: string; icon: typeof Users; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-r-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-fg" : "text-muted hover:text-fg",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-r-md border-l-2 border-primary bg-surface-2"
          transition={{ type: "spring", stiffness: 480, damping: 38, mass: 0.6 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-3">
        <Icon size={18} strokeWidth={active ? 2.2 : 1.75} />
        {label}
      </span>
    </Link>
  );
}

function Sidebar({ user, logout, scope }: { user: NavUser; logout: () => Promise<void>; scope: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5"><Logo /></div>
      <LayoutGroup id={scope}>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3">
          <div className="space-y-0.5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted/70">Finance</p>
            {MAIN.map((n) => <NavLink key={n.href} {...n} />)}
          </div>
          {user.isAdmin && (
            <div className="space-y-0.5">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted/70">Administration</p>
              {ADMIN.map((n) => <NavLink key={n.href} {...n} />)}
            </div>
          )}
        </nav>
      </LayoutGroup>
      <div className="space-y-3 border-t border-border p-3">
        <ThemeToggle />
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              {user.name} {user.role === "ADMIN" && <Badge tone="primary">Admin</Badge>}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Link href="/settings" className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-fg">
            <Settings size={14} /> Settings
          </Link>
          <form action={logout} className="flex-1">
            <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-muted hover:bg-expense-soft hover:text-expense">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, logout, children }: { user: NavUser; logout: () => Promise<void>; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div id="app-shell-root" className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <Sidebar user={user} logout={logout} scope="desktop-nav" />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur lg:hidden">
        <Logo />
        <button onClick={() => setOpen(true)} className="grid size-9 cursor-pointer place-items-center rounded-xl hover:bg-surface-2" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="animate-pop absolute inset-y-0 left-0 w-72 border-r border-border bg-surface">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 grid size-8 cursor-pointer place-items-center rounded-lg hover:bg-surface-2" aria-label="Close menu">
              <X size={18} />
            </button>
            <Sidebar user={user} logout={logout} scope="mobile-nav" />
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
