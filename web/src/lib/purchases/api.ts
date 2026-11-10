/**
 * web/src/lib/purchases/api.ts
 * SWR key management, local snapshot caching (offline-ready), and typed command actions
 * for Purchases & Suppliers on Web.
 */

import { mutate } from "swr";
import { API_BASE_URL } from "@/lib/config";
import {
  buildCanonicalCommand,
  generateClientId,
  normalizeInvoiceStatus,
  normalizePaymentMethod,
} from "@/lib/purchases/domain";
import { dispatchPurchaseCommand } from "@/lib/purchases/transport";

export function swrPurchaseKeys(pharmacyId?: string) {
  if (!pharmacyId) return null;
  const pid = encodeURIComponent(pharmacyId);
  return {
    purchases: `${API_BASE_URL}/api/pharmacies/${pid}/purchases`,
    suppliers: `${API_BASE_URL}/api/pharmacies/${pid}/suppliers`,
    branches: `${API_BASE_URL}/api/admin/pharmacies/${pid}/branches`,
    inventory: `${API_BASE_URL}/api/pharmacies/${pid}/inventory`,
    expenses: `${API_BASE_URL}/api/pharmacies/${pid}/expenses`,
    statement: (suppId: string) => `${API_BASE_URL}/api/pharmacies/${pid}/suppliers/${encodeURIComponent(suppId)}/statement`,
  };
}

export async function jsonFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function saveDomainSnapshot(pharmacyId: string | undefined, slice: string, data: any) {
  if (!pharmacyId || typeof window === "undefined") return;
  try {
    localStorage.setItem(`roshetta_snap_${pharmacyId}_${slice}`, JSON.stringify(data));
  } catch {}
}

export function loadDomainSnapshot<T = any>(pharmacyId: string | undefined, slice: string): T | undefined {
  if (!pharmacyId || typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`roshetta_snap_${pharmacyId}_${slice}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function revalidatePurchaseDomain(pharmacyId?: string, supplierId?: string) {
  if (!pharmacyId) return;
  const keys = swrPurchaseKeys(pharmacyId);
  if (!keys) return;
  const tasks: Promise<any>[] = [
    mutate(keys.purchases),
    mutate(keys.suppliers),
    mutate(keys.inventory),
    mutate(keys.expenses),
    mutate((k) => typeof k === "string" && (k.includes("/stats") || k.includes("/statement") || k.includes("/transactions"))),
  ];
  if (supplierId) {
    tasks.push(mutate(keys.statement(supplierId)));
  }
  await Promise.allSettled(tasks);
}

export async function createPurchaseAction(
  pharmacyId: string,
  input: {
    id?: string;
    supplier_id?: string;
    supplier_name?: string;
    invoice_number?: string;
    notes?: string;
    branch_id?: string;
    status?: string;
    paid_amount?: number;
    paymentMethod?: string;
    paymentRef?: string;
    batchAction?: string;
    date?: string;
    items: any[];
  },
  lang: "ar" | "en" = "ar"
) {
  const status = normalizeInvoiceStatus(input.status, "completed");
  const invId = input.id || generateClientId(status === "draft" ? "PO" : "PINV");
  const command = buildCanonicalCommand({
    action: "CREATE_PURCHASE",
    targetId: invId,
    payload: {
      ...input,
      id: invId,
      status,
      paymentMethod: normalizePaymentMethod(input.paymentMethod || "cash"),
    },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, input.supplier_id);
  return result;
}

export async function updateOrApprovePurchaseAction(
  pharmacyId: string,
  invoiceId: string,
  input: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const command = buildCanonicalCommand({
    action: "UPDATE_OR_APPROVE_PURCHASE",
    targetId: invoiceId,
    payload: {
      ...input,
      paymentMethod: input.paymentMethod ? normalizePaymentMethod(input.paymentMethod) : undefined,
    },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, input.supplier_id);
  return result;
}

export async function payPurchaseInvoiceAction(
  pharmacyId: string,
  invoiceId: string,
  input: {
    payment: number;
    paymentMethod: string;
    paymentRef?: string;
    branch_id?: string;
    supplier_id?: string;
    date?: string;
  },
  lang: "ar" | "en" = "ar"
) {
  const expId = generateClientId("EXP-SUPP");
  const command = buildCanonicalCommand({
    action: "PAY_PURCHASE_INVOICE",
    targetId: invoiceId,
    payload: {
      ...input,
      expId,
      paymentMethod: normalizePaymentMethod(input.paymentMethod || "cash"),
      date: input.date || new Date().toISOString(),
    },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, input.supplier_id);
  return result;
}

export async function deletePurchaseAction(pharmacyId: string, invoiceId: string, supplierId?: string, lang: "ar" | "en" = "ar") {
  const command = buildCanonicalCommand({
    action: "DELETE_PURCHASE",
    targetId: invoiceId,
    payload: {},
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, supplierId);
  return result;
}

export async function addSupplierAction(
  pharmacyId: string,
  input: { id?: string; name: string; phone?: string; email?: string; company?: string; notes?: string; branch_id?: string | null },
  lang: "ar" | "en" = "ar"
) {
  const suppId = input.id || generateClientId("SUP");
  const command = buildCanonicalCommand({
    action: "ADD_SUPPLIER",
    targetId: suppId,
    payload: { ...input, id: suppId },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, suppId);
  return result;
}

export async function updateSupplierAction(
  pharmacyId: string,
  supplierId: string,
  input: { name: string; phone?: string; email?: string; company?: string; notes?: string; branch_id?: string | null },
  lang: "ar" | "en" = "ar"
) {
  const command = buildCanonicalCommand({
    action: "UPDATE_SUPPLIER",
    targetId: supplierId,
    payload: input,
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, supplierId);
  return result;
}

export async function deleteSupplierAction(pharmacyId: string, supplierId: string, lang: "ar" | "en" = "ar") {
  const command = buildCanonicalCommand({
    action: "DELETE_SUPPLIER",
    targetId: supplierId,
    payload: {},
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId);
  return result;
}

export async function paySupplierAction(
  pharmacyId: string,
  supplierId: string,
  input: {
    amount: number;
    paymentMethod: string;
    paymentRef?: string;
    branch_id?: string;
    paidBy?: string;
    date?: string;
  },
  lang: "ar" | "en" = "ar"
) {
  const expId = generateClientId("EXP-SUPP");
  const command = buildCanonicalCommand({
    action: "PAY_SUPPLIER",
    targetId: supplierId,
    payload: {
      ...input,
      expId,
      paymentMethod: normalizePaymentMethod(input.paymentMethod || "cash"),
      date: input.date || new Date().toISOString(),
    },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId, supplierId);
  return result;
}

export async function quickAddInventoryItemAction(
  pharmacyId: string,
  input: Record<string, any>,
  lang: "ar" | "en" = "ar"
) {
  const itemId = input.id || generateClientId("INV");
  const command = buildCanonicalCommand({
    action: "ADD_INVENTORY",
    targetId: itemId,
    payload: { ...input, id: itemId },
  });
  const result = await dispatchPurchaseCommand(pharmacyId, command, lang);
  await revalidatePurchaseDomain(pharmacyId);
  return { ...result, itemId };
}
