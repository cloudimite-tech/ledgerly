"use client";
import { Download, Printer } from "lucide-react";
import { Button, buttonClass } from "./ui";

/** Export the current report as a CSV, or print it (or "Save as PDF" via the browser's print dialog). */
export function ReportActions({ exportHref }: { exportHref: string }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a href={exportHref} className={buttonClass("secondary", "sm")}><Download size={14} /> Export CSV</a>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}><Printer size={14} /> Print / PDF</Button>
    </div>
  );
}
