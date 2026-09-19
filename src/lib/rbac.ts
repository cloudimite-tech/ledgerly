/**
 * Role-based access control.
 *
 * Every user owns their own finance data (accounts, categories, transactions,
 * budgets). Roles decide which *platform* capabilities a user has on top of that.
 * Admins manage accounts but can NOT read other users' transactions directly —
 * the one deliberate exception is Groups: an admin with `groups:read` can view
 * the transactions of members of a group they were explicitly added to, and
 * only for those members, only while the membership exists.
 */
export const ROLES = ["ADMIN", "USER"] as const;
export type AppRole = (typeof ROLES)[number];

export const PERMISSIONS = {
  "finance:own": "Manage own accounts, categories, transactions and budgets",
  "reports:own": "View own reports and export data",
  "users:read": "View the user directory",
  "users:manage": "Create, suspend, change roles and reset passwords",
  "audit:read": "View the audit log",
  "groups:read": "View groups and each member's transactions within them",
  "groups:manage": "Create groups and add or remove their members",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  USER: ["finance:own", "reports:own"],
  ADMIN: ["finance:own", "reports:own", "users:read", "users:manage", "audit:read", "groups:read", "groups:manage"],
};

export function can(role: AppRole | undefined | null, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: AppRole) {
  return ROLE_PERMISSIONS[role];
}

/** Route prefixes and the permission needed to open them (used by proxy + layouts). */
export const PROTECTED_ROUTES: { prefix: string; permission: Permission }[] = [
  { prefix: "/admin", permission: "users:read" },
];
