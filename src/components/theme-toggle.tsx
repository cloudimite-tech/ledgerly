"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "./ui";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", I: Sun },
    { v: "dark", I: Moon },
    { v: "system", I: Monitor },
  ];
  return (
    <div className="flex rounded-xl border border-border bg-surface-2 p-0.5">
      {opts.map(({ v, I }) => (
        <button
          key={v}
          type="button"
          aria-label={`${v} theme`}
          onClick={() => setTheme(v)}
          className={cn(
            "grid h-7 flex-1 place-items-center rounded-[10px] px-2 text-muted transition cursor-pointer",
            mounted && theme === v && "bg-surface text-fg shadow-sm",
          )}
        >
          <I size={14} />
        </button>
      ))}
    </div>
  );
}
