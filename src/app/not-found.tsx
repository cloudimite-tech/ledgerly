import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <p className="font-serif text-7xl font-medium text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The page you're looking for doesn't exist.</p>
        <Link href="/dashboard" className={buttonClass("primary", "md", "mt-6")}>Back to dashboard</Link>
      </div>
    </div>
  );
}
