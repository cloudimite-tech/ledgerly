"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "../actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {state?.error && <div className="rounded-xl border border-expense/30 bg-expense-soft px-3 py-2 text-sm text-expense">{state.error}</div>}
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 size={16} className="animate-spin" />} Sign in
      </Button>
    </form>
  );
}
