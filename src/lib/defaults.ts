export const DEFAULT_CATEGORIES: { name: string; type: "INCOME" | "EXPENSE"; color: string; icon: string }[] = [
  { name: "Salary", type: "INCOME", color: "#10b981", icon: "briefcase" },
  { name: "Freelance", type: "INCOME", color: "#14b8a6", icon: "laptop" },
  { name: "Investments", type: "INCOME", color: "#0ea5e9", icon: "trending-up" },
  { name: "Other Income", type: "INCOME", color: "#84cc16", icon: "plus-circle" },
  { name: "Food & Dining", type: "EXPENSE", color: "#f97316", icon: "utensils" },
  { name: "Groceries", type: "EXPENSE", color: "#eab308", icon: "shopping-cart" },
  { name: "Transport", type: "EXPENSE", color: "#3b82f6", icon: "car" },
  { name: "Utilities", type: "EXPENSE", color: "#8b5cf6", icon: "zap" },
  { name: "Rent & Housing", type: "EXPENSE", color: "#ec4899", icon: "home" },
  { name: "Health", type: "EXPENSE", color: "#ef4444", icon: "heart-pulse" },
  { name: "Entertainment", type: "EXPENSE", color: "#a855f7", icon: "film" },
  { name: "Shopping", type: "EXPENSE", color: "#f43f5e", icon: "shopping-bag" },
  { name: "Education", type: "EXPENSE", color: "#06b6d4", icon: "graduation-cap" },
  { name: "Subscriptions", type: "EXPENSE", color: "#6366f1", icon: "repeat" },
];

export const DEFAULT_ACCOUNTS: { name: string; type: "CASH" | "BANK" | "CARD" | "SAVINGS" | "OTHER"; color: string }[] = [
  { name: "Cash", type: "CASH", color: "#10b981" },
  { name: "Bank Account", type: "BANK", color: "#6366f1" },
];

export const ICON_CHOICES = [
  "tag", "briefcase", "laptop", "trending-up", "plus-circle", "utensils", "shopping-cart", "car", "zap",
  "home", "heart-pulse", "film", "shopping-bag", "graduation-cap", "repeat", "gift", "plane", "coffee",
  "smartphone", "wifi", "baby", "dog", "dumbbell", "wrench", "landmark", "piggy-bank", "receipt", "fuel",
] as const;

export const COLOR_CHOICES = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e", "#ef4444", "#f97316", "#eab308",
  "#84cc16", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#64748b",
];
