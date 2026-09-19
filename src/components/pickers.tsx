"use client";
import { COLOR_CHOICES, ICON_CHOICES } from "@/lib/defaults";
import { iconFor } from "./icon";
import { cn } from "./ui";

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_CHOICES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
          className={cn("size-7 cursor-pointer rounded-full ring-offset-2 ring-offset-[var(--surface)] transition", value === c ? "ring-2 ring-[var(--text)]" : "hover:scale-110")}
          style={{ background: c }} />
      ))}
    </div>
  );
}

export function IconPicker({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {ICON_CHOICES.map((name) => {
        const I = iconFor(name);
        const active = value === name;
        return (
          <button key={name} type="button" onClick={() => onChange(name)} aria-label={name}
            className={cn("grid aspect-square cursor-pointer place-items-center rounded-xl border transition", active ? "border-transparent" : "border-border text-muted hover:bg-surface-2")}
            style={active ? { background: `${color}22`, color } : undefined}>
            <I size={16} />
          </button>
        );
      })}
    </div>
  );
}
