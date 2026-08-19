export const ACCOUNT_ROLES = ["user", "admin"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const USER_ROLES = ["guest", "user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  guest: "ゲスト",
  user: "一般",
  admin: "管理者",
};

export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: UserRole): boolean {
  return role === "admin";
}
