import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "./defaults";

type Tx = Pick<PrismaClient, "account" | "category">;

/** Gives a brand-new user a starter set of accounts and categories. */
export async function provisionUser(db: Tx, userId: string) {
  await db.account.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, userId })),
    skipDuplicates: true,
  });
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    skipDuplicates: true,
  });
}
