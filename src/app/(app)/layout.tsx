import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { logout } from "../(auth)/actions";
import { AccessToast } from "@/components/access-toast";
import { Suspense } from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role, isAdmin: can(user.role, "users:read") }} logout={logout}>
      <Suspense><AccessToast /></Suspense>
      {children}
    </AppShell>
  );
}
