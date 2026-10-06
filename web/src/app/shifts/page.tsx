"use client";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ShiftsPage() {
  const user = useStore((s: any) => s.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // For manager to open shifts for others
  const [selectedStaffEmail, setSelectedStaffEmail] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");

  const { data: staffData } = useSWR(
    user?.role === "manager"
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}/staff`
      : null,
    fetcher
  );
  const staffList = staffData?.staff || [];
  
  // Set default to logged in user when modal opens
  useEffect(() => {
    if (showOpenModal && user) {
      setSelectedStaffEmail(user.email || "");
      setSelectedStaffName(user.managerName || user.username || "");
    }
  }, [showOpenModal, user]);

  const { data: currentData, mutate: mutateCurrentShift } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/shifts/current?cashier_email=${user.email}`
      : null,
    fetcher,
    { refreshInterval: 30000 },
  );
  const { data: shiftsData, mutate: mutateShifts } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/shifts`
      : null,
    fetcher,
  );

  const currentShift = currentData?.shift || null;
  const shifts = shiftsData?.shifts || [];

  const getDuration = (openTime: string) => {
    const diff = Date.now() - new Date(openTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return language === 'en' ? `${h}h ${m}m` : `${h}س ${m}د`;
  };

  const handleOpenShift = async () => {
    if (!openingAmount) {
      toast.error(language === 'en' ? "Please enter the opening amount" : "يرجى إدخال مبلغ العهدة");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/shifts/open`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashier_name: selectedStaffName || user?.managerName || user?.username || "",
            cashier_email: selectedStaffEmail || user?.email || "",
            opening_amount: parseFloat(openingAmount),
          }),
        },
      );
      const r = await res.json();
      if (r.success) {
        toast.success(language === 'en' ? "Shift opened successfully!" : "تم فتح الوردية!");
        setShowOpenModal(false);
        setOpeningAmount("");
        mutateCurrentShift();
        mutateShifts();
      } else toast.error(r.error || (language === 'en' ? "Failed to open shift" : "فشل فتح الوردية"));
    } catch {
      toast.error(language === 'en' ? "Error" : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!closingAmount) {
      toast.error(language === 'en' ? "Please enter the actual amount in the cash register" : "يرجى إدخال المبلغ الفعلي في الصندوق");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/shifts/${currentShift.id}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            closing_amount: parseFloat(closingAmount),
            notes: closeNotes,
          }),
        },
      );
      const r = await res.json();
      if (r.success) {
        const diff = parseFloat(closingAmount) - r.expected_amount;
        if (diff > 0)
          toast.success(language === 'en' ? `Shift closed — Surplus: ₪${diff.toFixed(2)}` : `تم إغلاق الوردية — فائض: ₪${diff.toFixed(2)}`);
        else if (diff < 0)
          toast.error(language === 'en' ? `Closed — Deficit: ₪${Math.abs(diff).toFixed(2)}` : `تم الإغلاق — عجز: ₪${Math.abs(diff).toFixed(2)}`);
        else toast.success(language === 'en' ? "Closed — Cash register matches perfectly ✓" : "تم الإغلاق — الصندوق مطابق تماماً ✓");
        setShowCloseModal(false);
        setClosingAmount("");
        setCloseNotes("");
        mutateCurrentShift();
        mutateShifts();
      } else toast.error(r.error || (language === 'en' ? "Failed" : "فشل"));
    } catch {
      toast.error(language === 'en' ? "Error" : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar title={language === 'en' ? 'Shifts Management' : 'إدارة الورديات'} />
      <div className="p-6 space-y-6">
        {/* Current Shift Status */}
        {currentShift ? (
          <div className="bg-teal rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                  <span className="font-bold text-[13px] text-white/80 uppercase tracking-wide">
                    {language === 'en' ? 'Open Shift' : 'وردية مفتوحة'}
                  </span>
                </div>
                <h2 className="text-[22px] font-black">
                  {currentShift.cashier_name}
                </h2>
                <p className="text-white/70 text-[13px]">
                  {language === 'en' ? 'Opened: ' : 'فُتحت: '}{" "}
                  {new Date(currentShift.open_time).toLocaleString(language === 'en' ? 'en-US' : 'ar-EG')}
                </p>
              </div>
              <div className="text-start">
                <p className="text-white/70 text-[12px] mb-1">{language === 'en' ? 'Duration' : 'المدة'}</p>
                <p className="font-mono font-black text-[24px]">
                  {getDuration(currentShift.open_time)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mt-2">
              <div>
                <p className="text-white/60 text-[12px]">{language === 'en' ? 'Opening Amount' : 'مبلغ العهدة'}</p>
                <p className="font-mono font-black text-[20px]">
                  ₪{parseFloat(currentShift.opening_amount || 0).toFixed(2)}
                </p>
              </div>
              <div className="text-start">
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-white text-teal font-black px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-md text-[15px]"
                >
                  {language === 'en' ? 'Close Shift ←' : 'إغلاق الوردية ←'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-mint-line p-10 text-center">
            <div className="text-[48px] mb-3">🏪</div>
            <div className="text-[18px] font-black text-ink mb-2">
              {language === 'en' ? 'No open shift' : 'لا توجد وردية مفتوحة'}
            </div>
            <div className="text-ink-soft text-[14px] mb-6">
              {language === 'en' ? 'Open a new shift to track sales for this period and reconcile the cash register' : 'افتح وردية جديدة لتتبع مبيعات هذه الفترة وتسوية الصندوق'}
            </div>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-primary text-white px-8 py-4 rounded-xl font-black text-[16px] shadow-lg shadow-primary/30 hover:opacity-90 transition-all"
            >
              {language === 'en' ? '+ Open New Shift' : '+ فتح وردية جديدة'}
            </button>
          </div>
        )}

        {/* Past Shifts */}
        {shifts.length > 0 && (
          <div>
            <h3 className="text-[16px] font-black text-ink mb-4">
              {language === 'en' ? 'Shifts Log' : 'سجل الورديات'}
            </h3>
            <div className="bg-white rounded-2xl border border-mint-line overflow-hidden shadow-sm">
              <table className="w-full text-start">
                <thead className="bg-bg border-b border-mint-line">
                  <tr>
                    {(language === 'en' ? [
                      "Cashier",
                      "Open Time",
                      "Close Time",
                      "Opening Amount",
                      "Cash Sales",
                      "Expected",
                      "Actual",
                      "Difference",
                      "Status",
                    ] : [
                      "الكاشير",
                      "وقت الفتح",
                      "وقت الإغلاق",
                      "مبلغ العهدة",
                      "مبيعات نقدي",
                      "المتوقع",
                      "الفعلي",
                      "الفرق",
                      "الحالة",
                    ]).map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-3 text-[12px] font-bold text-ink-soft text-start"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line">
                  {shifts.map((s: any) => {
                    const diff =
                      s.status === "closed"
                        ? parseFloat(s.closing_amount || 0) -
                          parseFloat(s.expected_amount || 0)
                        : null;
                    return (
                      <tr key={s.id} className="hover:bg-bg transition-colors">
                        <td className="px-3 py-3 font-bold text-[13px]">
                          {s.cashier_name}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-ink-soft font-mono">
                          {new Date(s.open_time).toLocaleString(language === 'en' ? 'en-US' : 'ar-EG')}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-ink-soft font-mono">
                          {s.close_time
                            ? new Date(s.close_time).toLocaleString(language === 'en' ? 'en-US' : 'ar-EG')
                            : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-[13px]">
                          ₪{parseFloat(s.opening_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[13px] text-teal">
                          ₪{parseFloat(s.cash_sales || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[13px]">
                          ₪{parseFloat(s.expected_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono text-[13px]">
                          {s.closing_amount
                            ? `₪${parseFloat(s.closing_amount).toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-[13px]">
                          {diff !== null ? (
                            <span
                              className={`font-black ${diff >= 0 ? "text-teal" : "text-coral"}`}
                            >
                              {diff >= 0 ? "+" : ""}₪{diff.toFixed(2)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold ${s.status === "open" ? "bg-teal-pale text-teal" : "bg-bg text-ink-soft"}`}
                          >
                            {s.status === "open" ? (language === 'en' ? 'Open' : 'مفتوحة') : (language === 'en' ? 'Closed' : 'مغلقة')}
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
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">
              {language === 'en' ? 'Open New Shift' : 'فتح وردية جديدة'}
            </h3>
            <div className="space-y-4">
              {user?.role === "manager" ? (
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                    {language === 'en' ? 'Assign shift to staff (Manager only)' : 'تعيين الوردية للموظف (للمدير فقط)'}
                  </label>
                  <select
                    value={selectedStaffEmail}
                    onChange={(e) => {
                      setSelectedStaffEmail(e.target.value);
                      const selected = staffList.find((s: any) => s.email === e.target.value);
                      if (selected) setSelectedStaffName(selected.name);
                      else if (e.target.value === user.email) setSelectedStaffName(user.managerName || user.username || "");
                    }}
                    className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-teal outline-none focus:border-primary"
                  >
                    <option value={user?.email || ""}>{language === 'en' ? 'Me' : 'أنا'} ({user?.managerName || user?.username})</option>
                    {staffList.map((s: any) => (
                      s.email !== user?.email && (
                        <option key={s.id} value={s.email}>
                          {s.name} ({s.role})
                        </option>
                      )
                    ))}
                  </select>
                </div>
              ) : (
                <div className="bg-bg rounded-xl p-3 text-[14px] font-bold text-ink flex items-center gap-2 border border-mint-line">
                  <svg className="w-5 h-5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{language === 'en' ? 'Cashier:' : 'الكاشير:'} {user?.managerName || user?.username}</span>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? 'Amount in Cash Register (₪) *' : 'المبلغ الموجود في الصندوق (₪) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[18px] font-mono outline-none focus:border-teal"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleOpenShift}
                disabled={loading}
                className="flex-1 bg-teal text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (language === 'en' ? 'Opening...' : 'جاري الفتح...') : (language === 'en' ? 'Open Shift' : 'فتح الوردية')}
              </button>
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line">
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">
              {language === 'en' ? 'Close Shift' : 'إغلاق الوردية'}
            </h3>
            <div className="space-y-4">
              <div className="bg-bg rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink-soft font-bold">{language === 'en' ? 'Opening Amount:' : 'مبلغ العهدة:'}</span>
                  <span className="font-mono font-black">
                    ₪{parseFloat(currentShift.opening_amount || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[13px] text-teal">
                  <span className="font-bold">{language === 'en' ? '+ Cash Sales:' : '+ مبيعات نقدي:'}</span>
                  <span className="font-mono font-black">{language === 'en' ? 'Calculated automatically' : 'تُحسب تلقائياً'}</span>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? 'Actual Amount in Cash Register Now (₪) *' : 'المبلغ الفعلي في الصندوق الآن (₪) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[18px] font-mono outline-none focus:border-primary"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? 'Notes (Optional)' : 'ملاحظات (اختياري)'}
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseShift}
                disabled={loading}
                className="flex-1 bg-coral text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (language === 'en' ? 'Closing...' : 'جاري الإغلاق...') : (language === 'en' ? 'Close and Record' : 'إغلاق وتسجيل')}
              </button>
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
