import Link from "next/link";
import { LoginForm } from "./form";
import { GoogleButton } from "@/components/google-button";
import { googleEnabled } from "@/lib/google-auth";

export const metadata = { title: "Sign in" };

const GOOGLE_ERRORS: Record<string, string> = {
  google_disabled: "Google sign-in isn't configured yet.",
  google_state: "That sign-in link expired. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
  google_unverified: "That Google account's email isn't verified.",
  google_suspended: "Your account has been suspended. Contact an administrator.",
  google_signup_disabled: "Sign-up is disabled. Ask an administrator for an account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string; error?: string }> }) {
  const { next, expired, error } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-[1.85rem] font-medium tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to continue to your dashboard.</p>
      {expired && <div className="mt-6 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-muted">Your session has ended. Please sign in again.</div>}
      {error && GOOGLE_ERRORS[error] && <div className="mt-6 rounded-xl border border-expense/30 bg-expense-soft px-3 py-2 text-sm text-expense">{GOOGLE_ERRORS[error]}</div>}
      {googleEnabled() && (
        <div className="mt-6">
          <GoogleButton label="Continue with Google" />
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" /></div>
        </div>
      )}
      <LoginForm next={next} />
      {process.env.ALLOW_SIGNUP !== "false" && (
        <p className="mt-6 text-center text-sm text-muted">
          New here? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      )}
    </>
  );
}
