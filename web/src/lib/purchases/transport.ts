/**
 * web/src/lib/purchases/transport.ts
 * Outbox-ready Command Transport Adapter for Purchases & Suppliers on Web.
 * All UI writes pass through dispatchCommand() with a stable eventId & client-generated IDs,
 * allowing an IndexedDB Outbox driver to be plugged in later without rewriting any React views.
 */

import { API_BASE_URL } from "@/lib/config";
import { translateErrorMessage } from "@/lib/errorTranslations";
import { CanonicalCommand } from "@/lib/purchases/domain";

export interface DispatchResult<T = any> {
  success: boolean;
  queuedOffline?: boolean;
  replayed?: boolean;
  data: T;
  command: CanonicalCommand;
}

export interface PurchaseTransportDriver {
  dispatch<T = any>(pharmacyId: string, command: CanonicalCommand, lang?: "ar" | "en"): Promise<DispatchResult<T>>;
  getPendingCommands(pharmacyId: string): CanonicalCommand[];
}

function resolveHttpEndpoint(pharmacyId: string, command: CanonicalCommand): { url: string; method: "POST" | "PUT" | "DELETE" } {
  const pid = encodeURIComponent(pharmacyId);
  const target = command.targetId ? encodeURIComponent(command.targetId) : "";
  const base = `${API_BASE_URL}/api/pharmacies/${pid}`;

  switch (command.action) {
    case "CREATE_PURCHASE":
      return { url: `${base}/purchase-invoices`, method: "POST" };
    case "UPDATE_OR_APPROVE_PURCHASE":
      return { url: `${base}/purchase-invoices/${target}`, method: "PUT" };
    case "PAY_PURCHASE_INVOICE":
      return { url: `${base}/purchase-invoices/${target}/pay`, method: "PUT" };
    case "DELETE_PURCHASE":
      return { url: `${base}/purchase-invoices/${target}`, method: "DELETE" };
    case "ADD_SUPPLIER":
      return { url: `${base}/suppliers`, method: "POST" };
    case "UPDATE_SUPPLIER":
      return { url: `${base}/suppliers/${target}`, method: "PUT" };
    case "DELETE_SUPPLIER":
      return { url: `${base}/suppliers/${target}`, method: "DELETE" };
    case "PAY_SUPPLIER":
      return { url: `${base}/suppliers/${target}/payment`, method: "POST" };
    case "ADD_INVENTORY":
      return { url: `${base}/inventory`, method: "POST" };
    default:
      throw new Error(`Unsupported command action: ${command.action}`);
  }
}

export class TransportError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "TransportError";
    this.code = code;
    this.status = status;
  }
}

const OnlineCommandDriver: PurchaseTransportDriver = {
  async dispatch<T = any>(pharmacyId: string, command: CanonicalCommand, lang: "ar" | "en" = "ar"): Promise<DispatchResult<T>> {
    const { url, method } = resolveHttpEndpoint(pharmacyId, command);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": command.eventId,
    };

    const bodyPayload = method === "DELETE" ? { eventId: command.eventId } : { ...command.payload, eventId: command.eventId };

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
      throw new TransportError(localized, code, res.status);
    }

    return {
      success: true,
      replayed: Boolean(data?.replayed),
      data,
      command,
    };
  },

  getPendingCommands(): CanonicalCommand[] {
    return [];
  },
};

let activeDriver: PurchaseTransportDriver = OnlineCommandDriver;

export function getPendingPurchaseCommands(pharmacyId: string): CanonicalCommand[] {
  return pharmacyId ? activeDriver.getPendingCommands(pharmacyId) : [];
}

export function dispatchPurchaseCommand<T = any>(
  pharmacyId: string,
  command: CanonicalCommand,
  lang: "ar" | "en" = "ar"
): Promise<DispatchResult<T>> {
  return activeDriver.dispatch<T>(pharmacyId, command, lang);
}
