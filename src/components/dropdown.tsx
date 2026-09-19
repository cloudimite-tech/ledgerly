"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "./ui";

/**
 * A menu rendered into a portal and positioned with `fixed` coordinates,
 * so it always floats above surrounding content — including a table
 * wrapped in an `overflow-x-auto` container, which would otherwise clip
 * an absolutely-positioned child (setting overflow-x forces overflow-y
 * to auto too, so anything positioned "inside" gets cropped).
 */
export function Dropdown({ trigger, children, align = "end", width = 208 }: {
  trigger: (props: { onClick: () => void; ref: React.RefObject<HTMLButtonElement | null> }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 6, left: align === "end" ? r.right - width : r.left });
  };

  const toggle = () => {
    if (!open) place();
    setOpen((o) => !o);
  };
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => place();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      // Ignore clicks on the trigger (it has its own toggle) or inside the menu
      // itself (its items call close() explicitly after running their action).
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {trigger({ onClick: toggle, ref: btnRef })}
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="animate-pop fixed z-50 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl"
            style={{ top: pos.top, left: Math.max(8, pos.left), width }}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
}

export function DropdownItem({ icon: Icon, children, onClick, danger }: {
  icon: React.ComponentType<{ size?: number }>; children: React.ReactNode; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm", danger ? "text-expense hover:bg-expense-soft" : "hover:bg-surface-2")}>
      <Icon size={15} /> {children}
    </button>
  );
}
