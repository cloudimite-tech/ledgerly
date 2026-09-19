import { Check, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PERMISSIONS, permissionsFor } from "@/lib/rbac";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const granted = permissionsFor(user.role);
  return (
    <div className="animate-in">
      <PageHeader title="Settings" description="Manage your profile, preferences and security." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader title="Profile" description="Your name and display currency." /><div className="p-5"><ProfileForm name={user.name} email={user.email} currency={user.currency} /></div></Card>
          <Card><CardHeader title="Password" description="Use at least 8 characters with an uppercase letter and a number." /><div className="p-5"><PasswordForm /></div></Card>
        </div>
        <Card className="h-fit">
          <CardHeader title="Access" description="What your role allows" action={<Badge tone={user.role === "ADMIN" ? "primary" : "neutral"}><ShieldCheck size={11} /> {user.role}</Badge>} />
          <ul className="space-y-2.5 p-5 text-sm">
            {(Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).map((p) => {
              const ok = granted.includes(p);
              return (
                <li key={p} className={`flex gap-2.5 ${ok ? "" : "opacity-40"}`}>
                  <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${ok ? "bg-income-soft text-income" : "bg-surface-2"}`}>{ok && <Check size={10} strokeWidth={3} />}</span>
                  <span><span className="font-mono text-xs">{p}</span><br /><span className="text-xs text-muted">{PERMISSIONS[p]}</span></span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-border px-5 py-3 text-xs text-muted">Member since {user.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        </Card>
      </div>
    </div>
  );
}
