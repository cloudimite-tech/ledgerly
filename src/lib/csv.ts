import "server-only";
import { NextResponse } from "next/server";

function csvCell(v: unknown) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent CSV formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]) {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function csvResponse(filename: string, rows: unknown[][]) {
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
