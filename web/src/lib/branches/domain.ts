/**
 * web/src/lib/branches/domain.ts
 * Authoritative Pure Domain Logic for Pharmacy Branches & Subscription Quotas.
 * Exact 3-Way Parity with Server CJS & Mobile JS.
 */

export interface BranchRecord {
  id: string;
  pharmacy_id?: string;
  name: string;
  addr?: string;
  phone?: string;
  status?: string;
  syncStatus?: "synced" | "pending" | "error";
  createdAt?: string;
}

export const DEFAULT_PLAN_BRANCH_LIMITS: Readonly<Record<string, number>> = Object.freeze({
  free: 1,
  trial: 1,
  monthly: 2,
  annual: 999,
  lifetime: 999,
  basic: 2,
  enterprise: 999,
});

export function normalizeUserRole(role?: string): string {
  if (!role) return "cashier";
  const r = String(role).trim().toLowerCase();
  if (["manager", "owner", "admin", "مدير", "مالك"].includes(r)) return "manager";
  if (["branchmanager", "branch_manager", "مدير فرع", "مدير_فرع"].includes(r)) return "branchManager";
  if (["pharmacist", "صيدلي", "صيدلي أول", "senior_pharmacist"].includes(r)) return "pharmacist";
  if (["cashier", "كاشير"].includes(r)) return "cashier";
  return r;
}

export function canManageBranches(role?: string): boolean {
  const norm = normalizeUserRole(role);
  return norm === "manager";
}

export function normalizeSubscriptionType(subType?: string): string {
  if (!subType) return "trial";
  const s = String(subType).trim().toLowerCase();
  if (["free", "trial", "تجريبي", "تجربة مجانية"].includes(s)) return "trial";
  if (["monthly", "شهري", "basic"].includes(s)) return "monthly";
  if (["annual", "سنوي", "yearly"].includes(s)) return "annual";
  if (["lifetime", "مدى الحياة"].includes(s)) return "lifetime";
  return s;
}

export function getSubscriptionBranchLimit(
  subscriptionType?: string,
  customMaxBranches?: number | null
): number {
  if (customMaxBranches !== null && customMaxBranches !== undefined) {
    const num = Number(customMaxBranches);
    if (Number.isFinite(num) && num > 0) return num;
  }
  const norm = normalizeSubscriptionType(subscriptionType);
  return DEFAULT_PLAN_BRANCH_LIMITS[norm] || 2;
}

export function isBranchActive(branch?: BranchRecord | null): boolean {
  if (!branch) return false;
  const st = String(branch.status || "نشط").trim().toLowerCase();
  return !["مؤرشف", "archived", "deleted", "محذوف", "inactive"].includes(st);
}

export function countActiveBranches(branches: BranchRecord[] = []): number {
  if (!Array.isArray(branches)) return 0;
  return branches.filter(isBranchActive).length;
}

export interface CanAddBranchResult {
  allowed: boolean;
  maxBranches: number;
  currentCount: number;
  reasonCode: string | null;
  message: string | null;
}

export function canAddBranch(
  activeCount: number,
  subscriptionType?: string,
  customMaxBranches?: number | null
): CanAddBranchResult {
  const maxBranches = getSubscriptionBranchLimit(subscriptionType, customMaxBranches);
  const currentCount = Number(activeCount) || 0;
  const allowed = currentCount < maxBranches;

  return {
    allowed,
    maxBranches,
    currentCount,
    reasonCode: allowed ? null : "BRANCH_LIMIT_REACHED",
    message: allowed
      ? null
      : `لقد بلغت الحد الأقصى للفروع المسموح بها في باقتك الحالية (${maxBranches} ${maxBranches === 1 ? "فرع" : "فروع"}). يرجى الترقية لإضافة فروع جديدة.`,
  };
}

export function isMainBranch(branchOrName?: BranchRecord | string | null): boolean {
  if (!branchOrName) return false;
  const name = typeof branchOrName === "object" ? String(branchOrName.name || "") : String(branchOrName);
  const id = typeof branchOrName === "object" ? String(branchOrName.id || "") : "";
  if (id.toLowerCase() === "main") return true;
  const clean = name.trim().toLowerCase();
  return clean === "الفرع الرئيسي" || clean === "main" || clean === "main branch" || clean.includes("الرئيسي");
}

export interface CanArchiveBranchResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export function canArchiveBranch(
  branch: BranchRecord | null | undefined,
  opts: { activeBranchesCount?: number; openShiftsCount?: number } = {}
): CanArchiveBranchResult {
  const { activeBranchesCount = 1, openShiftsCount = 0 } = opts;
  if (!branch) {
    return { ok: false, code: "BRANCH_NOT_FOUND", message: "الفرع غير موجود" };
  }
  if (!isBranchActive(branch)) {
    return { ok: false, code: "BRANCH_ALREADY_ARCHIVED", message: "الفرع مؤرشف بالفعل" };
  }
  if (activeBranchesCount <= 1) {
    return {
      ok: false,
      code: "CANNOT_ARCHIVE_LAST_BRANCH",
      message: "لا يمكن أرشفة الفرع النشط الوحيد. يجب أن تحتوي الصيدلية على فرع نشط واحد على الأقل.",
    };
  }
  if (Number(openShiftsCount) > 0) {
    return {
      ok: false,
      code: "BRANCH_HAS_OPEN_SHIFTS",
      message: `لا يمكن أرشفة الفرع لوجود (${openShiftsCount}) وردية كاشير مفتوحة حالياً. يرجى إغلاق الورديات أولاً.`,
    };
  }
  return { ok: true };
}

export function normalizeBranchName(name?: string): string {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

export interface ValidateBranchInputResult {
  ok: boolean;
  code?: string;
  message?: string;
  sanitized?: {
    name: string;
    addr: string;
    phone: string;
    status: string;
  };
}

export function validateBranchInput(
  payload: Record<string, any> = {},
  existingBranches: BranchRecord[] = [],
  currentBranchId: string | null = null
): ValidateBranchInputResult {
  const name = normalizeBranchName(payload.name);
  if (!name) {
    return { ok: false, code: "BRANCH_NAME_REQUIRED", message: "اسم الفرع مطلوب" };
  }
  if (name.length < 2 || name.length > 100) {
    return { ok: false, code: "INVALID_BRANCH_NAME_LENGTH", message: "يجب أن يتراوح طول اسم الفرع بين حرفين و 100 حرف" };
  }

  const nameLower = name.toLowerCase();
  const duplicate = (existingBranches || []).find((b) => {
    if (!b) return false;
    if (currentBranchId && String(b.id) === String(currentBranchId)) return false;
    if (!isBranchActive(b)) return false;
    return normalizeBranchName(b.name).toLowerCase() === nameLower;
  });

  if (duplicate) {
    return { ok: false, code: "BRANCH_NAME_CONFLICT", message: `اسم الفرع "${name}" مستخدم بالفعل في فرع نشط آخر` };
  }

  const addr = String(payload.addr || payload.address || payload.manager || "").trim();
  const phone = String(payload.phone || "").trim();

  return {
    ok: true,
    sanitized: {
      name,
      addr,
      phone,
      status: payload.status || "نشط",
    },
  };
}

export function buildCanonicalBranchCommand(opts: {
  eventId?: string;
  action: "ADD_BRANCH" | "EDIT_BRANCH" | "ARCHIVE_BRANCH" | "SOFT_DELETE_BRANCH" | "RESTORE_BRANCH";
  targetId?: string | null;
  payload?: Record<string, any>;
  actorName?: string;
}) {
  const evId = opts.eventId || `EVT-BR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    eventId: evId,
    action: opts.action,
    targetId: opts.targetId ? String(opts.targetId) : null,
    payload: {
      ...(opts.payload || {}),
      eventId: evId,
      actorName: opts.actorName || "System",
      timestamp: opts.payload?.timestamp || new Date().toISOString(),
    },
  };
}

export function applyBranchCommandOptimistically(state: any, command: any): any {
  const branches: BranchRecord[] = Array.isArray(state?.branches) ? [...state.branches] : [];
  const action = command.action;
  const payload = command.payload || {};
  const targetId = command.targetId || payload.id;

  switch (action) {
    case "ADD_BRANCH": {
      const newBranch: BranchRecord = {
        id: String(targetId || payload.id || `BR-${Date.now()}`),
        pharmacy_id: payload.pharmacy_id || state?.pharmacyId || "",
        name: normalizeBranchName(payload.name),
        addr: payload.addr || "",
        phone: payload.phone || "",
        status: payload.status || "نشط",
        syncStatus: "pending",
        createdAt: payload.timestamp || new Date().toISOString(),
      };
      return {
        ...state,
        branches: [newBranch, ...branches],
      };
    }
    case "EDIT_BRANCH": {
      const updated = branches.map((b) => {
        if (String(b.id) === String(targetId) || String(b.name) === String(targetId)) {
          return {
            ...b,
            name: payload.name !== undefined ? normalizeBranchName(payload.name) : b.name,
            addr: payload.addr !== undefined ? payload.addr : b.addr,
            phone: payload.phone !== undefined ? payload.phone : b.phone,
            status: payload.status !== undefined ? payload.status : b.status,
            syncStatus: "pending" as const,
          };
        }
        return b;
      });
      return { ...state, branches: updated };
    }
    case "ARCHIVE_BRANCH":
    case "SOFT_DELETE_BRANCH": {
      const updated = branches.map((b) => {
        if (String(b.id) === String(targetId) || String(b.name) === String(targetId)) {
          return { ...b, status: "مؤرشف", syncStatus: "pending" as const };
        }
        return b;
      });
      return { ...state, branches: updated };
    }
    case "RESTORE_BRANCH": {
      const updated = branches.map((b) => {
        if (String(b.id) === String(targetId) || String(b.name) === String(targetId)) {
          return { ...b, status: "نشط", syncStatus: "pending" as const };
        }
        return b;
      });
      return { ...state, branches: updated };
    }
    default:
      return state;
  }
}

export function resolveBranchDisplayName(branches: BranchRecord[] = [], branchIdOrName = "", lang = "ar"): string {
  if (!branchIdOrName) return lang === "en" ? "Unspecified" : "غير محدد";
  const idStr = String(branchIdOrName).trim();
  const match = (branches || []).find((b) => String(b.id) === idStr || String(b.name) === idStr);
  if (match) return match.name;
  if (isMainBranch(idStr)) return lang === "en" ? "Main Branch" : "الفرع الرئيسي";
  return idStr;
}
