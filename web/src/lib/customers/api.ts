/**
 * web/src/lib/customers/api.ts
 * Unified Web API hooks, snapshot caching, and command builders for Customers & Vouchers.
 */

import useSWR from "swr";
import { API_BASE_URL } from "@/lib/config";
import {
  computeCustomerStatementKpis,
  extractPaymentsMap,
  formatPaymentMethod,
  generateClientId,
  getSaleCreditAmount,
  isCreditSaleRecord,
  isPaidSaleRecord,
  normalizeSalePaymentMethod,
  normalizeVoucherPaymentMethod,
  round2,
  safeJson,
  type CanonicalCustomerCommand,
  type CustomerRecord,
  type CustomerStatementResult,
  type CustomerTransactionRecord,
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
  fallbackLegacy?: boolean;
};

async function buildLegacyCustomerStatement(
  pharmacyId: string,
  customerId: string,
  lang: "ar" | "en"
): Promise<CustomerStatementResponse> {
  const pid = encodeURIComponent(pharmacyId);
  const cid = encodeURIComponent(customerId);
  const base = `${API_BASE_URL}/api/pharmacies/${pid}`;

  const [custRes, salesRes, paymentsRes] = await Promise.all([
    authJsonFetcher(`${base}/customers`),
    authJsonFetcher(`${base}/customers/${cid}/sales`).catch(() => ({ sales: [] })),
    authJsonFetcher(`${base}/customers/${cid}/debt-payments`).catch(() => ({ payments: [] })),
  ]);

  const rawCustomers: any[] = Array.isArray(custRes?.customers) ? custRes.customers : [];
  const found = rawCustomers.find((c) => String(c.id) === String(customerId));
  if (!found) {
    throw Object.assign(
      new Error(lang === "en" ? "Customer not found" : "العميل غير موجود"),
      { status: 404, code: "CUSTOMER_NOT_FOUND" }
    );
  }

  const { family: _dropFamily, ...cleanCust } = found;
  const rawSales: any[] = Array.isArray(salesRes?.sales) ? salesRes.sales : [];
  const custSales = rawSales.map((s) => ({
    ...s,
    items: safeJson(s.items, []),
    customer: safeJson(s.customer, null),
    payments: extractPaymentsMap(s),
    paymentMethod: normalizeSalePaymentMethod(s.paymentMethod || s.payment_method),
  }));

  const paidSales = custSales.filter((s) => isPaidSaleRecord(s));
  const creditSales = custSales.filter((s) => isCreditSaleRecord(s));

  const rawPayments: any[] = Array.isArray(paymentsRes?.payments) ? paymentsRes.payments : [];
  const normalizedPayments = rawPayments.map((p) => {
    const pm =
      String(p.id || "").startsWith("RET-CR-") || p.paymentMethod === "credit_adjustment"
        ? "credit_adjustment"
        : normalizeSalePaymentMethod(p.paymentMethod || p.payment_method || "cash");
    return {
      ...p,
      amount: round2(p.amount ?? p.total ?? 0),
      total: round2(p.total ?? p.amount ?? 0),
      paymentMethod: pm,
    };
  });

  const creditTx: CustomerTransactionRecord[] = creditSales
    .map((s) => {
      const creditAmt = getSaleCreditAmount(s);
      const pm = normalizeSalePaymentMethod(s.paymentMethod || "credit");
      const pmInfo = formatPaymentMethod(pm, lang);
      return {
        id: `LEGACY-SALE-${s.id}`,
        customer_id: String(customerId),
        type: "credit_sale" as const,
        voucher_number: "",
        reference_id: String(s.id),
        amount: creditAmt > 0 ? creditAmt : round2(s.total),
        balance_before: 0,
        balance_after: 0,
        payment_method: pm,
        paymentMethodLabel: pmInfo.label,
        electronic_ref: String(s.electronicRef || ""),
        branch_id: s.branch_id || null,
        branch_name: s.branchName || "",
        cashier_name: s.cashierName || "",
        notes: lang === "en" ? `Credit Sale #${s.id}` : `فاتورة مبيعات آجل #${s.id}`,
        date: s.date || "",
      };
    })
    .filter((t) => t.amount > 0);

  const payTx: CustomerTransactionRecord[] = normalizedPayments.map((p) => {
    const isCreditAdj = String(p.id || "").startsWith("RET-CR-") || p.paymentMethod === "credit_adjustment";
    const pmInfo = formatPaymentMethod(p.paymentMethod || "cash", lang);
    return {
      id: `LEGACY-PAY-${p.id}`,
      customer_id: String(customerId),
      type: isCreditAdj ? "credit_refund" : "payment",
      voucher_number: String(p.voucher_number || ""),
      reference_id: String(p.id),
      amount: round2(p.amount),
      balance_before: 0,
      balance_after: 0,
      payment_method: p.paymentMethod || "cash",
      paymentMethodLabel: pmInfo.label,
      electronic_ref: String(p.electronicRef || ""),
      branch_id: p.branch_id || null,
      branch_name: p.branchName || "",
      cashier_name: p.cashierName || "",
      notes:
        p.notes ||
        (isCreditAdj
          ? lang === "en"
            ? `Refund to Store Credit #${p.id}`
            : `إيداع مرتجع لرصيد العميل #${p.id}`
          : lang === "en"
            ? "Payment Voucher"
            : "سند قبض وسداد دين"),
      date: p.date || "",
    };
  });

  const combinedTx = [...creditTx, ...payTx].sort(
    (a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id))
  );
  let runningBalance = round2(Number(cleanCust.debt) || 0);
  for (const tx of combinedTx) {
    const delta = tx.type === "credit_sale" || tx.type === "manual_debit" ? tx.amount : -tx.amount;
    tx.balance_after = runningBalance;
    tx.balance_before = round2(runningBalance - delta);
    runningBalance = tx.balance_before;
  }

  const kpis = computeCustomerStatementKpis(combinedTx, custSales, cleanCust);
  return {
    success: true,
    fallbackLegacy: true,
    customer: cleanCust as CustomerRecord,
    kpis,
    transactions: combinedTx,
    sales: custSales,
    paidSales,
    creditSales,
    payments: normalizedPayments,
  };
}

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
    async (reqUrl: string) => {
      try {
        return await authJsonFetcher(reqUrl);
      } catch (err: any) {
        if (
          pharmacyId &&
          customerId &&
          (err?.status === 404 || err?.status === 405 || err?.status === 501) &&
          err?.code !== "CUSTOMER_NOT_FOUND"
        ) {
          return await buildLegacyCustomerStatement(pharmacyId, customerId, lang);
        }
        throw err;
      }
    },
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
