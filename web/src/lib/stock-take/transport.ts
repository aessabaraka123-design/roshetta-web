/**
 * web/src/lib/stock-take/transport.ts
 * Transactional Stock Take Command Transport + Conflict Preservation + Local Draft Persistence.
 */

import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import { translateErrorMessage } from "@/lib/errorTranslations";

export interface StockTakeConflictItem {
  id: string;
  name?: string;
  barcode?: string;
  expectedQty: number;
  currentQty: number;
  deltaDuringCount: number;
}

export class StockTakeTransportError extends Error {
  code?: string;
  status?: number;
  conflicts?: StockTakeConflictItem[];

  constructor(message: string, code?: string, status?: number, conflicts?: StockTakeConflictItem[]) {
    super(message);
    this.name = "StockTakeTransportError";
    this.code = code;
    this.status = status;
    this.conflicts = conflicts;
  }
}

export interface StockTakeCommand {
  eventId: string;
  action: string;
  targetId: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

export interface StockTakeDispatchResult<T = any> {
  success: boolean;
  replayed?: boolean;
  data: T;
  command: StockTakeCommand;
}

export function newStockTakeEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `st_evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveStockTakeEndpoint(pharmacyId: string, command: StockTakeCommand): { url: string; method: "POST" | "PATCH" | "PUT" | "DELETE" } {
  const base = `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(pharmacyId)}`;
  const target = command.targetId ? encodeURIComponent(String(command.targetId)) : "";

  switch (command.action) {
    case "CREATE_STOCK_TAKE_SESSION":
      return { url: `${base}/stock-take/sessions`, method: "POST" };
    case "UPDATE_STOCK_TAKE_SESSION":
      return { url: `${base}/stock-take/sessions/${target}`, method: "PUT" };
    case "POST_STOCK_TAKE_SESSION":
      return { url: `${base}/stock-take/sessions/${target}/post`, method: "POST" };
    case "CANCEL_STOCK_TAKE_SESSION":
      return { url: `${base}/stock-take/sessions/${target}`, method: "DELETE" };
    case "STOCK_TAKE":
      return { url: `${base}/stock-take`, method: "POST" };
    default:
      throw new Error(`Unsupported stock take command: ${command.action}`);
  }
}

export async function dispatchStockTakeCommand<T = any>(
  pharmacyId: string,
  command: StockTakeCommand,
  lang: "ar" | "en" = "ar"
): Promise<StockTakeDispatchResult<T>> {
  const { url, method } = resolveStockTakeEndpoint(pharmacyId, command);
  const headers = getWebAuthHeaders({
    "Content-Type": "application/json",
    "Idempotency-Key": command.eventId,
  });

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify({ ...command.payload, eventId: command.eventId }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.success === false) {
    const code = data?.code ? String(data.code) : undefined;
    const rawMsg = data?.error || data?.message || code || `HTTP_${res.status}`;
    const localized = translateErrorMessage(code && code !== rawMsg ? code : rawMsg, lang);
    const conflicts: StockTakeConflictItem[] | undefined = Array.isArray(data?.conflicts)
      ? data.conflicts
      : Array.isArray(data?.details?.conflicts)
        ? data.details.conflicts
        : undefined;
    throw new StockTakeTransportError(localized, code, res.status, conflicts);
  }

  return {
    success: true,
    replayed: Boolean(data?.replayed),
    data,
    command,
  };
}

export function saveStockTakeLocalSnapshot(pharmacyId: string, key: string, payload: unknown) {
  if (typeof window === "undefined" || !pharmacyId) return;
  try {
    localStorage.setItem(`roshetta_st_${pharmacyId}_${key}`, JSON.stringify(payload));
  } catch {}
}

export function readStockTakeLocalSnapshot<T>(pharmacyId: string, key: string, fallback: T): T {
  if (typeof window === "undefined" || !pharmacyId) return fallback;
  try {
    const raw = localStorage.getItem(`roshetta_st_${pharmacyId}_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function removeStockTakeLocalSnapshot(pharmacyId: string, key: string) {
  if (typeof window === "undefined" || !pharmacyId) return;
  try {
    localStorage.removeItem(`roshetta_st_${pharmacyId}_${key}`);
  } catch {}
}
