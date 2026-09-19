import { requireUser } from "@/lib/auth";
import { accountBalances } from "@/lib/queries";
import { AccountsView } from "./view";

export const metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await accountBalances(user.id, true);
  return (
    <div className="animate-in">
      <AccountsView
        currency={user.currency}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, color: a.color, archived: a.archived, openingBalance: a.openingBalance, balance: a.balance, income: a.income, expense: a.expense, count: a.count }))}
      />
    </div>
  );
}
