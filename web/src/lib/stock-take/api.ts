/**
 * web/src/lib/stock-take/api.ts
 * Unified SWR Data Hooks & Transactional Command Wrappers for Web Stock Take & Shrinkage.
 */

import useSWR, { mutate } from "swr";
import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import { revalidateInventoryKeys } from "@/lib/inventory/api";
import { buildCanonicalStockTakeCommand } from "@/lib/stock-take/domain";
import {
  dispatchStockTakeCommand,
  newStockTakeEventId,
  readStockTakeLocalSnapshot,
  saveStockTakeLocalSnapshot,
} from "@/lib/stock-take/transport";

async function stFetcher(url: string) {
  const res = await fetch(url, { headers: getWebAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.code || data?.error || `HTTP_${res.status}`);
  }
  return data;
}

export function revalidateStockTakeKeys(pharmacyId: string) {
  if (!pharmacyId) return;
  revalidateInventoryKeys(pharmacyId);
  mutate(
    (key) =>
      typeof key === "string" &&
      key.includes(`/api/pharmacies/${pharmacyId}`) &&
      (key.includes("/stock-take") || key.includes("/expenses")),
    undefined,
    { revalidate: true }
  );
}

export function useStockTakeSessionsData(pharmacyId?: string, lang: "ar" | "en" = "ar") {
  const key = pharmacyId
    ? `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/stock-take/sessions?lang=${lang}`
    : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, stFetcher, {
    revalidateOnFocus: true,
    onSuccess: (res) => {
      if (pharmacyId && Array.isArray(res?.sessions)) {
        saveStockTakeLocalSnapshot(pharmacyId, "sessions", res.sessions);
      }
      if (pharmacyId && res?.shrinkageKpis) {
        saveStockTakeLocalSnapshot(pharmacyId, "kpis", res.shrinkageKpis);
      }
    },
  });

  const cachedSessions = pharmacyId ? readStockTakeLocalSnapshot<any[]>(pharmacyId, "sessions", []) : [];
  const cachedKpis = pharmacyId ? readStockTakeLocalSnapshot<any>(pharmacyId, "kpis", null) : null;

  return {
    sessions: Array.isArray(data?.sessions) ? data.sessions : cachedSessions,
    shrinkageKpis: data?.shrinkageKpis || cachedKpis,
    isLoading,
    error,
    mutate: boundMutate,
  };
}

export async function createStockTakeSession(
  pharmacyId: string,
  payload: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalStockTakeCommand({
    eventId: newStockTakeEventId(),
    action: "CREATE_STOCK_TAKE_SESSION",
    targetId: payload.id || null,
    payload,
  });
  const res = await dispatchStockTakeCommand(pharmacyId, cmd, lang);
  revalidateStockTakeKeys(pharmacyId);
  return res;
}

export async function updateStockTakeSession(
  pharmacyId: string,
  sessionId: string,
  payload: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalStockTakeCommand({
    eventId: newStockTakeEventId(),
    action: "UPDATE_STOCK_TAKE_SESSION",
    targetId: sessionId,
    payload,
  });
  const res = await dispatchStockTakeCommand(pharmacyId, cmd, lang);
  revalidateStockTakeKeys(pharmacyId);
  return res;
}

export async function postStockTakeSession(
  pharmacyId: string,
  sessionId: string,
  payload: Record<string, any> = {},
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalStockTakeCommand({
    eventId: newStockTakeEventId(),
    action: "POST_STOCK_TAKE_SESSION",
    targetId: sessionId,
    payload,
  });
  const res = await dispatchStockTakeCommand(pharmacyId, cmd, lang);
  revalidateStockTakeKeys(pharmacyId);
  return res;
}

export async function cancelStockTakeSession(
  pharmacyId: string,
  sessionId: string,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalStockTakeCommand({
    eventId: newStockTakeEventId(),
    action: "CANCEL_STOCK_TAKE_SESSION",
    targetId: sessionId,
    payload: {},
  });
  const res = await dispatchStockTakeCommand(pharmacyId, cmd, lang);
  revalidateStockTakeKeys(pharmacyId);
  return res;
}
