"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "../../_actions/finance";

function invalid(e: z.ZodError): ActionResult {
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(e).fieldErrors };
}
function friendly(e: unknown): ActionResult {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") return { ok: false, error: "A group with that name already exists." };
    if (e.code === "P2025") return { ok: false, error: "Group not found." };
  }
  console.error(e);
  return { ok: false, error: "Something went wrong. Please try again." };
}
function refresh(groupId?: string) {
  revalidatePath("/admin/groups");
  if (groupId) revalidatePath(`/admin/groups/${groupId}`);
}

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name is too short").max(60),
  description: z.string().trim().max(200).optional(),
});

type GroupActionResult = ActionResult & { id?: string };

export async function saveGroup(input: z.input<typeof groupSchema>): Promise<GroupActionResult> {
  const admin = await requirePermission("groups:manage");
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, name, description } = parsed.data;
  try {
    if (id) {
      const g = await prisma.group.update({ where: { id }, data: { name, description: description || null } });
      await audit(admin.id, "group.updated", g.name);
      refresh(id);
      return { ok: true, message: "Group updated", id: g.id };
    } else {
      const g = await prisma.group.create({ data: { name, description: description || null, createdById: admin.id } });
      await audit(admin.id, "group.created", g.name);
      refresh(g.id);
      return { ok: true, message: "Group created", id: g.id };
    }
  } catch (e) {
    return friendly(e);
  }
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  const admin = await requirePermission("groups:manage");
  try {
    const g = await prisma.group.delete({ where: { id } });
    await audit(admin.id, "group.deleted", g.name);
  } catch (e) {
    return friendly(e);
  }
  refresh();
  return { ok: true, message: "Group deleted" };
}

export async function addGroupMember(groupId: string, userId: string): Promise<ActionResult> {
  const admin = await requirePermission("groups:manage");
  const [group, user] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
  ]);
  if (!group) return { ok: false, error: "Group not found." };
  if (!user) return { ok: false, error: "User not found." };
  try {
    await prisma.groupMember.create({ data: { groupId, userId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: `${user.name} is already in this group.` };
    }
    return friendly(e);
  }
  await audit(admin.id, "group.member_added", group.name, { user: user.email });
  refresh(groupId);
  return { ok: true, message: `Added ${user.name} to ${group.name}` };
}

export async function removeGroupMember(groupId: string, userId: string): Promise<ActionResult> {
  const admin = await requirePermission("groups:manage");
  const [group, user] = await Promise.all([
    prisma.group.findUnique({ where: { id: groupId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
  ]);
  const res = await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  if (res.count === 0) return { ok: false, error: "Membership not found." };
  await audit(admin.id, "group.member_removed", group?.name, { user: user?.email });
  refresh(groupId);
  return { ok: true, message: `Removed ${user?.name ?? "member"} from ${group?.name ?? "group"}` };
}
