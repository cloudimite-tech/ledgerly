export const dynamic = "force-dynamic";
import Link from "next/link";
import { RegisterForm } from "./form";
import { GoogleButton } from "@/components/google-button";
import { googleEnabled } from "@/lib/google-auth";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  if (process.env.ALLOW_SIGNUP === "false") {
    return (
      <>
        <h1 className="font-serif text-[1.85rem] font-medium tracking-tight">Sign-up is closed</h1>
        <p className="mt-2 text-sm text-muted">Accounts are created by an administrator.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">Back to sign in</Link>
      </>
    );
  }
  return (
    <>
      <h1 className="font-serif text-[1.85rem] font-medium tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Start tracking your money in under a minute.</p>
      {googleEnabled() && (
        <div className="mt-6">
          <GoogleButton label="Sign up with Google" />
          <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" /></div>
        </div>
      )}
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
