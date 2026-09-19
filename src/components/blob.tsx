/**
 * A soft, hand-tuned organic blob shape (in the style of haikei.app's generator)
 * used as a quiet decorative accent — never as the whole background, always at
 * low opacity, so it reads as a considered design detail rather than a stock
 * gradient mesh. `tone` picks warm (primary) or cool (income) so it can sit
 * behind either an accent card or a neutral one.
 */
export function Blob({ className, tone = "primary" }: { className?: string; tone?: "primary" | "income" }) {
  const fill = tone === "primary" ? "var(--primary)" : "var(--income)";
  return (
    <svg
      className={className}
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill={fill}
        d="M431.5,320Q413,390,353.5,436.5Q294,483,222,466.5Q150,450,110,388.5Q70,327,101,262Q132,197,190.5,153Q249,109,314,133.5Q379,158,417.5,213Q456,268,431.5,320Z"
      />
    </svg>
  );
}
