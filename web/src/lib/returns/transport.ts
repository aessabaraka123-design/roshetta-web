/**
 * web/src/lib/returns/transport.ts
 * Enterprise Returns API Transport & Print Services.
 * Fully synchronized with server event pipeline & idempotency.
 */

import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import {
  ReturnItemRequest,
  RefundOptions,
  CreditNotePayload,
  buildCreditNoteHtml,
} from "./domain";

export interface FetchReturnsParams {
  pharmacyId: string;
  from?: string;
  to?: string;
  branch?: string;
  search?: string;
}

export async function fetchReturnsApi(params: FetchReturnsParams) {
  const { pharmacyId, from, to, branch, search } = params;
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (branch && branch !== "all") q.set("branch", branch);
  if (search) q.set("search", search);

  const res = await fetch(`${API_BASE_URL}/api/pharmacies/${pharmacyId}/returns?${q.toString()}`, {
    headers: getWebAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface RefundSalePayload {
  pharmacyId: string;
  saleId: string;
  isPartial?: boolean;
  itemsToRefund?: ReturnItemRequest[];
  refundOptions: RefundOptions;
  eventId?: string;
}

export async function refundSaleApi(payload: RefundSalePayload) {
  const { pharmacyId, saleId, isPartial, itemsToRefund, refundOptions, eventId } = payload;
  const endpoint = isPartial ? "refund_partial" : "refund";
  const finalEventId = eventId || `EVT-REF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const res = await fetch(`${API_BASE_URL}/api/pharmacies/${pharmacyId}/sales/${saleId}/${endpoint}`, {
    method: "PUT",
    headers: {
      ...getWebAuthHeaders(),
      "Content-Type": "application/json",
      "Idempotency-Key": finalEventId,
    },
    body: JSON.stringify({
      eventId: finalEventId,
      itemsToRefund,
      refundOptions,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.code || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCreditNoteApi(pharmacyId: string, returnId: string): Promise<CreditNotePayload> {
  const res = await fetch(`${API_BASE_URL}/api/pharmacies/${pharmacyId}/returns/${returnId}/credit-note`, {
    headers: getWebAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.creditNote;
}

export function printCreditNote(params: {
  creditNote: CreditNotePayload;
  pharmacyName: string;
  branchName?: string;
  language?: string;
}) {
  const htmlContent = buildCreditNoteHtml(params);
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

  const isEn = params.language === "en";
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="${isEn ? "ltr" : "rtl"}" lang="${isEn ? "en" : "ar"}">
      <head>
        <meta charset="utf-8" />
        <title>Credit_Note_${params.creditNote.creditNoteNumber}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
            background: #ffffff;
            color: #1e293b;
            direction: ${isEn ? "ltr" : "rtl"};
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
          }
          table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          function triggerPrint() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 150);
              });
            } else {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            }
          }
          if (document.readyState === 'complete') {
            triggerPrint();
          } else {
            window.onload = triggerPrint;
          }
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
