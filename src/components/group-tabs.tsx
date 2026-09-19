"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LineChart } from "lucide-react";
import { cn } from "./ui";

export function GroupTabs({ groupId }: { groupId: string }) {
  const path = usePathname();
  const tabs = [
    { href: `/admin/groups/${groupId}`, label: "Overview", icon: LayoutGrid },
    { href: `/admin/groups/${groupId}/reports`, label: "Reports", icon: LineChart },
  ];
  return (
    <div className="mb-5 inline-flex gap-1 rounded-xl border border-border bg-surface p-1">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition",
              active ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <t.icon size={14} /> {t.label}
          </Link>
        );
      })}
    </div>
  );
}
