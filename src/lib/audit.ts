import "server-only";
import { prisma } from "./prisma";

export async function audit(actorId: string | null, action: string, target?: string, meta?: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, target, meta: meta as object | undefined } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
