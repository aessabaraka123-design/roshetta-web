import useSWR, { mutate } from "swr";
import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import { StaffRecord, StaffQuotaResult, validateStaffInput, StaffValidationResult } from "./domain";

export const API_BASE = API_BASE_URL;

export interface StaffApiResponse {
  success: boolean;
  staff: StaffRecord[];
  quota: StaffQuotaResult & { subscriptionType: string };
}

const getAuthHeaders = () => {
  return getWebAuthHeaders();
};

const staffFetcher = async (url: string): Promise<StaffApiResponse> => {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || "فشل تحميل بيانات الموظفين");
  }
  const data = await res.json();
  return {
    success: true,
    staff: Array.isArray(data.staff) ? data.staff : [],
    quota: data.quota || {
      maxStaff: 5,
      activeCount: (data.staff || []).filter((s: any) => s.active !== 0 && s.status !== "suspended").length,
      allowed: true,
      remaining: 5,
      reasonCode: null,
      message: null,
      subscriptionType: "monthly",
    },
  };
};

export function useStaffData(pharmacyId?: string | null) {
  const url = pharmacyId ? `${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff` : null;
  const { data, error, isLoading, mutate: swrMutate } = useSWR<StaffApiResponse>(url, staffFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  return {
    staff: data?.staff || [],
    quota: data?.quota || {
      maxStaff: 5,
      activeCount: 0,
      allowed: true,
      remaining: 5,
      reasonCode: null,
      message: null,
      subscriptionType: "monthly",
    },
    isLoading,
    isError: Boolean(error),
    errorMessage: error?.message,
    mutate: swrMutate,
  };
}

export async function addStaff(
  pharmacyId: string,
  staffData: any,
  lang: string = "ar"
): Promise<{ success: boolean; id: string }> {
  const isEn = lang === "en";
  const res = await fetch(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(staffData),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && data.code === "STAFF_LIMIT_REACHED") {
      throw new Error(
        isEn
          ? "Staff member quota reached for your current plan. Please upgrade to add more staff."
          : (data.error || "تم الوصول إلى الحد الأقصى للموظفين المسموح به في باقتك. يرجى ترقية الاشتراك.")
      );
    }
    throw new Error(data.error || data.message || (isEn ? "Failed to add staff" : "تعذر إضافة الموظف"));
  }

  mutate(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff`);
  return { success: true, id: data.id };
}

export async function editStaff(
  pharmacyId: string,
  staffId: string,
  staffData: any,
  lang: string = "ar"
): Promise<{ success: boolean; id: string }> {
  const isEn = lang === "en";
  const res = await fetch(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff/${staffId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(staffData),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && data.code === "STAFF_LIMIT_REACHED") {
      throw new Error(
        isEn
          ? "Cannot activate staff: plan staff quota limit reached. Please upgrade."
          : (data.error || "تعذر تفعيل الموظف: تم الوصول للحد الأقصى لعدد الموظفين في باقتك.")
      );
    }
    throw new Error(data.error || data.message || (isEn ? "Failed to update staff" : "تعذر تعديل الموظف"));
  }

  mutate(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff`);
  return { success: true, id: staffId };
}

export async function deleteStaff(
  pharmacyId: string,
  staffId: string,
  lang: string = "ar"
): Promise<{ success: boolean; id: string }> {
  const isEn = lang === "en";
  const res = await fetch(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff/${staffId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 409 && data.code === "CANNOT_DELETE_CURRENT_ACCOUNT") {
      throw new Error(
        isEn
          ? "You cannot delete the active account currently logged in."
          : "لا يمكنك حذف الحساب الشخصي الذي قمت بتسجيل الدخول به حالياً."
      );
    }
    throw new Error(data.error || data.message || (isEn ? "Failed to delete staff" : "تعذر حذف الموظف"));
  }

  mutate(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff`);
  return { success: true, id: staffId };
}

export async function toggleStaffStatus(
  pharmacyId: string,
  staffId: string,
  targetActive: boolean | number,
  lang: string = "ar"
): Promise<{ success: boolean; id: string }> {
  return editStaff(
    pharmacyId,
    staffId,
    { active: targetActive ? 1 : 0, status: targetActive ? "active" : "suspended" },
    lang
  );
}

export function revalidateStaff(pharmacyId: string) {
  mutate(`${API_BASE}/api/admin/pharmacies/${pharmacyId}/staff`);
}
