"use client";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "./modal";
import { Button } from "./ui";
import type { ActionResult } from "@/app/(app)/_actions/finance";

export function ConfirmAction({ trigger, title, description, confirmLabel = "Delete", action, onDone }: {
  trigger: (open: () => void) => React.ReactNode;
  title: string; description: string; confirmLabel?: string;
  action: () => Promise<ActionResult>; onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      {trigger(() => setOpen(true))}
      <Modal open={open} onClose={() => setOpen(false)} title={title} width="max-w-md">
        <p className="text-sm text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await action();
                if (r.ok) { toast.success(r.message ?? "Done"); setOpen(false); onDone?.(); }
                else toast.error(r.error);
              })
            }
          >
            {pending && <Loader2 size={16} className="animate-spin" />} {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
