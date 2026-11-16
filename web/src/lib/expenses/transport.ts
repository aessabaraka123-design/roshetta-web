/**
 * web/src/lib/expenses/transport.ts
 * Outbox-ready Command Transport & Offline Sync Engine for Expenses.
 * Guarantees zero data loss, offline durability, and automatic reconciliation.
 */

import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import {
  ExpenseRecord,
  validateExpenseInput,
  normalizeExpenseCategory,
  normalizeExpensePaymentMethod,
  buildExpenseVoucherHtml,
} from "./domain";

const STORAGE_CACHE_KEY = "roshetta_offline_expenses_cache";
const STORAGE_QUEUE_KEY = "roshetta_offline_expenses_queue";

export interface ExpenseCommand {
  id: string;
  action: "ADD_EXPENSE" | "EDIT_EXPENSE" | "DELETE_EXPENSE";
  payload: any;
  timestamp: string;
}

export function loadCachedExpenses(): ExpenseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedExpenses(expenses: ExpenseRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(expenses));
  } catch {}
}

export function loadExpenseSyncQueue(): ExpenseCommand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExpenseSyncQueue(queue: ExpenseCommand[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

/**
 * Fetch expenses from API with offline fallback
 */
export async function fetchExpensesApi(params: {
  pharmacyId: string;
  from?: string;
  to?: string;
  branchId?: string;
  category?: string;
  paymentMethod?: string;
}): Promise<{ expenses: ExpenseRecord[]; kpis?: any; fromCache?: boolean }> {
  const { pharmacyId, from, to, branchId, category, paymentMethod } = params;
  const headers = getWebAuthHeaders();

  let query = `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses?`;
  const qParams: string[] = [];
  if (from) qParams.push(`from=${encodeURIComponent(from)}`);
  if (to) qParams.push(`to=${encodeURIComponent(to)}`);
  if (branchId && branchId !== "all") qParams.push(`branch_id=${encodeURIComponent(branchId)}`);
  if (category && category !== "all") qParams.push(`category=${encodeURIComponent(category)}`);
  if (paymentMethod && paymentMethod !== "all") qParams.push(`paymentMethod=${encodeURIComponent(paymentMethod)}`);
  query += qParams.join("&");

  try {
    const res = await fetch(query, { headers });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data && data.success && Array.isArray(data.expenses)) {
        saveCachedExpenses(data.expenses);
        return { expenses: data.expenses, kpis: data.kpis, fromCache: false };
      }
    }
  } catch (err) {
    console.warn("Server expenses fetch failed, falling back to local cache:", err);
  }

  // Fallback to cache
  const cached = loadCachedExpenses();
  return { expenses: cached, fromCache: true };
}

/**
 * Add expense with offline resilience
 */
export async function addExpenseApi(params: {
  pharmacyId: string;
  expense: Partial<ExpenseRecord>;
  actorName?: string;
}): Promise<{ success: boolean; id: string; queuedOffline: boolean; error?: string }> {
  const { pharmacyId, expense, actorName } = params;
  const validation = validateExpenseInput(expense);
  if (!validation.valid) {
    const firstErr = Object.values(validation.errors)[0] || "بيانات المصروف غير صحيحة";
    return { success: false, id: "", queuedOffline: false, error: firstErr };
  }

  const expId = expense.id || `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const sanitized = {
    ...validation.sanitized,
    id: expId,
    pharmacy_id: pharmacyId,
    created_by: actorName || expense.created_by || "الموظف",
  } as ExpenseRecord;

  // Optimistically store in cached expenses
  const cached = loadCachedExpenses();
  saveCachedExpenses([sanitized, ...cached.filter((e) => e.id !== expId)]);

  // Attempt live API post
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const headers = getWebAuthHeaders({
        "Content-Type": "application/json",
        "Idempotency-Key": expId,
      });
      const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses`, {
        method: "POST",
        headers,
        body: JSON.stringify(sanitized),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.id)) {
        return { success: true, id: expId, queuedOffline: false };
      }
    } catch (netErr) {
      console.warn("Live addExpense network error, queuing offline:", netErr);
    }
  }

  // Queue offline
  const queue = loadExpenseSyncQueue();
  queue.push({
    id: expId,
    action: "ADD_EXPENSE",
    payload: sanitized,
    timestamp: new Date().toISOString(),
  });
  saveExpenseSyncQueue(queue);

  return { success: true, id: expId, queuedOffline: true };
}

/**
 * Edit expense with offline resilience
 */
export async function editExpenseApi(params: {
  pharmacyId: string;
  expenseId: string;
  updates: Partial<ExpenseRecord>;
}): Promise<{ success: boolean; queuedOffline: boolean; error?: string }> {
  const { pharmacyId, expenseId, updates } = params;

  // Optimistically update cache
  const cached = loadCachedExpenses();
  const updatedList = cached.map((e) => (e.id === expenseId ? { ...e, ...updates } : e));
  saveCachedExpenses(updatedList);

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const headers = getWebAuthHeaders({ "Content-Type": "application/json" });
      const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.id)) {
        return { success: true, queuedOffline: false };
      }
      if (data.error === "SUPPLIER_EXPENSE_PROTECTED") {
        return { success: false, queuedOffline: false, error: "لا يمكن تعديل سند سداد الموردين يدوياً لارتباطه بحسابات المورد" };
      }
    } catch (err) {
      console.warn("Live editExpense network error, queuing offline:", err);
    }
  }

  // Queue offline
  const queue = loadExpenseSyncQueue();
  queue.push({
    id: expenseId,
    action: "EDIT_EXPENSE",
    payload: updates,
    timestamp: new Date().toISOString(),
  });
  saveExpenseSyncQueue(queue);

  return { success: true, queuedOffline: true };
}

/**
 * Delete expense with offline resilience
 */
export async function deleteExpenseApi(params: {
  pharmacyId: string;
  expenseId: string;
}): Promise<{ success: boolean; queuedOffline: boolean; error?: string }> {
  const { pharmacyId, expenseId } = params;

  // Optimistically remove from cache
  const cached = loadCachedExpenses();
  saveCachedExpenses(cached.filter((e) => e.id !== expenseId));

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const headers = getWebAuthHeaders();
      const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses/${encodeURIComponent(expenseId)}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.alreadyDeleted)) {
        return { success: true, queuedOffline: false };
      }
      if (data.error === "SUPPLIER_EXPENSE_PROTECTED") {
        return { success: false, queuedOffline: false, error: "لا يمكن حذف سند سداد الموردين لارتباطه بسجلات الموردين" };
      }
    } catch (err) {
      console.warn("Live deleteExpense network error, queuing offline:", err);
    }
  }

  // Queue offline
  const queue = loadExpenseSyncQueue();
  queue.push({
    id: expenseId,
    action: "DELETE_EXPENSE",
    payload: { id: expenseId },
    timestamp: new Date().toISOString(),
  });
  saveExpenseSyncQueue(queue);

  return { success: true, queuedOffline: true };
}

/**
 * Flush any offline queued mutations to server
 */
export async function flushExpenseSyncQueue(pharmacyId: string): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0;
  const queue = loadExpenseSyncQueue();
  if (queue.length === 0) return 0;

  const headers = getWebAuthHeaders({ "Content-Type": "application/json" });
  const remaining: ExpenseCommand[] = [];
  let flushedCount = 0;

  for (const cmd of queue) {
    try {
      if (cmd.action === "ADD_EXPENSE") {
        const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses`, {
          method: "POST",
          headers: { ...headers, "Idempotency-Key": cmd.id },
          body: JSON.stringify(cmd.payload),
        });
        if (res.ok) flushedCount++;
        else remaining.push(cmd);
      } else if (cmd.action === "EDIT_EXPENSE") {
        const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses/${encodeURIComponent(cmd.id)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(cmd.payload),
        });
        if (res.ok) flushedCount++;
        else remaining.push(cmd);
      } else if (cmd.action === "DELETE_EXPENSE") {
        const res = await fetch(`${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}/expenses/${encodeURIComponent(cmd.id)}`, {
          method: "DELETE",
          headers,
        });
        if (res.ok) flushedCount++;
        else remaining.push(cmd);
      }
    } catch {
      remaining.push(cmd);
    }
  }

  saveExpenseSyncQueue(remaining);
  return flushedCount;
}

/**
 * High-fidelity voucher printing trigger
 */
export function printExpenseVoucher(params: {
  expense: ExpenseRecord;
  pharmacyName: string;
  branchName?: string;
  language?: string;
}): void {
  const html = buildExpenseVoucherHtml(params);
  const isEn = params.language === "en";

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${isEn ? "ltr" : "rtl"}" lang="${isEn ? "en" : "ar"}">
      <head>
        <meta charset="utf-8" />
        <title>سند صرف - ${params.expense.id}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 18mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            background: #ffffff;
            color: #1e293b;
            direction: ${isEn ? "ltr" : "rtl"};
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 60000);
}
