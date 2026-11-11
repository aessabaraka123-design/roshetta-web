/**
 * web/src/lib/customers/transport.ts
 * Outbox-ready Command Transport Adapter & localStorage snapshot store for Customers & Debt Vouchers.
 */

import { API_BASE_URL } from "@/lib/config";
import { translateErrorMessage } from "@/lib/errorTranslations";
import type { CanonicalCustomerCommand } from "@/lib/customers/domain";

export interface DispatchResult<T = any> {
  success: boolean;
  queuedOffline?: boolean;
  replayed?: boolean;
  data: T;
  command: CanonicalCustomerCommand;
}

export interface CustomerTransportDriver {
  dispatch<T = any>(pharmacyId: string, command: CanonicalCustomerCommand, lang?: "ar" | "en"): Promise<DispatchResult<T>>;
}

export class CustomerTransportError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "CustomerTransportError";
    this.code = code;
    this.status = status;
  }
}

export function getWebAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  if (typeof window !== "undefined") {
    try {
      let token = localStorage.getItem("roshetta_token");
      if (!token) {
        const persisted = localStorage.getItem("roshetta-web-storage");
        if (persisted) {
          token = JSON.parse(persisted)?.state?.token || null;
        }
      }
      if (token && !headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore storage access restrictions
    }
  }
  return headers;
}

function resolveHttpEndpoint(
  pharmacyId: string,
  command: CanonicalCustomerCommand
): { url: string; method: "POST" | "PUT" | "DELETE" } {
  const pid = encodeURIComponent(pharmacyId);
  const target = command.targetId ? encodeURIComponent(command.targetId) : "";
  const base = `${API_BASE_URL}/api/pharmacies/${pid}`;

  switch (command.action) {
    case "ADD_PATIENT":
      return { url: `${base}/customers`, method: "POST" };
    case "UPDATE_PATIENT":
      return { url: `${base}/customers/${target}`, method: "PUT" };
    case "DELETE_PATIENT":
      return { url: `${base}/customers/${target}`, method: "DELETE" };
    case "PAY_DEBT":
      return { url: `${base}/customers/${target}/debt`, method: "PUT" };
    case "ADD_CUSTOMER_DEBT":
      return { url: `${base}/customers/${target}/debt-debit`, method: "POST" };
    case "CHECKOUT":
      return { url: `${base}/sales`, method: "POST" };
    case "REFUND_FULL":
      return { url: `${base}/sales/${target}/refund`, method: "PUT" };
    case "REFUND_PARTIAL":
      return { url: `${base}/sales/${target}/refund_partial`, method: "PUT" };
    default:
      throw new Error(`Unsupported customer command action: ${command.action}`);
  }
}

const OnlineCustomerDriver: CustomerTransportDriver = {
  async dispatch<T = any>(
    pharmacyId: string,
    command: CanonicalCustomerCommand,
    lang: "ar" | "en" = "ar"
  ): Promise<DispatchResult<T>> {
    const { url, method } = resolveHttpEndpoint(pharmacyId, command);
    const headers = getWebAuthHeaders({
      "Content-Type": "application/json",
      "Idempotency-Key": command.eventId,
    });

    const bodyPayload =
      method === "DELETE"
        ? { eventId: command.eventId }
        : { ...command.payload, eventId: command.eventId };

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
      throw new CustomerTransportError(localized, code, res.status);
    }

    return {
      success: true,
      replayed: Boolean(data?.replayed),
      data,
      command,
    };
  },
};

const activeDriver: CustomerTransportDriver = OnlineCustomerDriver;

export function dispatchCustomerCommand<T = any>(
  pharmacyId: string,
  command: CanonicalCustomerCommand,
  lang: "ar" | "en" = "ar"
): Promise<DispatchResult<T>> {
  return activeDriver.dispatch<T>(pharmacyId, command, lang);
}

export function readSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSnapshot<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors cleanly
  }
}
