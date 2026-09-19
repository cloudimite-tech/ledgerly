"use client";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { register } from "../actions";
import { Button, Field, Input } from "@/components/ui";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="mt-8 space-y-4">
      {state?.error && <div className="rounded-xl border border-expense/30 bg-expense-soft px-3 py-2 text-sm text-expense">{state.error}</div>}
      <Field label="Full name" htmlFor="name" error={fe?.name?.[0]}>
        <Input id="name" name="name" autoComplete="name" placeholder="Nimal Perera" required />
      </Field>
      <Field label="Email" htmlFor="email" error={fe?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="Password" htmlFor="password" hint="8+ chars, 1 uppercase, 1 number" error={fe?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={fe?.confirm?.[0]}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 size={16} className="animate-spin" />} Create account
      </Button>
    </form>
  );
}
