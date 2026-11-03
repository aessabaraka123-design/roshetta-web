export interface StaffRoleItem {
  id: string;
  name_ar: string;
  name_en: string;
}

/**
 * The 3 actual staff roles defined in the database (staff table):
 * 1. pharmacist (صيدلي)
 * 2. branchManager (مدير فرع)
 * 3. cashier (كاشير)
 */
export const DEFAULT_STAFF_ROLES: StaffRoleItem[] = [
  {
    id: "pharmacist",
    name_ar: "صيدلي",
    name_en: "Pharmacist",
  },
  {
    id: "branchManager",
    name_ar: "مدير فرع",
    name_en: "Branch Manager",
  },
  {
    id: "cashier",
    name_ar: "كاشير",
    name_en: "Cashier",
  },
];

/**
 * Returns a localized display name for any role string from database
 */
export function getRoleDisplayName(role?: string, lang: string = "ar"): string {
  if (!role) return lang === "en" ? "Staff" : "موظف";
  const r = String(role).trim();
  const lower = r.toLowerCase();

  if (
    lower === "branch_manager" ||
    lower === "branchmanager" ||
    r === "مدير فرع" ||
    lower === "branch manager"
  ) {
    return lang === "en" ? "Branch Manager" : "مدير فرع";
  }
  if (
    lower === "pharmacist" ||
    lower === "senior_pharmacist" ||
    r === "صيدلي" ||
    r === "صيدلي أول" ||
    r === "صيدلاني" ||
    lower === "trainee" ||
    r === "صيدلي متدرب"
  ) {
    return lang === "en" ? "Pharmacist" : "صيدلي";
  }
  if (lower === "cashier" || r === "كاشير") {
    return lang === "en" ? "Cashier" : "كاشير";
  }
  if (lower === "manager" || r === "مدير" || r === "المدير") {
    return lang === "en" ? "Manager" : "المدير";
  }
  if (lower === "owner" || r === "مالك" || r === "المالك") {
    return lang === "en" ? "Owner" : "المالك";
  }
  if (lower === "superadmin") {
    return lang === "en" ? "Super Admin" : "المسؤول العام";
  }

  return r;
}

/**
 * Normalizes a role value to match the valid backend role strings accepted by the API
 */
export function normalizeRoleForBackend(role?: string): string {
  if (!role) return "pharmacist";
  const r = String(role).trim();
  const lower = r.toLowerCase();

  if (
    lower === "branchmanager" ||
    lower === "branch_manager" ||
    r === "مدير فرع" ||
    lower === "branch manager"
  ) {
    return "branchManager";
  }
  if (lower === "cashier" || r === "كاشير") {
    return "cashier";
  }
  if (
    lower === "manager" ||
    r === "مدير" ||
    r === "مدير صيدلية" ||
    lower === "owner" ||
    r === "مالك"
  ) {
    return "manager";
  }
  return "pharmacist";
}
