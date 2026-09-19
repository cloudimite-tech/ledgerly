import { cn } from "./ui";

// A small fixed palette in the app's own warm/ink register — flat colors, no
// gradients, picked deterministically per person so the same name always gets
// the same color across the app (sidebar, tables, group cards, member lists).
const PALETTE = [
  "bg-[#a8461f] text-[#fff7f0]",
  "bg-[#5c6b4f] text-[#f4f6ef]",
  "bg-[#3a5a6b] text-[#eef5f8]",
  "bg-[#7a5230] text-[#fbf3e9]",
  "bg-[#6b4a6f] text-[#f8f0f9]",
  "bg-[#4f6b63] text-[#eef6f3]",
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export function Avatar({ name, size = 9, suspended, className }: { name: string; size?: 8 | 9 | 10 | 11; suspended?: boolean; className?: string }) {
  const tone = suspended ? "bg-surface-2 text-muted" : PALETTE[hashName(name) % PALETTE.length];
  const sizeClass = { 8: "size-8", 9: "size-9", 10: "size-10", 11: "size-11" }[size];
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full text-xs font-semibold", sizeClass, tone, className)}>
      {initialsOf(name)}
    </span>
  );
}
