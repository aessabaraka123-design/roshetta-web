import { API_BASE_URL } from "@/lib/config";
import { useStore } from "@/store";

const TRIAL_TYPES = new Set(["trial", "free", "تجريبي", "تجربة مجانية"]);
const MANAGER_ROLES = new Set(["manager", "owner", "admin", "superadmin", "مدير", "مالك"]);

export function isManagerRole(role?: string | null): boolean {
  return MANAGER_ROLES.has(String(role || "").toLowerCase().trim());
}

export async function authFetchJson(url: string) {
  const token =
    useStore.getState().token ||
    (typeof window !== "undefined" ? localStorage.getItem("roshetta_token") : null);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!res.ok) {
    if (isJson && res.status >= 400 && res.status < 500) {
      return res.json();
    }
    const err: any = new Error(`Request failed with status ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (!isJson) {
    throw new Error("Expected JSON response from server");
  }
  return res.json();
}

export function getPlanLabel(planType?: string | null, lang: "ar" | "en" = "ar"): string {
  const clean = String(planType || "").toLowerCase().trim();
  if (TRIAL_TYPES.has(clean)) {
    return lang === "en" ? "Free Trial (14 Days)" : "التجربة المجانية (14 يوم)";
  }
  if (clean === "monthly" || clean === "basic") {
    return lang === "en" ? "Monthly Plan" : "الاشتراك الشهري";
  }
  if (clean === "annual") {
    return lang === "en" ? "Annual Plan" : "الاشتراك السنوي";
  }
  if (clean === "lifetime") {
    return lang === "en" ? "Lifetime License" : "مدى الحياة";
  }
  return planType || (lang === "en" ? "Monthly Plan" : "الاشتراك الشهري");
}

export function resolveEffectiveExpiryMs(source?: any): number {
  if (!source) return NaN;
  const pharmacy = source.pharmacy || source;
  const rawExpiry =
    source.subscriptionExpiry ||
    pharmacy?.subscriptionExpiry ||
    null;
  if (rawExpiry) {
    const parsed = Date.parse(rawExpiry);
    if (Number.isFinite(parsed)) return parsed;
  }
  const subType = String(
    source.subscriptionType ||
      pharmacy?.subscriptionType ||
      source.plan_type ||
      ""
  )
    .toLowerCase()
    .trim();
  const createdRaw = source.createdAt || pharmacy?.createdAt || null;
  if (TRIAL_TYPES.has(subType) && createdRaw) {
    const createdMs = Date.parse(createdRaw);
    if (Number.isFinite(createdMs)) {
      return createdMs + 14 * 24 * 60 * 60 * 1000;
    }
  }
  return NaN;
}

export interface SubscriptionNoticeState {
  planType: string;
  activePlan: string;
  expiryIso: string | null;
  expiryMs: number;
  daysLeft: number | null;
  isLifetime: boolean;
  isRejected: boolean;
  isPending: boolean;
  isDateExpired: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isReadOnly: boolean;
  isManager: boolean;
  whatsapp: string;
}

export function getSubscriptionNoticeState(user: any, subStatusData?: any): SubscriptionNoticeState {
  const validSub = subStatusData?.success ? subStatusData : null;
  const planType = String(
    validSub?.subscriptionType ||
      validSub?.pharmacy?.subscriptionType ||
      user?.subscriptionType ||
      "monthly"
  )
    .toLowerCase()
    .trim();
  const isLifetime = planType === "lifetime";

  const expiryMs = isLifetime
    ? NaN
    : (() => {
        const fromSub = resolveEffectiveExpiryMs(validSub);
        if (Number.isFinite(fromSub)) return fromSub;
        return resolveEffectiveExpiryMs(user);
      })();

  const expiryIso =
    validSub?.subscriptionExpiry ||
    validSub?.pharmacy?.subscriptionExpiry ||
    user?.subscriptionExpiry ||
    (Number.isFinite(expiryMs) ? new Date(expiryMs).toISOString() : null);

  const daysLeft =
    !isLifetime && Number.isFinite(expiryMs)
      ? Math.ceil((expiryMs - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

  const isDateExpired =
    !isLifetime && Number.isFinite(expiryMs) && expiryMs <= Date.now();

  const rawReadOnly = Boolean(
    user?.isReadOnly ||
      validSub?.isReadOnly ||
      validSub?.isExpired ||
      user?.isExpired ||
      isDateExpired
  );

  const isRejected = rawReadOnly && validSub?.status === "rejected";
  const isPending = rawReadOnly && validSub?.status === "pending";
  const isExpired = rawReadOnly && !isRejected && !isPending;
  const isExpiringSoon =
    !isExpired &&
    !isRejected &&
    !isPending &&
    !isLifetime &&
    daysLeft !== null &&
    daysLeft > 0 &&
    daysLeft <= 7;

  return {
    planType,
    activePlan: validSub?.plan_type || planType || "monthly",
    expiryIso,
    expiryMs,
    daysLeft,
    isLifetime,
    isRejected,
    isPending,
    isDateExpired,
    isExpired,
    isExpiringSoon,
    isReadOnly: rawReadOnly,
    isManager: isManagerRole(user?.role),
    whatsapp: validSub?.whatsapp || "972590000000",
  };
}

export function formatExpiryDate(expiryIso?: string | null, lang: "ar" | "en" = "ar"): string {
  if (!expiryIso) return "";
  const d = new Date(expiryIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "en" ? "en-US" : "ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildSubscriptionNotification(
  pharmacyId: string | undefined,
  state: SubscriptionNoticeState,
  lang: "ar" | "en" = "ar"
) {
  if (!pharmacyId) return null;
  const dateText = formatExpiryDate(state.expiryIso, lang);

  if (state.isExpired) {
    const bodyAr = dateText
      ? `انتهت صلاحية اشتراك الصيدلية (${getPlanLabel(state.planType, "ar")}) بتاريخ ${dateText}. يمكنك تجديد الاشتراك الآن لاستعادة كامل الصلاحيات.`
      : `انتهت صلاحية اشتراك الصيدلية (${getPlanLabel(state.planType, "ar")}). يمكنك تجديد الاشتراك الآن لاستعادة كامل الصلاحيات.`;
    const bodyEn = dateText
      ? `Your pharmacy subscription (${getPlanLabel(state.planType, "en")}) expired on ${dateText}. Renew now to restore full access.`
      : `Your pharmacy subscription (${getPlanLabel(state.planType, "en")}) has expired. Renew now to restore full access.`;
    return {
      id: `sub_expired_${pharmacyId}`,
      type: "subscription_expired",
      title: lang === "en" ? "Subscription Expired" : "انتهى اشتراك الصيدلية",
      body: lang === "en" ? bodyEn : bodyAr,
      route: "/upgrade-plan",
      is_read: 0,
      created_at: state.expiryIso || new Date().toISOString(),
    };
  }

  if (state.isExpiringSoon && state.daysLeft !== null) {
    return {
      id: `sub_expiring_${pharmacyId}`,
      type: "subscription_expiring",
      title: lang === "en" ? "Subscription Expiring Soon" : "قرب انتهاء اشتراك الصيدلية",
      body:
        lang === "en"
          ? `Your subscription expires in ${state.daysLeft} day(s)${dateText ? ` (${dateText})` : ""}. Renew early to avoid interruption.`
          : `يتبقى ${state.daysLeft} أيام على انتهاء اشتراكك${dateText ? ` (${dateText})` : ""}؛ يمكنك التجديد الآن لتجنب توقف العمليات.`,
      route: "/upgrade-plan",
      is_read: 0,
      created_at: new Date().toISOString(),
    };
  }

  return null;
}

export function getSubscriptionStatusEndpoint(pharmacyId?: string) {
  return pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/subscription-status` : null;
}
