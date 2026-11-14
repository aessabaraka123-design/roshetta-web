/**
 * Pure Domain Engine for Staff, Roles, Permissions and Subscription Quotas (Web TypeScript).
 * Matches roshetta_server/staff-domain.js and C:\roshetta_app\src\domain\staffDomain.js.
 */

export type CanonicalRole = "manager" | "branchManager" | "pharmacist" | "cashier";

export interface StaffRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: CanonicalRole | string;
  branch?: string;
  salary?: number;
  active?: boolean | number;
  status?: string;
  controlledMedsAccess?: boolean | number;
  avatar?: string;
  syncStatus?: string;
}

export interface StaffActor {
  id?: string;
  email?: string;
  role?: string;
  branch?: string;
}

export interface StaffValidationResult {
  ok: boolean;
  errors: Record<string, string>;
  cleanData: {
    name: string;
    role: CanonicalRole;
    branch: string;
    email: string;
    phone: string;
    salary: number;
    controlledMedsAccess: boolean;
    active: number;
    avatar?: string;
    password?: string;
  } | null;
}

export interface StaffQuotaResult {
  allowed: boolean;
  maxStaff: number;
  currentCount: number;
  remaining: number;
  reasonCode: string | null;
  message: string | null;
}

export interface StaffPermissionResult {
  allowed: boolean;
  reasonCode?: string;
  message?: string;
}

export const CANONICAL_ROLES: CanonicalRole[] = ["manager", "branchManager", "pharmacist", "cashier"];

export const ROLE_ALIASES: Record<string, CanonicalRole> = {
  manager: "manager",
  owner: "manager",
  admin: "manager",
  superadmin: "manager",
  "مدير": "manager",
  "مدير عام": "manager",
  "مدير النظام": "manager",

  branchmanager: "branchManager",
  branch_manager: "branchManager",
  "branch manager": "branchManager",
  "مدير فرع": "branchManager",

  pharmacist: "pharmacist",
  "صيدلي": "pharmacist",
  "صيدلاني": "pharmacist",
  "صيدلي أول": "pharmacist",
  "صيدلي متدرب": "pharmacist",
  trainee: "pharmacist",
  senior_pharmacist: "pharmacist",

  cashier: "cashier",
  "كاشير": "cashier",
  "مساعد صيدلي": "cashier",
  assistant: "cashier",
  warehouse: "cashier",
  "أمين مستودع": "cashier",
};

export const PLAN_STAFF_LIMITS: Record<string, number> = {
  free: 3,
  trial: 3,
  "تجريبي": 3,
  "تجربة مجانية": 3,

  monthly: 5,
  basic: 5,
  "شهري": 5,
  "اشتراك شهري": 5,

  annual: 999,
  "سنوي": 999,
  "اشتراك سنوي": 999,

  lifetime: 999,
  "مدى الحياة": 999,
};

export function normalizeRole(role?: string): CanonicalRole {
  if (!role) return "pharmacist";
  const normalized = String(role).trim().toLowerCase();
  return ROLE_ALIASES[normalized] || "pharmacist";
}

export function getPlanMaxStaff(subscriptionType?: string): number {
  const key = String(subscriptionType || "trial").trim().toLowerCase();
  return PLAN_STAFF_LIMITS[key] !== undefined ? PLAN_STAFF_LIMITS[key] : 3;
}

export function canAddStaff(
  currentActiveCount: number,
  subscriptionType?: string,
  customPlanLimit?: number | null
): StaffQuotaResult {
  const maxStaff = typeof customPlanLimit === "number" && customPlanLimit > 0
    ? customPlanLimit
    : getPlanMaxStaff(subscriptionType);

  const activeCount = Number(currentActiveCount) || 0;
  const allowed = activeCount < maxStaff;

  return {
    allowed,
    maxStaff,
    currentCount: activeCount,
    remaining: Math.max(0, maxStaff - activeCount),
    reasonCode: allowed ? null : "STAFF_LIMIT_REACHED",
    message: allowed
      ? null
      : `تم الوصول إلى الحد الأقصى للموظفين المسموح به في باقتك (${maxStaff} موظفين). يرجى الترقية لإضافة المزيد من الموظفين.`,
  };
}

export function isStaffActive(staff: any): boolean {
  if (!staff) return false;
  if (staff.active === 0 || staff.active === false || staff.active === "0") return false;
  if (staff.status && ["suspended", "inactive", "disabled", "موقوف"].includes(String(staff.status).toLowerCase())) {
    return false;
  }
  return true;
}

export function canActorManageStaff(
  actor?: StaffActor | null,
  targetStaff?: StaffRecord | null,
  action: "add" | "edit" | "delete" | "deactivate" = "edit"
): StaffPermissionResult {
  if (!actor) {
    return { allowed: false, reasonCode: "UNAUTHORIZED", message: "يلزم تسجيل الدخول للتحقق من الصلاحيات" };
  }

  const actorRole = normalizeRole(actor.role);
  const actorBranch = String(actor.branch || "").trim();
  const actorId = String(actor.id || "");

  // Cashiers and Pharmacists have NO staff management privileges
  if (actorRole === "pharmacist" || actorRole === "cashier") {
    return {
      allowed: false,
      reasonCode: "MANAGER_REQUIRED",
      message: "لا تملك الصلاحية لإدارة الموظفين، يلزم حساب مدير",
    };
  }

  // Self-protection: Actor cannot delete or deactivate themselves
  if (targetStaff) {
    const targetId = String(targetStaff.id || "");
    const targetEmail = String(targetStaff.email || "").trim().toLowerCase();
    const actorEmail = String(actor.email || "").trim().toLowerCase();
    const isSelf = (targetId && targetId === actorId) || (targetEmail && targetEmail === actorEmail);

    if (isSelf && (action === "delete" || action === "deactivate")) {
      return {
        allowed: false,
        reasonCode: "CANNOT_DELETE_CURRENT_ACCOUNT",
        message: "لا يمكنك حذف أو تعطيل الحساب الشخصي الذي قمت بتسجيل الدخول به",
      };
    }
  }

  // General Manager / Owner: Full administrative privileges
  if (actorRole === "manager") {
    return { allowed: true };
  }

  // Branch Manager: Limited to their own branch & lower roles (pharmacist / cashier)
  if (actorRole === "branchManager") {
    if (!actorBranch) {
      return {
        allowed: false,
        reasonCode: "BRANCH_ASSIGNMENT_REQUIRED",
        message: "حساب مدير الفرع غير معين على فرع محدد",
      };
    }

    if (targetStaff) {
      const targetBranch = String(targetStaff.branch || "").trim();
      const targetRole = normalizeRole(targetStaff.role);

      // Check branch match
      if (targetBranch && targetBranch !== actorBranch) {
        return {
          allowed: false,
          reasonCode: "BRANCH_STAFF_PERMISSION_DENIED",
          message: "لا يمكنك إدارة موظفين تابعين لفرع آخر",
        };
      }

      // Check role restriction: cannot manage other managers
      if (targetRole === "manager" || targetRole === "branchManager") {
        return {
          allowed: false,
          reasonCode: "BRANCH_STAFF_PERMISSION_DENIED",
          message: "لا يملك مدير الفرع صلاحية تعيين أو تعديل مدراء",
        };
      }
    }

    return { allowed: true };
  }

  return { allowed: false, reasonCode: "PERMISSION_DENIED", message: "الصلاحية غير متوفرة" };
}

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return "";
  return String(rawPhone).replace(/[^\d+]/g, "").trim();
}

export function validateStaffInput(
  input: any,
  existingStaffList: any[] = [],
  currentStaffId?: string | number | null
): StaffValidationResult {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== "object") {
    return { ok: false, errors: { form: "بيانات الموظف غير صالحة" }, cleanData: null };
  }

  const name = String(input.name || "").trim();
  if (!name || name.length < 2) {
    errors.name = "يرجى إدخال اسم الموظف بشكل صحيح (حرفين على الأقل)";
  }

  const role = normalizeRole(input.role);
  const branch = String(input.branch || "").trim();
  if (!branch) {
    errors.branch = "يرجى تحديد الفرع التابع له الموظف";
  }

  const rawEmail = String(input.email || "").trim().toLowerCase();
  const rawPhone = normalizePhone(input.phone);

  if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    errors.email = "صيغة البريد الإلكتروني غير صالحة";
  }

  if (rawPhone && rawPhone.replace(/\D/g, "").length < 9) {
    errors.phone = "رقم الهاتف يجب أن لا يقل عن 9 أرقام";
  }

  // Must provide at least one login identifier (email or phone)
  if (!rawEmail && !rawPhone) {
    errors.login = "يجب توفير البريد الإلكتروني أو رقم الهاتف لتسجيل الدخول";
  }

  // Password validation: required for new staff, optional when editing
  const rawPassword = input.password !== undefined ? String(input.password) : "";
  const isNew = !currentStaffId;
  if (isNew && (!rawPassword || rawPassword.length < 6)) {
    errors.password = "كلمة المرور مطلوبة ويجب ألا تقل عن 6 خانات";
  } else if (!isNew && rawPassword && rawPassword.length < 6) {
    errors.password = "كلمة المرور يجب ألا تقل عن 6 خانات";
  }

  // Duplicate email check
  if (rawEmail && Array.isArray(existingStaffList)) {
    const duplicate = existingStaffList.some((s) => {
      if (!s) return false;
      const sId = String(s.id || "");
      if (currentStaffId && sId === String(currentStaffId)) return false;
      return String(s.email || "").trim().toLowerCase() === rawEmail;
    });
    if (duplicate) {
      errors.email = "البريد الإلكتروني مستخدم بالفعل لموظف آخر";
    }
  }

  const salary = Number(input.salary) || 0;
  if (salary < 0) {
    errors.salary = "الراتب لا يمكن أن يكون سالباً";
  }

  const controlledMedsAccess = Boolean(input.controlledMedsAccess);
  const active = input.active !== undefined ? (isStaffActive(input) ? 1 : 0) : 1;

  const ok = Object.keys(errors).length === 0;
  const cleanData = ok
    ? {
        name,
        role,
        branch,
        email: rawEmail,
        phone: rawPhone,
        salary,
        controlledMedsAccess,
        active,
        ...(input.avatar !== undefined ? { avatar: String(input.avatar || "") } : {}),
        ...(rawPassword ? { password: rawPassword } : {}),
      }
    : null;

  return { ok, errors, cleanData };
}

export function getRoleDisplayName(role?: string, lang: string = "ar"): string {
  const isEn = lang === "en";
  const canonical = normalizeRole(role);
  switch (canonical) {
    case "manager":
      return isEn ? "System Manager" : "مدير النظام";
    case "branchManager":
      return isEn ? "Branch Manager" : "مدير فرع";
    case "pharmacist":
      return isEn ? "Pharmacist" : "صيدلاني";
    case "cashier":
      return isEn ? "Cashier" : "كاشير";
    default:
      return isEn ? "Staff" : "موظف";
  }
}
