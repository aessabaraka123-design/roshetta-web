/**
 * web/src/lib/inventory/api.ts
 * Unified SWR Data Hooks & Transactional Command Wrappers for Web Inventory.
 */

import useSWR, { mutate } from "swr";
import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import { buildCanonicalInventoryCommand, type BranchRecord, type InventoryItemRecord } from "@/lib/inventory/domain";
import {
  dispatchInventoryCommand,
  newInventoryEventId,
  readInventorySnapshot,
  saveInventorySnapshot,
} from "@/lib/inventory/transport";

async function invFetcher(url: string) {
  const res = await fetch(url, { headers: getWebAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.code || data?.error || `HTTP_${res.status}`);
  }
  return data;
}

export function revalidateInventoryKeys(pharmacyId: string) {
  if (!pharmacyId) return;
  mutate(
    (key) =>
      typeof key === "string" &&
      key.includes(`/api/pharmacies/${pharmacyId}`) &&
      (key.includes("/inventory") ||
        key.includes("/batches") ||
        key.includes("/stock-adjustments") ||
        key.includes("/stock-movements") ||
        key.includes("/controlled-drugs-log") ||
        key.includes("/dashboard")),
    undefined,
    { revalidate: true }
  );
}

export function useInventoryData(pharmacyId?: string, opts: { branchId?: string; includeArchived?: boolean } = {}) {
  const params = new URLSearchParams();
  if (opts.branchId && opts.branchId !== "all") params.set("branch_id", opts.branchId);
  if (opts.includeArchived) params.set("includeArchived", "1");
  const qs = params.toString();
  const key = pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/inventory${qs ? `?${qs}` : ""}` : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, invFetcher, {
    revalidateOnFocus: true,
    onSuccess: (res) => {
      if (pharmacyId && Array.isArray(res?.inventory) && !opts.includeArchived && (!opts.branchId || opts.branchId === "all")) {
        saveInventorySnapshot(pharmacyId, "list", res.inventory);
      }
    },
  });

  const cached = pharmacyId ? readInventorySnapshot<InventoryItemRecord[]>(pharmacyId, "list", []) : [];
  const inventory: InventoryItemRecord[] = Array.isArray(data?.inventory) ? data.inventory : cached;
  return { inventory, isLoading, error, mutate: boundMutate };
}

export function useBatchesData(pharmacyId?: string, opts: { drugId?: string; branchId?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.drugId) params.set("drug_id", opts.drugId);
  if (opts.branchId && opts.branchId !== "all") params.set("branch_id", opts.branchId);
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  const qs = params.toString();
  const key = pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/batches${qs ? `?${qs}` : ""}` : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, invFetcher, { revalidateOnFocus: true });
  return { batches: Array.isArray(data?.batches) ? data.batches : [], isLoading, error, mutate: boundMutate };
}

export function useStockAdjustmentsData(pharmacyId?: string) {
  const key = pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/stock-adjustments` : null;
  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, invFetcher, { revalidateOnFocus: true });
  return { adjustments: Array.isArray(data?.adjustments) ? data.adjustments : [], isLoading, error, mutate: boundMutate };
}

export function useStockMovementsData(pharmacyId?: string, drugId?: string | null) {
  const params = new URLSearchParams();
  if (drugId) params.set("drug_id", drugId);
  const qs = params.toString();
  const key = pharmacyId && drugId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/stock-movements${qs ? `?${qs}` : ""}` : null;
  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, invFetcher, { revalidateOnFocus: false });
  return { movements: Array.isArray(data?.movements) ? data.movements : [], isLoading, error, mutate: boundMutate };
}

export function useControlledDrugsLogData(pharmacyId?: string, enabled: boolean = true) {
  const key = pharmacyId && enabled ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/controlled-drugs-log` : null;
  const { data, error, isLoading, mutate: boundMutate } = useSWR(key, invFetcher, { revalidateOnFocus: true });
  return { log: Array.isArray(data?.log) ? data.log : [], isLoading, error, mutate: boundMutate };
}

export function usePharmacyBranches(pharmacyId?: string) {
  const key = pharmacyId ? `${API_BASE_URL}/api/pharmacies/${pharmacyId}/dashboard` : null;
  const { data, error, isLoading } = useSWR(key, invFetcher, { revalidateOnFocus: false });
  const branches: BranchRecord[] = Array.isArray(data?.branches) ? data.branches : [];
  return { branches, isLoading, error };
}

export async function addInventoryItem(pharmacyId: string, payload: Record<string, any>, lang: "ar" | "en" = "ar") {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "ADD_INVENTORY",
    targetId: payload.id || null,
    payload,
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function updateInventoryItem(
  pharmacyId: string,
  itemId: string,
  payload: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "UPDATE_INVENTORY",
    targetId: itemId,
    payload,
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function splitOrAddBatchItem(
  pharmacyId: string,
  itemId: string,
  payload: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "SPLIT_OR_ADD_BATCH",
    targetId: itemId,
    payload,
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function deleteBatchItem(pharmacyId: string, batchId: string, lang: "ar" | "en" = "ar") {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "DELETE_BATCH",
    targetId: batchId,
    payload: {},
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function submitStockTakeItems(
  pharmacyId: string,
  items: Array<{ id: string; actual: number; expectedQty: number }>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "STOCK_TAKE",
    targetId: null,
    payload: { items },
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function recordStockAdjustmentItem(
  pharmacyId: string,
  payload: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "RECORD_STOCK_ADJUSTMENT",
    targetId: payload.drug_id || payload.id,
    payload,
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function deleteOrArchiveInventoryItem(
  pharmacyId: string,
  itemId: string,
  archiveOnly: boolean = false,
  lang: "ar" | "en" = "ar"
) {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "DELETE_INVENTORY",
    targetId: itemId,
    payload: archiveOnly ? { archive: true } : {},
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}

export async function restoreInventoryItem(pharmacyId: string, itemId: string, lang: "ar" | "en" = "ar") {
  const cmd = buildCanonicalInventoryCommand({
    eventId: newInventoryEventId(),
    action: "RESTORE_INVENTORY",
    targetId: itemId,
    payload: {},
  });
  const res = await dispatchInventoryCommand(pharmacyId, cmd, lang);
  revalidateInventoryKeys(pharmacyId);
  return res;
}
