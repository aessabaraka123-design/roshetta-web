export interface StaffRoleItem {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
}

export const DEFAULT_STAFF_ROLES: StaffRoleItem[] = [
  {
    id: "pharmacist",
    name_ar: "صيدلي",
    name_en: "Pharmacist",
    description_ar: "مسؤول صرف الأدوية وخدمة المرضى",
    description_en: "Responsible for dispensing medications and customer service",
  },
  {
    id: "senior_pharmacist",
    name_ar: "صيدلي أول",
    name_en: "Senior Pharmacist",
    description_ar: "صيدلي ذو خبرة وإشراف على الصرف",
    description_en: "Experienced pharmacist supervising dispensing",
  },
  {
    id: "branchManager",
    name_ar: "مدير فرع",
    name_en: "Branch Manager",
    description_ar: "إدارة عمليات الفرع والمبيعات والموظفين",
    description_en: "Manages branch operations, sales and personnel",
  },
  {
    id: "cashier",
    name_ar: "كاشير",
    name_en: "Cashier",
    description_ar: "مسؤول نقطة البيع وصندوق المقبوضات",
    description_en: "Manages POS cash and receipts",
  },
  {
    id: "trainee",
    name_ar: "صيدلي متدرب",
    name_en: "Trainee Pharmacist",
    description_ar: "متدرب تحت إشراف الصيدلي المسؤول",
    description_en: "Intern under supervising pharmacist",
  },
  {
    id: "assistant",
    name_ar: "مساعد صيدلي",
    name_en: "Pharmacy Assistant",
    description_ar: "مساعد في الترتيب والمخزون وخدمة العملاء",
    description_en: "Assists with stock, shelving and customer support",
  },
  {
    id: "warehouse",
    name_ar: "أمين مستودع",
    name_en: "Warehouse Keeper",
    description_ar: "إدارة الواردات واستلام طلبيات الموردين والجرد",
    description_en: "Manages incoming inventory and stocktakes",
  },
  {
    id: "manager",
    name_ar: "مدير صيدلية",
    name_en: "Pharmacy Manager",
    description_ar: "إدارة شاملة للصيدلية والفروع والموظفين",
    description_en: "Full pharmacy management and system access",
  },
];

/**
 * Returns a localized display name for any role string (DB key or Arabic label or alias)
 */
export function getRoleDisplayName(role?: string, lang: string = "ar"): string {
  if (!role) return lang === "en" ? "Staff" : "موظف";
  const r = String(role).trim();
  const lower = r.toLowerCase();

  // Direct match in DEFAULT_STAFF_ROLES
  const match = DEFAULT_STAFF_ROLES.find(
    (item) =>
      item.id.toLowerCase() === lower ||
      item.name_ar === r ||
      item.name_en.toLowerCase() === lower
  );
  if (match) {
    return lang === "en" ? match.name_en : match.name_ar;
  }

  // Common variants
  if (lower === "branch_manager" || lower === "branchmanager" || r === "مدير فرع") {
    return lang === "en" ? "Branch Manager" : "مدير فرع";
  }
  if (lower === "pharmacist" || r === "صيدلي" || r === "صيدلاني") {
    return lang === "en" ? "Pharmacist" : "صيدلي";
  }
  if (lower === "senior_pharmacist" || r === "صيدلي أول") {
    return lang === "en" ? "Senior Pharmacist" : "صيدلي أول";
  }
  if (lower === "cashier" || r === "كاشير") {
    return lang === "en" ? "Cashier" : "كاشير";
  }
  if (lower === "trainee" || r === "صيدلي متدرب" || r === "متدرب") {
    return lang === "en" ? "Trainee Pharmacist" : "صيدلي متدرب";
  }
  if (lower === "assistant" || r === "مساعد صيدلي" || r === "مساعد") {
    return lang === "en" ? "Pharmacy Assistant" : "مساعد صيدلي";
  }
  if (lower === "warehouse" || r === "أمين مستودع" || r === "مستودع") {
    return lang === "en" ? "Warehouse Keeper" : "أمين مستودع";
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

  // Fallback to custom role string as given
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
  if (lower === "cashier" || r === "كاشير" || lower === "cashier") {
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
  if (
    lower === "pharmacist" ||
    lower === "senior_pharmacist" ||
    lower === "trainee" ||
    lower === "assistant" ||
    lower === "warehouse" ||
    r === "صيدلي" ||
    r === "صيدلي أول" ||
    r === "صيدلي متدرب" ||
    r === "مساعد صيدلي" ||
    r === "أمين مستودع"
  ) {
    return "pharmacist";
  }

  if (["manager", "branchManager", "pharmacist", "cashier"].includes(role)) {
    return role;
  }

  return "pharmacist";
}
