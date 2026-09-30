New-Item -ItemType Directory -Force -Path "web\src\app\shifts" | Out-Null; @'
"use client";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ShiftsPage() {
  const user = useStore(s => s.user);
  const router = useRouter();
  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: currentData, mutate: mutateCurrentShift } = useSWR(
    user ? `http://localhost:3001/api/pharmacies/${user.pharmacy_id}/shifts/current?cashier_email=${user.email}` : null, fetcher,
    { refreshInterval: 30000 }
  );
  const { data: shiftsData, mutate: mutateShifts } = useSWR(
    user ? `http://localhost:3001/api/pharmacies/${user.pharmacy_id}/shifts` : null, fetcher
  );

  const currentShift = currentData?.shift || null;
  const shifts = shiftsData?.shifts || [];

  const getDuration = (openTime: string) => {
    const diff = Date.now() - new Date(openTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}س ${m}د`;
  };

  const handleOpenShift = async () => {
    if (!openingAmount) { toast.error("أدخل المبلغ الافتتاحي"); return; }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/pharmacies/${user?.pharmacy_id}/shifts/open`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashier_name: user?.managerName || user?.username || "", cashier_email: user?.email || "", opening_amount: parseFloat(openingAmount) })
      });
      const r = await res.json();
      if (r.success) { toast.success("تم فتح الوردية!"); setShowOpenModal(false); setOpeningAmount(""); mutateCurrentShift(); mutateShifts(); }
      else toast.error(r.error || "فشل فتح الوردية");
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };

  const handleCloseShift = async () => {
    if (!closingAmount) { toast.error("أدخل المبلغ الفعلي في الصندوق"); return; }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/pharmacies/${user?.pharmacy_id}/shifts/${currentShift.id}/close`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closing_amount: parseFloat(closingAmount), notes: closeNotes })
      });
      const r = await res.json();
      if (r.success) {
        const diff = parseFloat(closingAmount) - r.expected_amount;
        if (diff > 0) toast.success(`تم إغلاق الوردية — فائض: ₪${diff.toFixed(2)}`);
        else if (diff < 0) toast.error(`تم الإغلاق — عجز: ₪${Math.abs(diff).toFixed(2)}`);
        else toast.success("تم الإغلاق — الصندوق مطابق تماماً ✓");
        setShowCloseModal(false); setClosingAmount(""); setCloseNotes(""); mutateCurrentShift(); mutateShifts();
      } else toast.error(r.error || "فشل");
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };

  return (
    <>
      <AppBar title="إدارة الورديات" />
      <div className="p-6 space-y-6">

        {/* Current Shift Status */}
        {currentShift ? (
          <div className="bg-teal rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                  <span className="font-bold text-[13px] text-white/80 uppercase tracking-wide">وردية مفتوحة</span>
                </div>
                <h2 className="text-[22px] font-black">{currentShift.cashier_name}</h2>
                <p className="text-white/70 text-[13px]">فُتحت: {new Date(currentShift.open_time).toLocaleString("ar-EG")}</p>
              </div>
              <div className="text-left">
                <p className="text-white/70 text-[12px] mb-1">المدة</p>
                <p className="font-mono font-black text-[24px]">{getDuration(currentShift.open_time)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mt-2">
              <div>
                <p className="text-white/60 text-[12px]">المبلغ الافتتاحي</p>
                <p className="font-mono font-black text-[20px]">₪{parseFloat(currentShift.opening_amount||0).toFixed(2)}</p>
              </div>
              <div className="text-left">
                <button onClick={() => setShowCloseModal(true)} className="bg-white text-teal font-black px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md text-[15px]">
                  إغلاق الوردية ←
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-mint-line p-10 text-center">
            <div className="text-[48px] mb-3">🏪</div>
            <div className="text-[18px] font-black text-ink mb-2">لا توجد وردية مفتوحة</div>
            <div className="text-ink-soft text-[14px] mb-6">افتح وردية جديدة لتتبع مبيعات هذه الفترة وتسوية الصندوق</div>
            <button onClick={() => setShowOpenModal(true)} className="bg-primary text-white px-8 py-4 rounded-xl font-black text-[16px] shadow-lg shadow-primary/30 hover:opacity-90 transition-all">
              + فتح وردية جديدة
            </button>
          </div>
        )}

        {/* Past Shifts */}
        {shifts.length > 0 && (
          <div>
            <h3 className="text-[16px] font-black text-ink mb-4">سجل الورديات</h3>
            <div className="bg-white rounded-2xl border border-mint-line overflow-hidden shadow-sm">
              <table className="w-full text-right">
                <thead className="bg-bg border-b border-mint-line">
                  <tr>
                    {["الكاشير","وقت الفتح","وقت الإغلاق","المبلغ الافتتاحي","مبيعات نقدي","المتوقع","الفعلي","الفرق","الحالة"].map((h,i) => (
                      <th key={i} className="px-3 py-3 text-[12px] font-bold text-ink-soft">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line">
                  {shifts.map((s: any) => {
                    const diff = s.status === "closed" ? (parseFloat(s.closing_amount||0) - parseFloat(s.expected_amount||0)) : null;
                    return (
                      <tr key={s.id} className="hover:bg-bg transition-colors">
                        <td className="px-3 py-3 font-bold text-[13px]">{s.cashier_name}</td>
                        <td className="px-3 py-3 text-[12px] text-ink-soft font-mono">{new Date(s.open_time).toLocaleString("ar-EG")}</td>
                        <td className="px-3 py-3 text-[12px] text-ink-soft font-mono">{s.close_time ? new Date(s.close_time).toLocaleString("ar-EG") : "—"}</td>
                        <td className="px-3 py-3 font-mono text-[13px]">₪{parseFloat(s.opening_amount||0).toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono text-[13px] text-teal">₪{parseFloat(s.cash_sales||0).toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono text-[13px]">₪{parseFloat(s.expected_amount||0).toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono text-[13px]">{s.closing_amount ? `₪${parseFloat(s.closing_amount).toFixed(2)}` : "—"}</td>
                        <td className="px-3 py-3 font-mono text-[13px]">
                          {diff !== null ? (
                            <span className={`font-black ${diff >= 0 ? "text-teal" : "text-coral"}`}>{diff >= 0 ? "+" : ""}₪{diff.toFixed(2)}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${s.status === "open" ? "bg-teal-pale text-teal" : "bg-bg text-ink-soft"}`}>
                            {s.status === "open" ? "مفتوحة" : "مغلقة"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line">
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">فتح وردية جديدة</h3>
            <div className="space-y-4">
              <div className="bg-bg rounded-xl p-3 text-[14px] font-bold text-ink">الكاشير: {user?.managerName || user?.username}</div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">المبلغ الموجود في الصندوق (₪) *</label>
                <input type="number" step="0.01" value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[18px] font-mono outline-none focus:border-teal" placeholder="0.00" autoFocus />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleOpenShift} disabled={loading} className="flex-1 bg-teal text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50">
                {loading ? "جاري الفتح..." : "فتح الوردية"}
              </button>
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line">
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">إغلاق الوردية</h3>
            <div className="space-y-4">
              <div className="bg-bg rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-[13px]"><span className="text-ink-soft font-bold">المبلغ الافتتاحي:</span><span className="font-mono font-black">₪{parseFloat(currentShift.opening_amount||0).toFixed(2)}</span></div>
                <div className="flex justify-between text-[13px] text-teal"><span className="font-bold">+ مبيعات نقدي:</span><span className="font-mono font-black">تُحسب تلقائياً</span></div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">المبلغ الفعلي في الصندوق الآن (₪) *</label>
                <input type="number" step="0.01" value={closingAmount} onChange={e => setClosingAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[18px] font-mono outline-none focus:border-primary" placeholder="0.00" autoFocus />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">ملاحظات (اختياري)</label>
                <input type="text" value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCloseShift} disabled={loading} className="flex-1 bg-coral text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50">
                {loading ? "جاري الإغلاق..." : "إغلاق وتسجيل"}
              </button>
              <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
'@ | Out-File -FilePath "web\src\app\shifts\page.tsx" -Encoding UTF8