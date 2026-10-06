"use client";

import AppBar from "@/components/AppBar";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CustomerProfile() {
  const { id } = useParams();

  // Fake customer details for demo
  const customer = {
    id: id,
    name: "أحمد محمد",
    phone: "0599123456",
    address: "غزة - الرمال",
    debt: 150.0,
    history: [
      {
        id: "INV-1002",
        date: "2026-08-09",
        items: "بنادول أكسترا، فيتامين سي",
        total: 45.5,
        status: "paid",
      },
      {
        id: "INV-0988",
        date: "2026-07-28",
        items: "دواء ضغط 10ملجم",
        total: 150.0,
        status: "debt",
      },
    ],
  };

  return (
    <>
      <AppBar />
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/customers"
          className="p-2 rounded-lg bg-card border border-mint-line hover:bg-bg transition-all"
        >
          <svg
            className="w-5 h-5 text-ink-soft"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-primary">
            الملف الطبي للعميل
          </h1>
          <p className="text-[15px] text-ink-soft mt-1">
            عرض السجل الطبي والديون السابقة للمريض
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-mint-line lg:col-span-1">
          <div className="w-20 h-20 bg-primary-pale rounded-full flex items-center justify-center mx-auto mb-4 text-primary font-bold text-[32px]">
            {customer.name.charAt(0)}
          </div>
          <h2 className="text-center text-[20px] font-bold text-ink mb-1">
            {customer.name}
          </h2>
          <p className="text-center text-[14px] font-mono text-ink-soft mb-6">
            {customer.id}
          </p>

          <div className="space-y-4">
            <div className="flex justify-between border-b border-mint-line/50 pb-2">
              <span className="text-ink-soft text-[14px]">رقم الجوال</span>
              <span className="font-bold text-[14px]">{customer.phone}</span>
            </div>
            <div className="flex justify-between border-b border-mint-line/50 pb-2">
              <span className="text-ink-soft text-[14px]">العنوان</span>
              <span className="font-bold text-[14px]">{customer.address}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-ink-soft text-[14px]">
                الرصيد المستحق (ديون)
              </span>
              <span className="font-bold text-[16px] text-coral">
                {customer.debt} ₪
              </span>
            </div>
          </div>

          {customer.debt > 0 && (
            <button className="w-full mt-6 py-3 bg-teal text-white font-bold rounded-xl hover:bg-[#259775] transition-all">
              تسديد جزء من الديون
            </button>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-mint-line lg:col-span-2 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
            <h2 className="text-[16px] font-bold text-ink">
              تاريخ المشتريات والروشتات
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                  <th className="py-3 px-5 font-semibold text-start">رقم الفاتورة</th>
                  <th className="py-3 px-5 font-semibold text-start">التاريخ</th>
                  <th className="py-3 px-5 font-semibold text-start">الأصناف</th>
                  <th className="py-3 px-5 font-semibold text-start">الإجمالي</th>
                  <th className="py-3 px-5 font-semibold text-start">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {customer.history.map((hist, i) => (
                  <tr
                    key={i}
                    className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                  >
                    <td className="py-4 px-5 font-mono text-[14px] font-bold text-ink">
                      {hist.id}
                    </td>
                    <td className="py-4 px-5 text-[14px] text-ink-soft">
                      {hist.date}
                    </td>
                    <td className="py-4 px-5 text-[14px] max-w-[200px] truncate">
                      {hist.items}
                    </td>
                    <td className="py-4 px-5 font-bold text-[14px]">
                      {hist.total} ₪
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`px-2 py-1 rounded-md text-[12px] font-bold ${
                          hist.status === "paid"
                            ? "bg-teal-pale text-teal"
                            : "bg-coral-pale text-coral"
                        }`}
                      >
                        {hist.status === "paid" ? "مدفوعة" : "آجل (دين)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
