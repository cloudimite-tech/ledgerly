import { requirePermission } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("users:read");
  return children;
}
