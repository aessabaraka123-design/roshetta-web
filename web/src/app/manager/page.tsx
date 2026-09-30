"use client";

import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BranchManager() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<
    "shift" | "stock" | "approvals" | "drugs"
  >("shift");

  // Shift Management State
  const [cashInDrawer, setCashInDrawer] = useState("");

  // Fetch live shift data from server
  const { data: shiftData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/shift/current`
      : null,
    fetcher,
    { refreshInterval: 30000 }, // refresh every 30 seconds
  );

  const systemCash = shiftData?.expectedCash || 0;
  const cashSalesCount = shiftData?.cashSalesCount || 0;

  // Controlled Drugs State
  const [searchDrug, setSearchDrug] = useState("");
  const controlledDrugsLog = [
    {
      id: "CD-001",
      patient: "محمود خليل",
      doctor: "د. سامر فريد",
      drug: "Lexotanil 3mg",
      qty: 1,
      date: "2026-08-10",
      status: "مسجل",
    },
    {
      id: "CD-002",
      patient: "سعاد أحمد",
      doctor: "د. هند محمود",
      drug: "Rivotril 2mg",
      qty: 2,
      date: "2026-08-09",
      status: "مسجل",
    },
  ];

  // Stock Adjustments State
  const stockAdjustments = [
    {
      id: "ADJ-101",
      drug: "شراب كحة توسيبان",
      reason: "كسر بالزجاجة",
      qty: 1,
      value: "15 ₪",
      date: "2026-08-08",
      by: "محمد أحمد",
    },
  ];

  // Approvals Log State
  const approvalsLog = [
    {
      id: "APP-501",
      action: "إلغاء فاتورة",
      details: "إلغاء فاتورة بقيمة 120 ₪",
      date: "2026-08-10 10:30 AM",
      cashier: "صيدلي أحمد",
      status: "approved",
    },
    {
      id: "APP-502",
      action: "خصم استثنائي",
      details: "خصم 15% لعميل دائم",
      date: "2026-08-09 04:15 PM",
      cashier: "صيدلي سارة",
      status: "approved",
    },
  ];

  const handleCloseShift = () => {
    if (!cashInDrawer) {
      toast.error("الرجاء إدخال الكاش الفعلي في الدرج");
      return;
    }
    const actual = parseFloat(cashInDrawer);
    const difference = actual - systemCash;
    if (difference === 0) {
      toast.success("✅ الصندوق مطابق تماماً. تم تقفيل الوردية بنجاح!");
    } else if (difference > 0) {
      toast.success(`تم تقفيل الوردية بزيادة قدرها ${difference.toFixed(2)} ₪`);
    } else {
      toast.error(
        `⚠️ تم تقفيل الوردية بعجز قدره ${Math.abs(difference).toFixed(2)} ₪`,
      );
    }
  };

  if (!user) return null;

  return (
    <div className="w-full pb-10">
      <AppBar />

      <div className="mb-6 flex justify-between items-center bg-gradient-to-l from-primary to-teal p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-[24px] font-black mb-1">
            إدارة الفرع (Pharmacy Manager) 💼
          </h1>
          <p className="text-[15px] font-medium opacity-90">
            التحكم في الورديات، الصلاحيات، وسجلات الرقابة
          </p>
        </div>
        <div className="relative z-10 text-left bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-[11px] font-bold opacity-80">الكاشير الحالي</div>
          <div className="text-[16px] font-black">
            {user?.managerName || user?.cashierName || "الكاشير"}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-mint-line pb-4 overflow-x-auto hide-scrollbar">
        {[
          { id: "shift", label: "تقفيل الصندوق 💵" },
          { id: "stock", label: "الجرد والتوالف 📦" },
          { id: "approvals", label: "طلبات الموافقة 🛡️" },
          { id: "drugs", label: "دفتر السموم 💊" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-bg text-ink-soft hover:bg-mint-bg hover:text-primary"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "shift" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h2 className="text-[18px] font-black text-primary mb-4">
              إنهاء الوردية (End of Shift)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-bg rounded-2xl p-5 border border-mint-line">
                <div className="text-[14px] text-ink-soft font-bold mb-1">
                  المبيعات النقدية في النظام
                </div>
                {shiftData ? (
                  <>
                    <div className="font-mono text-[32px] font-black text-ink">
                      {systemCash.toFixed(2)} ₪
                    </div>
                    <div className="text-[12px] font-bold mt-2 flex items-center gap-1 text-teal bg-teal-pale w-fit px-2 py-0.5 rounded-full">
                      إجمالي {cashSalesCount} فاتورة كاش لليوم
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[28px] font-black text-ink-soft animate-pulse">
                    جاري التحميل...
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  الكاش الفعلي في الدرج (₪)
                </label>
                <input
                  type="number"
                  value={cashInDrawer}
                  onChange={(e) => setCashInDrawer(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-4 outline-none focus:border-teal transition-colors font-mono text-[20px] font-bold text-center"
                  placeholder="أدخل المبلغ..."
                />
              </div>
            </div>

            {cashInDrawer && (
              <div
                className={`mt-6 p-4 rounded-xl border font-bold text-[15px] flex items-center justify-between ${
                  parseFloat(cashInDrawer) === systemCash
                    ? "bg-teal-pale border-teal text-teal"
                    : parseFloat(cashInDrawer) > systemCash
                      ? "bg-amber-pale border-amber text-amber-dark"
                      : "bg-coral-pale border-coral text-coral"
                }`}
              >
                <span>
                  {parseFloat(cashInDrawer) === systemCash
                    ? "✅ مطابق تماماً"
                    : parseFloat(cashInDrawer) > systemCash
                      ? "⬆️ زيادة في الصندوق"
                      : "⚠️ عجز في الصندوق"}
                </span>
                <span className="font-mono text-[20px] font-black">
                  {parseFloat(cashInDrawer) === systemCash
                    ? "0.00"
                    : Math.abs(parseFloat(cashInDrawer) - systemCash).toFixed(
                        2,
                      )}{" "}
                  ₪
                </span>
              </div>
            )}

            <button
              onClick={handleCloseShift}
              className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-all text-[16px]"
            >
              تقفيل وتأكيد الوردية
            </button>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
          <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
            <h2 className="text-[18px] font-black text-primary">
              سجل الجرد والتوالف
            </h2>
            <button className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-[#e11d48] transition-all">
              + تسجيل دواء تالف
            </button>
          </div>
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-4 px-6 font-semibold">رقم السجل</th>
                <th className="py-4 px-6 font-semibold">اسم الدواء</th>
                <th className="py-4 px-6 font-semibold">السبب</th>
                <th className="py-4 px-6 font-semibold">الكمية</th>
                <th className="py-4 px-6 font-semibold">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {stockAdjustments.map((adj) => (
                <tr
                  key={adj.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-6 font-mono text-[14px] font-bold text-ink">
                    {adj.id}
                  </td>
                  <td className="py-4 px-6 font-bold text-[14px] text-ink">
                    {adj.drug}
                  </td>
                  <td className="py-4 px-6 text-[14px] text-coral font-bold">
                    {adj.reason}
                  </td>
                  <td className="py-4 px-6 font-bold text-[14px]">
                    {adj.qty} علبة
                  </td>
                  <td className="py-4 px-6 text-[14px] text-ink-soft">
                    {adj.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
          <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
            <h2 className="text-[18px] font-black text-primary">
              سجل الصلاحيات والموافقات
            </h2>
          </div>
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-4 px-6 font-semibold">رقم العملية</th>
                <th className="py-4 px-6 font-semibold">نوع الإجراء</th>
                <th className="py-4 px-6 font-semibold">التفاصيل</th>
                <th className="py-4 px-6 font-semibold">الصيدلي</th>
                <th className="py-4 px-6 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {approvalsLog.map((app) => (
                <tr
                  key={app.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-6 font-mono text-[14px] font-bold text-ink">
                    {app.id}
                  </td>
                  <td className="py-4 px-6 font-bold text-[14px] text-primary">
                    {app.action}
                  </td>
                  <td className="py-4 px-6 text-[14px] text-ink-soft">
                    {app.details}
                  </td>
                  <td className="py-4 px-6 text-[14px] font-semibold">
                    {app.cashier}
                  </td>
                  <td className="py-4 px-6 text-[14px] text-ink-soft">
                    {app.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "drugs" && (
        <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
          <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
            <h2 className="text-[18px] font-black text-primary">
              سجل الأدوية الخاضعة للرقابة
            </h2>
            <button className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-[#259775] transition-all flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              طباعة الدفتر لوزارة الصحة
            </button>
          </div>
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-4 px-6 font-semibold">المريض</th>
                <th className="py-4 px-6 font-semibold">الطبيب الواصف</th>
                <th className="py-4 px-6 font-semibold">الدواء</th>
                <th className="py-4 px-6 font-semibold">الكمية</th>
                <th className="py-4 px-6 font-semibold">التاريخ</th>
                <th className="py-4 px-6 font-semibold text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {controlledDrugsLog.map((drug) => (
                <tr
                  key={drug.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-6 font-bold text-[14px] text-ink">
                    {drug.patient}
                  </td>
                  <td className="py-4 px-6 text-[14px] text-ink-soft">
                    {drug.doctor}
                  </td>
                  <td className="py-4 px-6 font-bold text-[14px] text-primary">
                    {drug.drug}
                  </td>
                  <td className="py-4 px-6 font-bold text-[14px]">
                    {drug.qty} علبة
                  </td>
                  <td className="py-4 px-6 text-[14px] text-ink-soft">
                    {drug.date}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-teal-pale text-teal">
                      {drug.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
