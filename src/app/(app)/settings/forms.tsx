"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, updateProfile } from "./actions";
import { Button, Field, Input, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/money";

type Errors = Record<string, string[] | undefined>;

export function ProfileForm({ name, email, currency }: { name: string; email: string; currency: string }) {
  const [d, setD] = useState({ name, currency });
  const [err, setErr] = useState<Errors>({});
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateProfile(d); if (r.ok) { toast.success(r.message); setErr({}); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); } }); }}>
      <Field label="Full name" htmlFor="pname" error={err.name?.[0]}><Input id="pname" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Email" htmlFor="pemail" hint="Contact an admin to change"><Input id="pemail" value={email} disabled className="opacity-60" /></Field>
      <Field label="Currency" htmlFor="pcur">
        <Select id="pcur" value={d.currency} onChange={(e) => setD({ ...d, currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}
        </Select>
      </Field>
      <div className="flex items-end justify-end"><Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Save profile</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const blank = { current: "", password: "", confirm: "" };
  const [d, setD] = useState(blank);
  const [err, setErr] = useState<Errors>({});
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changePassword(d); if (r.ok) { toast.success(r.message); setD(blank); setErr({}); } else { setErr(r.fieldErrors ?? {}); toast.error(r.error); } }); }}>
      <Field label="Current password" htmlFor="cur" error={err.current?.[0]}><Input id="cur" type="password" autoComplete="current-password" value={d.current} onChange={(e) => setD({ ...d, current: e.target.value })} /></Field>
      <Field label="New password" htmlFor="np" error={err.password?.[0]}><Input id="np" type="password" autoComplete="new-password" value={d.password} onChange={(e) => setD({ ...d, password: e.target.value })} /></Field>
      <Field label="Confirm" htmlFor="cp" error={err.confirm?.[0]}><Input id="cp" type="password" autoComplete="new-password" value={d.confirm} onChange={(e) => setD({ ...d, confirm: e.target.value })} /></Field>
      <div className="flex justify-end sm:col-span-3"><Button type="submit" disabled={pending}>{pending && <Loader2 size={16} className="animate-spin" />} Update password</Button></div>
    </form>
  );
}
