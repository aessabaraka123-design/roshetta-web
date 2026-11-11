/**
 * web/src/lib/customers/api.ts
 * Unified Web API hooks, snapshot caching, and command builders for Customers & Vouchers.
 */

import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import {
  generateClientId,
  normalizeVoucherPaymentMethod,
  round2,
  type CanonicalCustomerCommand,
  type CustomerRecord,
  type CustomerStatementResult,
} from "@/lib/customers/domain";
import {
  dispatchCustomerCommand,
  getWebAuthHeaders,
  readSnapshot,
  writeSnapshot,
} from "@/lib/customers/transport";

export function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return generateClientId("EVT");
}

export async function authJsonFetcher(url: string) {
  const res = await fetch(url, { headers: getWebAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw Object.assign(new Error(data?.error || data?.code || `HTTP_${res.status}`), {
      status: res.status,
      code: data?.code,
    });
  }
  return data;
}

export function useCustomersList(pharmacyId?: string, branchId: string = "all") {
  const qs = branchId && branchId !== "all" ? `?branch_id=${encodeURIComponent(branchId)}` : "";
  const url = pharmacyId ? `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/customers${qs}` : null;
  const cacheKey = pharmacyId ? `roshetta_customers_${pharmacyId}_${branchId || "all"}` : "";

  const swr = useSWR(url, authJsonFetcher, {
    onSuccess: (data) => {
      if (cacheKey && Array.isArray(data?.customers)) {
        writeSnapshot(cacheKey, data.customers);
      }
    },
  });

  const cached = cacheKey ? readSnapshot<CustomerRecord[]>(cacheKey, []) : [];
  const customers: CustomerRecord[] = Array.isArray(swr.data?.customers) ? swr.data.customers : cached;

  return {
    ...swr,
    customers,
  };
}

export type CustomerStatementResponse = CustomerStatementResult & {
  success?: boolean;
};

export function useCustomerStatement(
  pharmacyId?: string,
  customerId?: string | null,
  lang: "ar" | "en" = "ar"
) {
  const url =
    pharmacyId && customerId
      ? `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/customers/${encodeURIComponent(customerId)}/statement?lang=${lang}`
      : null;
  const cacheKey = pharmacyId && customerId ? `roshetta_cust_stmt_${pharmacyId}_${customerId}` : "";

  const swr = useSWR<CustomerStatementResponse>(
    url,
    authJsonFetcher,
    {
      onSuccess: (data) => {
        if (cacheKey && data?.customer) {
          writeSnapshot(cacheKey, data);
        }
      },
    }
  );

  const cached = cacheKey ? readSnapshot<CustomerStatementResponse | null>(cacheKey, null) : null;
  const statement = swr.data?.customer ? swr.data : cached;

  return {
    ...swr,
    statement,
  };
}

export interface AddCustomerInput {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  branch_id?: string | null;
  openingBalance?: number;
  openingType?: "debit" | "credit";
  cashierName?: string;
}

export async function createCustomer(
  pharmacyId: string,
  input: AddCustomerInput,
  lang: "ar" | "en" = "ar"
) {
  const custId = input.id || generateClientId("CUST");
  const opening = round2(Math.max(0, Number(input.openingBalance) || 0));
  const command: CanonicalCustomerCommand = {
    eventId: newEventId(),
    action: "ADD_PATIENT",
    targetId: custId,
    createdAt: new Date().toISOString(),
    payload: {
      id: custId,
      name: input.name.trim(),
      phone: (input.phone || "").trim(),
      address: (input.address || "").trim(),
      notes: (input.notes || "").trim(),
      branch_id: input.branch_id === undefined ? null : input.branch_id,
      ...(opening > 0
        ? {
            openingBalance: opening,
            openingType: input.openingType === "credit" ? "credit" : "debit",
          }
        : {}),
      ...(input.cashierName ? { cashierName: input.cashierName } : {}),
    },
  };
  return dispatchCustomerCommand(pharmacyId, command, lang);
}

export async function updateCustomer(
  pharmacyId: string,
  customerId: string,
  patch: Partial<Pick<AddCustomerInput, "name" | "phone" | "address" | "notes" | "branch_id">>,
  lang: "ar" | "en" = "ar"
) {
  const command: CanonicalCustomerCommand = {
    eventId: newEventId(),
    action: "UPDATE_PATIENT",
    targetId: customerId,
    createdAt: new Date().toISOString(),
    payload: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
      ...(patch.address !== undefined ? { address: patch.address.trim() } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() } : {}),
      ...(patch.branch_id !== undefined ? { branch_id: patch.branch_id } : {}),
    },
  };
  return dispatchCustomerCommand(pharmacyId, command, lang);
}

export async function deleteCustomer(
  pharmacyId: string,
  customerId: string,
  lang: "ar" | "en" = "ar"
) {
  const command: CanonicalCustomerCommand = {
    eventId: newEventId(),
    action: "DELETE_PATIENT",
    targetId: customerId,
    createdAt: new Date().toISOString(),
    payload: {},
  };
  return dispatchCustomerCommand(pharmacyId, command, lang);
}

export interface PayDebtInput {
  payment: number;
  paymentMethod?: string;
  electronicRef?: string;
  notes?: string;
  branch_id?: string | null;
  branchName?: string;
  cashierName?: string;
}

export async function payCustomerDebt(
  pharmacyId: string,
  customerId: string,
  input: PayDebtInput,
  lang: "ar" | "en" = "ar"
) {
  const paymentId = generateClientId("CPAY");
  const command: CanonicalCustomerCommand = {
    eventId: newEventId(),
    action: "PAY_DEBT",
    targetId: customerId,
    createdAt: new Date().toISOString(),
    payload: {
      id: paymentId,
      payment: round2(input.payment),
      paymentMethod: normalizeVoucherPaymentMethod(input.paymentMethod || "cash"),
      electronicRef: (input.electronicRef || "").trim(),
      notes: (input.notes || "").trim(),
      branch_id: input.branch_id ?? null,
      branchName: input.branchName || "",
      cashierName: input.cashierName || "",
      date: new Date().toISOString(),
    },
  };
  return dispatchCustomerCommand(pharmacyId, command, lang);
}

export interface AddDebtDebitInput {
  amount: number;
  notes?: string;
  branch_id?: string | null;
  branchName?: string;
  cashierName?: string;
}

export async function addCustomerDebtDebit(
  pharmacyId: string,
  customerId: string,
  input: AddDebtDebitInput,
  lang: "ar" | "en" = "ar"
) {
  const refId = generateClientId("CDEB");
  const command: CanonicalCustomerCommand = {
    eventId: newEventId(),
    action: "ADD_CUSTOMER_DEBT",
    targetId: customerId,
    createdAt: new Date().toISOString(),
    payload: {
      id: refId,
      amount: round2(input.amount),
      notes: (input.notes || "").trim(),
      branch_id: input.branch_id ?? null,
      branchName: input.branchName || "",
      cashierName: input.cashierName || "",
      date: new Date().toISOString(),
    },
  };
  return dispatchCustomerCommand(pharmacyId, command, lang);
}
