/**
 * web/src/lib/inventory/transport.ts
 * Command Transport Adapter & localStorage Snapshot Cache for Web Inventory.
 */

import { API_BASE_URL } from "@/lib/config";
import { translateErrorMessage } from "@/lib/errorTranslations";
import { getWebAuthHeaders } from "@/lib/customers/transport";

export interface InventoryCommand {
  eventId: string;
  action: string;
  targetId: string | null;
  payload: Record<string, any>;
  createdAt: string;
}

export interface InventoryDispatchResult<T = any> {
  success: boolean;
  replayed?: boolean;
  data: T;
  command: InventoryCommand;
}

export class InventoryTransportError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "InventoryTransportError";
    this.code = code;
    this.status = status;
  }
}

export function newInventoryEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `EVT-INV-${crypto.randomUUID()}`;
  }
  return `EVT-INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveHttpEndpoint(pharmacyId: string, command: InventoryCommand): { url: string; method: "POST" | "PUT" | "DELETE" } {
  const pid = encodeURIComponent(pharmacyId);
  const target = command.targetId ? encodeURIComponent(command.targetId) : "";
  const base = `${API_BASE_URL}/api/pharmacies/${pid}`;

  switch (command.action) {
    case "ADD_INVENTORY":
      return { url: `${base}/inventory`, method: "POST" };
    case "UPDATE_INVENTORY":
      return { url: `${base}/inventory/${target}`, method: "PUT" };
    case "DELETE_INVENTORY":
      return { url: `${base}/inventory/${target}`, method: "DELETE" };
    case "RESTORE_INVENTORY":
      return { url: `${base}/inventory/${target}/restore`, method: "POST" };
    case "SPLIT_OR_ADD_BATCH":
      return { url: `${base}/inventory/${target}/batches`, method: "POST" };
    case "DELETE_BATCH":
      return { url: `${base}/batches/${target}`, method: "DELETE" };
    case "STOCK_TAKE":
      return { url: `${base}/stock-take`, method: "POST" };
    case "RECORD_STOCK_ADJUSTMENT":
      return { url: `${base}/stock-adjustments`, method: "POST" };
    default:
      throw new Error(`Unsupported inventory command: ${command.action}`);
  }
}

export async function dispatchInventoryCommand<T = any>(
  pharmacyId: string,
  command: InventoryCommand,
  lang: "ar" | "en" = "ar"
): Promise<InventoryDispatchResult<T>> {
  const { url, method } = resolveHttpEndpoint(pharmacyId, command);
  const headers = getWebAuthHeaders({
    "Content-Type": "application/json",
    "Idempotency-Key": command.eventId,
  });

  const bodyPayload = method === "DELETE" ? { ...command.payload, eventId: command.eventId } : { ...command.payload, eventId: command.eventId };

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(bodyPayload),
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
    throw new InventoryTransportError(localized, code, res.status);
  }

  return {
    success: true,
    replayed: Boolean(data?.replayed),
    data,
    command,
  };
}

export function saveInventorySnapshot(pharmacyId: string, key: string, payload: unknown) {
  if (typeof window === "undefined" || !pharmacyId) return;
  try {
    localStorage.setItem(`roshetta_inv_${pharmacyId}_${key}`, JSON.stringify(payload));
  } catch {}
}

export function readInventorySnapshot<T>(pharmacyId: string, key: string, fallback: T): T {
  if (typeof window === "undefined" || !pharmacyId) return fallback;
  try {
    const raw = localStorage.getItem(`roshetta_inv_${pharmacyId}_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
