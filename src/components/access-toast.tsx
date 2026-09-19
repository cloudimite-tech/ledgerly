"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

export function AccessToast() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (params.get("denied")) {
      toast.error("You don't have permission to view that page.");
      router.replace(path);
    } else if (params.get("welcome")) {
      toast.success("Welcome to Ledgerly! We've set up starter accounts and categories for you.");
      router.replace(path);
    }
  }, [params, router, path]);
  return null;
}
