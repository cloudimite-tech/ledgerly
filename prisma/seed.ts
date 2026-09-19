import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { provisionUser } from "../src/lib/provision";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) / 10) * 10;
}

async function sampleData(userId: string) {
  const count = await prisma.transaction.count({ where: { userId } });
  if (count > 0) return;

  const cats = await prisma.category.findMany({ where: { userId } });
  const accts = await prisma.account.findMany({ where: { userId } });
  const cat = (n: string) => cats.find((c) => c.name === n)!;
  const bank = accts.find((a) => a.type === "BANK")!;
  const cash = accts.find((a) => a.type === "CASH")!;
  await prisma.account.update({ where: { id: bank.id }, data: { openingBalance: 150000 } });
  await prisma.account.update({ where: { id: cash.id }, data: { openingBalance: 100000 } });

  const rows: Prisma.TransactionCreateManyInput[] = [];
  const today = new Date();
  for (let m = 5; m >= 0; m--) {
    const base = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const lastDay = m === 0 ? today.getDate() : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const d = (day: number) => new Date(Date.UTC(base.getFullYear(), base.getMonth(), Math.min(day, lastDay)));
    const push = (type: "INCOME" | "EXPENSE", c: string, amount: number, day: number, description: string, acc = bank.id) =>
      day <= lastDay && rows.push({ userId, type, categoryId: cat(c).id, accountId: acc, amount, date: d(day), description });

    push("INCOME", "Salary", 385000, 1, "Monthly salary");
    if (m % 2 === 0) push("INCOME", "Freelance", rand(60000, 140000), 12, "Freelance DevOps project");
    if (m === 2) push("INCOME", "Investments", 22500, 20, "CSE dividend");
    push("EXPENSE", "Rent & Housing", 95000, 2, "Apartment rent");
    push("EXPENSE", "Utilities", rand(9000, 14000), 5, "Electricity (CEB)");
    push("EXPENSE", "Utilities", 4990, 6, "Fibre internet");
    push("EXPENSE", "Subscriptions", 3200, 8, "Cloud & streaming subscriptions");
    for (const day of [3, 10, 17, 24]) push("EXPENSE", "Groceries", rand(8000, 16000), day, "Keells groceries");
    for (const day of [4, 9, 14, 19, 26]) push("EXPENSE", "Food & Dining", rand(1800, 6500), day, "Lunch / dinner out", day % 2 ? cash.id : bank.id);
    for (const day of [7, 21]) push("EXPENSE", "Transport", rand(6000, 12000), day, "Fuel");
    push("EXPENSE", "Transport", rand(2000, 5000), 15, "PickMe rides", cash.id);
    push("EXPENSE", "Entertainment", rand(3000, 9000), 22, "Movies & outings");
    push("EXPENSE", "Shopping", rand(5000, 25000), 18, "Clothing & electronics");
    if (m % 3 === 0) push("EXPENSE", "Health", rand(4000, 12000), 11, "Pharmacy & checkup");
    if (m === 1) push("EXPENSE", "Education", 45000, 13, "AWS certification exam");
  }
  await prisma.transaction.createMany({ data: rows });

  const budgets: [string, number][] = [
    ["Groceries", 50000], ["Food & Dining", 20000], ["Transport", 25000], ["Entertainment", 10000], ["Shopping", 20000],
  ];
  for (const [n, amount] of budgets) {
    await prisma.budget.upsert({
      where: { userId_categoryId: { userId, categoryId: cat(n).id } },
      create: { userId, categoryId: cat(n).id, amount },
      update: {},
    });
  }
}

async function upsertUser(email: string, name: string, password: string, role: "ADMIN" | "USER") {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, role, passwordHash: await bcrypt.hash(password, 12) },
    update: {},
  });
  await provisionUser(prisma, user.id);
  return user;
}

async function main() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@ledgerly.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";
  const admin = await upsertUser(adminEmail, "Administrator", adminPassword, "ADMIN");
  console.log(`✔ Admin: ${adminEmail} / ${adminPassword}`);

  if (process.env.SEED_DEMO !== "false") {
    const demo = await upsertUser("demo@ledgerly.local", "Demo User", "Demo@12345", "USER");
    await sampleData(demo.id);
    await sampleData(admin.id);
    console.log("✔ Demo user: demo@ledgerly.local / Demo@12345 (with 6 months of sample data)");

    const group = await prisma.group.upsert({
      where: { name: "Demo household" },
      create: { name: "Demo household", description: "Example group — see both members' transactions in one place.", createdById: admin.id },
      update: {},
    });
    await prisma.groupMember.createMany({
      data: [{ groupId: group.id, userId: admin.id }, { groupId: group.id, userId: demo.id }],
      skipDuplicates: true,
    });
    console.log("✔ Demo group: \"Demo household\" (Administrator + Demo User)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
