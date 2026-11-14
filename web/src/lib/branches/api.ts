/**
 * web/src/lib/branches/api.ts
 * SWR Data Hooks and Canonical API Operations for Branches.
 */

import useSWR, { mutate } from "swr";
import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import {
  buildCanonicalBranchCommand,
  type BranchRecord,
  type CanAddBranchResult,
} from "./domain";

export interface BranchesApiResponse {
  success: boolean;
  branches: BranchRecord[];
  quota?: {
    maxBranches: number;
    activeCount: number;
    allowed: boolean;
    subscriptionType: string;
  };
  error?: string;
  code?: string;
  details?: any;
}

async function branchesFetcher(url: string): Promise<BranchesApiResponse> {
  const res = await fetch(url, { headers: getWebAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const error: any = new Error(data.error || data.code || `HTTP_${res.status}`);
    error.status = res.status;
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}

export function revalidateBranches(pharmacyId?: string) {
  if (!pharmacyId) return;
  mutate(
    (key) =>
      typeof key === "string" &&
      key.includes(`/api/admin/pharmacies/${pharmacyId}/branches`),
    undefined,
    { revalidate: true }
  );
}

export function useBranchesData(
  pharmacyId?: string,
  options: { includeArchived?: boolean } = {}
) {
  const includeArchived = Boolean(options.includeArchived);
  const key = pharmacyId
    ? `${API_BASE_URL}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}/branches?includeArchived=${includeArchived}`
    : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR<BranchesApiResponse>(
    key,
    branchesFetcher,
    { revalidateOnFocus: true }
  );

  return {
    branches: data?.branches || [],
    quota: data?.quota,
    isLoading,
    error,
    mutate: boundMutate,
  };
}

export async function addBranch(
  pharmacyId: string,
  payload: { name: string; addr?: string; phone?: string; status?: string },
  language: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalBranchCommand({
    action: "ADD_BRANCH",
    payload,
  });

  const res = await fetch(`${API_BASE_URL}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": cmd.eventId,
      ...getWebAuthHeaders(),
    },
    body: JSON.stringify({ ...cmd.payload, id: cmd.targetId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err: any = new Error(
      data.code === "BRANCH_LIMIT_REACHED"
        ? language === "en"
          ? `Branch limit reached (${data.details?.maxBranches || 2} branches). Please upgrade your subscription.`
          : `لقد بلغت الحد الأقصى للفروع في باقتك (${data.details?.maxBranches || 2} فروع). يرجى ترقية الاشتراك.`
        : data.code === "BRANCH_NAME_CONFLICT"
          ? language === "en"
            ? "Branch name is already in use"
            : "اسم الفرع مستخدم بالفعل"
          : data.error || (language === "en" ? "Failed to add branch" : "تعذر إضافة الفرع")
    );
    err.code = data.code;
    err.details = data.details;
    throw err;
  }

  revalidateBranches(pharmacyId);
  return data;
}

export async function editBranch(
  pharmacyId: string,
  branchId: string,
  payload: { name?: string; addr?: string; phone?: string; status?: string },
  language: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalBranchCommand({
    action: "EDIT_BRANCH",
    targetId: branchId,
    payload,
  });

  const res = await fetch(
    `${API_BASE_URL}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}/branches/${encodeURIComponent(branchId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": cmd.eventId,
        ...getWebAuthHeaders(),
      },
      body: JSON.stringify(cmd.payload),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err: any = new Error(
      data.code === "BRANCH_NAME_CONFLICT"
        ? language === "en"
          ? "Branch name is already in use"
          : "اسم الفرع مستخدم بالفعل"
        : data.error || (language === "en" ? "Failed to edit branch" : "تعذر تعديل الفرع")
    );
    err.code = data.code;
    throw err;
  }

  revalidateBranches(pharmacyId);
  return data;
}

export async function archiveBranch(
  pharmacyId: string,
  branchId: string,
  language: "ar" | "en" = "ar"
) {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}/branches/${encodeURIComponent(branchId)}`,
    {
      method: "DELETE",
      headers: getWebAuthHeaders(),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err: any = new Error(
      data.code === "CANNOT_ARCHIVE_LAST_BRANCH"
        ? language === "en"
          ? "Cannot archive the only active branch"
          : "لا يمكن أرشفة الفرع النشط الوحيد"
        : data.code === "BRANCH_HAS_OPEN_SHIFTS"
          ? language === "en"
            ? "Cannot archive branch with active open cashier shifts"
            : "لا يمكن أرشفة الفرع لوجود وردية كاشير مفتوحة حالياً"
          : data.error || (language === "en" ? "Failed to archive branch" : "تعذر أرشفة الفرع")
    );
    err.code = data.code;
    throw err;
  }

  revalidateBranches(pharmacyId);
  return data;
}

export async function restoreBranch(
  pharmacyId: string,
  branchId: string,
  language: "ar" | "en" = "ar"
) {
  const res = await fetch(
    `${API_BASE_URL}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}/branches/${encodeURIComponent(branchId)}/restore`,
    {
      method: "PUT",
      headers: getWebAuthHeaders(),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err: any = new Error(
      data.code === "BRANCH_LIMIT_REACHED"
        ? language === "en"
          ? `Branch limit reached (${data.details?.maxBranches || 2} branches). Upgrade to restore.`
          : `لقد بلغت الحد الأقصى للفروع في باقتك (${data.details?.maxBranches || 2} فروع). يرجى الترقية للاستعادة.`
        : data.error || (language === "en" ? "Failed to restore branch" : "تعذر استعادة الفرع")
    );
    err.code = data.code;
    throw err;
  }

  revalidateBranches(pharmacyId);
  return data;
}
