"use client";

import React from "react";
import { isDraftStatus, isCompletedStatus, round2 } from "@/lib/purchases/domain";

interface Props {
  purchases: any[];
  lang: "ar" | "en";
}

export default function PurchaseStatsHeader({ purchases, lang }: Props) {
  const isEn = lang === "en";
  const completed = purchases.filter((p) => isCompletedStatus(p.status));
  const drafts = purchases.filter((p) => isDraftStatus(p.status));

  const totalCompletedCost = round2(completed.reduce((s, p) => s + (Number(p.total_cost ?? p.total) || 0), 0));
  const totalPaid = round2(completed.reduce((s, p) => s + (Number(p.paid_amount ?? p.paid) || 0), 0));
  const totalRemaining = round2(completed.reduce((s, p) => s + (Number(p.remaining) || 0), 0));

  const cards = [
    {
      label: isEn ? "Completed Invoices" : "إجمالي المشتريات المعتمدة",
      value: `₪${totalCompletedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? `${completed.length} invoices` : `${completed.length} فاتورة`,
      tone: "bg-primary-pale text-primary border-primary/20",
    },
    {
      label: isEn ? "Outstanding Debt" : "ذمم الموردين المتبقية",
      value: `₪${totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? `${completed.filter((p) => Number(p.remaining) > 0).length} open` : `${completed.filter((p) => Number(p.remaining) > 0).length} فاتورة آجلة`,
      tone: totalRemaining > 0 ? "bg-coral-pale text-coral border-coral/20" : "bg-teal/10 text-teal border-teal/20",
    },
    {
      label: isEn ? "Total Paid" : "إجمالي المدفوع للموردين",
      value: `₪${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? "Cash & FIFO & Credit" : "دفع مباشر + سندات",
      tone: "bg-teal/10 text-teal border-teal/20",
    },
    {
      label: isEn ? "Pending Receipt" : "طلبيات بانتظار الاستلام",
      value: String(drafts.length),
      sub: isEn ? "Draft purchase orders" : "مسودات لم تدخل المخزون",
      tone: "bg-amber-pale text-amber border-amber/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((c, idx) => (
        <div key={idx} className={`rounded-2xl p-4 border shadow-sm bg-card flex flex-col justify-between ${c.tone.split(" ").pop()}`}>
          <div className="text-xs font-bold text-ink-soft">{c.label}</div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1.5 text-ink">{c.value}</div>
          <div className="text-[11px] font-bold text-ink-soft mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
