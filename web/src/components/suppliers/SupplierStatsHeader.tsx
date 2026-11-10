"use client";

import React from "react";
import { round2 } from "@/lib/purchases/domain";

interface Props {
  suppliers: any[];
  purchases: any[];
  lang: "ar" | "en";
}

export default function SupplierStatsHeader({ suppliers, purchases, lang }: Props) {
  const isEn = lang === "en";
  const totalPayables = round2(
    suppliers.reduce((s, sup) => s + (Number(sup.balance) > 0 ? Number(sup.balance) : 0), 0)
  );
  const totalCreditAdvance = round2(
    suppliers.reduce((s, sup) => s + (Number(sup.balance) < 0 ? Math.abs(Number(sup.balance)) : 0), 0)
  );
  const totalPaid = round2(
    purchases
      .filter((p) => p.status === "completed" || p.status === "received")
      .reduce((s, p) => s + (Number(p.paid_amount ?? p.paid) || 0), 0)
  );

  const cards = [
    {
      label: isEn ? "Total Suppliers" : "عدد الموردين",
      value: String(suppliers.length),
      sub: isEn ? "Active accounts" : "حسابات موردين مسجلة",
      tone: "border-primary/20",
    },
    {
      label: isEn ? "Debts to Suppliers" : "ديون للموردين",
      value: `₪${totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? "Payables due" : "مستحقات واجبة السداد",
      tone: totalPayables > 0 ? "border-coral/25" : "border-mint-line",
    },
    {
      label: isEn ? "Our Advance Credit" : "رصيدنا عند الموردين",
      value: `₪${totalCreditAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? "Surplus / Advance payments" : "فائض مدفوع مسبقاً",
      tone: "border-teal/25",
    },
    {
      label: isEn ? "Total Paid on Invoices" : "إجمالي المسدد للفواتير",
      value: `₪${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: isEn ? "Receipts & FIFO settlements" : "دفعات وسندات صرف",
      tone: "border-mint-line",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {cards.map((c, idx) => (
        <div key={idx} className={`bg-card border rounded-2xl p-4 shadow-sm ${c.tone}`}>
          <div className="text-xs font-bold text-ink-soft">{c.label}</div>
          <div className="text-xl sm:text-2xl font-black font-mono mt-1.5 text-ink">{c.value}</div>
          <div className="text-[11px] font-bold text-ink-soft mt-1">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
