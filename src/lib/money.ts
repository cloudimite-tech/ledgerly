export const CURRENCIES = [
  { code: "LKR", label: "Sri Lankan Rupee" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "INR", label: "Indian Rupee" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "AED", label: "UAE Dirham" },
] as const;

export function formatMoney(value: number, currency = "LKR", opts: { compact?: boolean; sign?: boolean } = {}) {
  const fmt = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
    signDisplay: opts.sign ? "exceptZero" : "auto",
  });
  return fmt.format(value);
}

export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  return Number(v.toString());
}
