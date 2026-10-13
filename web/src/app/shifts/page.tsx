"use client";

import { useState, useEffect, useMemo } from "react";
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
    if (!user) {
      const hasStored =
        typeof window !== "undefined" &&
        (localStorage.getItem("roshetta_user") ||
          localStorage.getItem("roshetta-web-storage"));
      if (!hasStored) {
        router.push("/login");
      }
    }
  }, [user, router]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<any | null>(null);

  // Open Shift Form State
  const [selectedStaffEmail, setSelectedStaffEmail] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [selectedBranchName, setSelectedBranchName] = useState("الفرع الرئيسي");
  const [openingAmount, setOpeningAmount] = useState("");

  // Close Shift Form State
  const [closingAmount, setClosingAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters for History Table
  const [historySearch, setHistorySearch] = useState("");
  const [historyBranchFilter, setHistoryBranchFilter] = useState("all");

  // Fetch Staff List
  const { data: staffData } = useSWR(
    user ? `${API_BASE}/api/admin/pharmacies/${user.pharmacy_id}/staff` : null,
    fetcher
  );
  const staffList = staffData?.staff || [];

  // Fetch Branches List
  const { data: branchesData } = useSWR(
    user ? `${API_BASE}/api/admin/pharmacies/${user.pharmacy_id}/branches` : null,
    fetcher
  );
  const branchesList = branchesData?.branches || [];

  // Fetch Active Open Shifts (for ALL employees and branches)
  const { data: currentData, mutate: mutateCurrentShifts } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/shifts/current` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  // Fetch All Shifts Log
  const { data: shiftsData, mutate: mutateShifts } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/shifts` : null,
    fetcher,
    { refreshInterval: 20000 }
  );

  const shifts: any[] = shiftsData?.shifts || [];

  // Active shifts: all open shifts across all employees
  const activeShifts: any[] = useMemo(() => {
    if (currentData?.active_shifts && Array.isArray(currentData.active_shifts)) {
      return currentData.active_shifts;
    }
    return shifts.filter((s: any) => s.status === "open");
  }, [currentData, shifts]);

  // Closed / Past shifts
  const closedShifts: any[] = useMemo(() => {
    return shifts.filter((s: any) => s.status === "closed");
  }, [shifts]);

  // Filtered Closed Shifts for History
  const filteredClosedShifts = useMemo(() => {
    return closedShifts.filter((s: any) => {
      const matchSearch =
        !historySearch ||
        (s.cashier_name || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        (s.cashier_email || "").toLowerCase().includes(historySearch.toLowerCase());
      const matchBranch =
        historyBranchFilter === "all" ||
        (s.branch_name || "الفرع الرئيسي") === historyBranchFilter;
      return matchSearch && matchBranch;
    });
  }, [closedShifts, historySearch, historyBranchFilter]);

  // Set default employee when opening modal
  useEffect(() => {
    if (showOpenModal && user) {
      if (!selectedStaffName) {
        setSelectedStaffName(user.managerName || user.name || user.username || "");
        setSelectedStaffEmail(user.email || "");
      }
      if (branchesList.length > 0 && !selectedBranchName) {
        setSelectedBranchName(branchesList[0].name || "الفرع الرئيسي");
      }
    }
  }, [showOpenModal, user, branchesList]);

  // Helper for Duration
  const getDuration = (openTime: string) => {
    if (!openTime) return "--";
    const diff = Math.max(0, Date.now() - new Date(openTime).getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return language === "en" ? `${h}h ${m}m` : `${h}س ${m}د`;
  };

  // Open Shift Handler
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffName) {
      toast.error(
        language === "en" ? "Please specify employee name" : "يرجى تحديد اسم الموظف"
      );
      return;
    }
    if (openingAmount === "" || isNaN(Number(openingAmount))) {
      toast.error(
        language === "en"
          ? "Please enter opening cash amount"
          : "يرجى إدخال مبلغ العهدة النقدية"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${user?.pharmacy_id}/shifts/open`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cashier_name: selectedStaffName,
            cashier_email: selectedStaffEmail || "",
            branch_name: selectedBranchName || "الفرع الرئيسي",
            opening_amount: parseFloat(openingAmount),
          }),
        }
      );
      const r = await res.json();
      if (r.success) {
        toast.success(
          language === "en"
            ? `Shift opened for ${selectedStaffName} successfully!`
            : `تم فتح وردية جديدة للموظف (${selectedStaffName}) بنجاح!`
        );
        setShowOpenModal(false);
        setOpeningAmount("");
        setSelectedStaffName("");
        setSelectedStaffEmail("");
        mutateCurrentShifts();
        mutateShifts();
      } else {
        toast.error(r.error || (language === "en" ? "Failed to open shift" : "فشل فتح الوردية"));
      }
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Open Close Modal for a specific shift
  const handleOpenCloseModal = (shift: any) => {
    setShiftToClose(shift);
    setClosingAmount("");
    setCloseNotes("");
    setShowCloseModal(true);
  };

  // Close Shift Handler
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftToClose) return;
    if (closingAmount === "" || isNaN(Number(closingAmount))) {
      toast.error(
        language === "en"
          ? "Please enter actual cash in register"
          : "يرجى إدخال المبلغ الفعلي في الصندوق"
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${user?.pharmacy_id}/shifts/${shiftToClose.id}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            closing_amount: parseFloat(closingAmount),
            notes: closeNotes,
          }),
        }
      );
      const r = await res.json();
      if (r.success) {
        const diff = parseFloat(closingAmount) - (r.expected_amount ?? 0);
        if (diff > 0) {
          toast.success(
            language === "en"
              ? `Shift closed — Surplus: ₪${diff.toFixed(2)}`
              : `تم إغلاق الوردية — فائض في الصندوق: ₪${diff.toFixed(2)}`
          );
        } else if (diff < 0) {
          toast.error(
            language === "en"
              ? `Shift closed — Deficit: ₪${Math.abs(diff).toFixed(2)}`
              : `تم إغلاق الوردية — عجز في الصندوق: ₪${Math.abs(diff).toFixed(2)}`
          );
        } else {
          toast.success(
            language === "en"
              ? "Shift closed — Register matches perfectly ✓"
              : "تم إغلاق الوردية — الصندوق مطابق تماماً ✓"
          );
        }
        setShowCloseModal(false);
        setShiftToClose(null);
        setClosingAmount("");
        setCloseNotes("");
        mutateCurrentShifts();
        mutateShifts();
      } else {
        toast.error(r.error || (language === "en" ? "Failed" : "فشل الإغلاق"));
      }
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Calculation for Close Modal
  const expectedForClose = useMemo(() => {
    if (!shiftToClose) return 0;
    if (shiftToClose.live_expected_amount !== undefined) {
      return Number(shiftToClose.live_expected_amount);
    }
    const opening = Number(shiftToClose.opening_amount || 0);
    const liveCash = Number(shiftToClose.live_cash_sales || shiftToClose.cash_sales || 0);
    return opening + liveCash;
  }, [shiftToClose]);

  const closeDifference = useMemo(() => {
    if (closingAmount === "" || isNaN(Number(closingAmount))) return null;
    return parseFloat(closingAmount) - expectedForClose;
  }, [closingAmount, expectedForClose]);

  return (
    <>
      <AppBar title={language === "en" ? "Shifts Management" : "إدارة الورديات"} />
      <div className="p-6 space-y-6 pb-20">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-primary to-teal p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h1 className="text-[22px] font-black mb-1">
              {language === "en"
                ? "Pharmacy Shifts & Cash Drawers 🏪"
                : "إدارة ورديات الموظفين وصناديق الفروع 🏪"}
            </h1>
            <p className="text-[14px] text-white/85 font-medium">
              {language === "en"
                ? "Track active shifts across all cashiers and branches in real-time"
                : "متابعة لحظية لكافة دوريات الموظفين النشطة عبر جميع الفروع ونقاط البيع"}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedStaffName(user?.managerName || user?.name || user?.username || "");
              setSelectedStaffEmail(user?.email || "");
              setOpeningAmount("");
              setShowOpenModal(true);
            }}
            className="relative z-10 bg-white text-primary hover:bg-mint-bg px-6 py-3.5 rounded-2xl font-black text-[15px] shadow-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {language === "en" ? "+ Open Shift for Staff" : "+ فتح وردية جديدة لموظف"}
          </button>
        </div>

        {/* ─── SECTION 1: ALL ACTIVE / OPEN SHIFTS ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-black text-ink">
                {language === "en" ? "Currently Active Shifts" : "الورديات المفتوحة حالياً"}
              </h2>
              <span className="bg-teal-pale text-teal px-3 py-1 rounded-full font-mono text-[13px] font-bold">
                {activeShifts.length} {language === "en" ? "Active" : "وردية نشطة"}
              </span>
            </div>
            {activeShifts.length > 0 && (
              <span className="text-[12px] text-ink-soft font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal animate-ping"></span>
                {language === "en" ? "Live syncing with cashiers" : "تزامن لحظي مع أجهزة الكاشير"}
              </span>
            )}
          </div>

          {activeShifts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeShifts.map((shift: any) => {
                const opening = parseFloat(shift.opening_amount || 0);
                const liveCash = parseFloat(
                  shift.live_cash_sales !== undefined
                    ? shift.live_cash_sales
                    : shift.cash_sales || 0
                );
                const liveExpected = parseFloat(
                  shift.live_expected_amount !== undefined
                    ? shift.live_expected_amount
                    : (opening + liveCash).toFixed(2)
                );

                return (
                  <div
                    key={shift.id}
                    className="bg-white rounded-3xl p-6 border-2 border-teal/30 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group"
                  >
                    {/* Top status bar */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-teal"></span>
                        </span>
                        <span className="font-bold text-[12px] text-teal uppercase tracking-wider">
                          {language === "en" ? "Open Shift" : "وردية نشطة"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold bg-bg text-ink-soft px-3 py-1 rounded-full border border-mint-line">
                        🏪 {shift.branch_name || "الفرع الرئيسي"}
                      </span>
                    </div>

                    {/* Employee Info */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-teal-pale text-teal flex items-center justify-center font-black text-[18px]">
                          {(shift.cashier_name || "C")[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-[17px] font-black text-ink">
                            {shift.cashier_name || (language === "en" ? "Cashier" : "الكاشير")}
                          </h3>
                          <p className="text-[12px] text-ink-soft font-medium">
                            {shift.cashier_email || (language === "en" ? "Staff Member" : "موظف الصيدلية")}
                          </p>
                        </div>
                      </div>

                      {/* Time & Duration */}
                      <div className="mt-3 bg-bg rounded-xl p-3 border border-mint-line/70 flex items-center justify-between text-[12px]">
                        <div>
                          <span className="text-ink-soft">{language === "en" ? "Opened at:" : "فُتحت:"}</span>{" "}
                          <span className="font-bold text-ink">
                            {shift.open_time
                              ? new Date(shift.open_time).toLocaleTimeString(
                                  language === "en" ? "en-US" : "ar-EG",
                                  { hour: "2-digit", minute: "2-digit" }
                                )
                              : "--"}
                          </span>
                        </div>
                        <div className="font-bold text-teal flex items-center gap-1 font-mono">
                          ⏱️ {getDuration(shift.open_time)}
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-mint-line mb-4 text-center">
                      <div className="bg-bg/60 p-2 rounded-xl">
                        <div className="text-[11px] text-ink-soft font-bold mb-0.5">
                          {language === "en" ? "Opening" : "العهدة"}
                        </div>
                        <div className="font-mono font-bold text-[14px] text-ink">
                          {opening.toFixed(2)} ₪
                        </div>
                      </div>

                      <div className="bg-bg/60 p-2 rounded-xl">
                        <div className="text-[11px] text-ink-soft font-bold mb-0.5">
                          {language === "en" ? "Live Cash" : "مبيعات نقدي"}
                        </div>
                        <div className="font-mono font-bold text-[14px] text-teal">
                          +{liveCash.toFixed(2)} ₪
                        </div>
                      </div>

                      <div className="bg-teal-pale/50 p-2 rounded-xl border border-teal/20">
                        <div className="text-[11px] text-teal font-black mb-0.5">
                          {language === "en" ? "In Drawer" : "المتوقع بالدرج"}
                        </div>
                        <div className="font-mono font-black text-[15px] text-teal">
                          {liveExpected.toFixed(2)} ₪
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleOpenCloseModal(shift)}
                      className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 rounded-xl shadow-md transition-all text-[14px] flex items-center justify-center gap-2"
                    >
                      <span>{language === "en" ? "Close & Reconcile Drawer ←" : "إغلاق الوردية وتسوية الصندوق ←"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-mint-line p-10 text-center shadow-sm">
              <div className="text-[48px] mb-3">🏪✨</div>
              <h3 className="text-[18px] font-black text-ink mb-2">
                {language === "en" ? "No Open Shifts Currently" : "لا توجد أي وردية مفتوحة حالياً"}
              </h3>
              <p className="text-ink-soft text-[14px] max-w-md mx-auto mb-6">
                {language === "en"
                  ? "Every shift opened by any employee (on mobile, POS, or PC) will automatically appear here. You can also open a shift for any employee now."
                  : "أي عملية فتح دورية لأي موظف (من الهاتف أو نقطة البيع أو الويب) ستظهر هنا مباشرة فور فتحها. يمكنك أيضاً فتح دورية لأي موظف الآن."}
              </p>
              <button
                onClick={() => {
                  setSelectedStaffName(user?.managerName || user?.name || user?.username || "");
                  setSelectedStaffEmail(user?.email || "");
                  setOpeningAmount("");
                  setShowOpenModal(true);
                }}
                className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-black text-[15px] shadow-lg shadow-primary/20 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                {language === "en" ? "+ Open New Shift" : "+ فتح وردية جديدة"}
              </button>
            </div>
          )}
        </div>

        {/* ─── SECTION 2: PAST SHIFTS LOG ─────────────────────────────────── */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-[18px] font-black text-ink">
                {language === "en" ? "Closed Shifts Log" : "سجل الورديات السابقة والمغلقة"}
              </h2>
              <p className="text-[12px] text-ink-soft font-medium">
                {language === "en"
                  ? "Audit trail of all closed cash drawers and discrepancy reports"
                  : "أرشيف الورديات المغلقة ومطابقة فروقات الصندوق والكاش الفعلي"}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder={language === "en" ? "Search cashier..." : "بحث باسم الكاشير..."}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="bg-white border border-mint-line rounded-xl px-4 py-2 text-[13px] font-medium outline-none focus:border-teal w-full sm:w-48"
              />

              {branchesList.length > 0 && (
                <select
                  value={historyBranchFilter}
                  onChange={(e) => setHistoryBranchFilter(e.target.value)}
                  className="bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-medium outline-none focus:border-teal"
                >
                  <option value="all">{language === "en" ? "All Branches" : "كل الفروع"}</option>
                  <option value="الفرع الرئيسي">{language === "en" ? "Main Branch" : "الفرع الرئيسي"}</option>
                  {branchesList.map((b: any) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-mint-line overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead className="bg-bg border-b border-mint-line">
                  <tr className="text-ink-soft text-[13px]">
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Cashier" : "الكاشير / الموظف"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Branch" : "الفرع"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Open Time" : "وقت الفتح"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Close Time" : "وقت الإغلاق"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Opening" : "مبلغ العهدة"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Cash Sales" : "مبيعات نقدي"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Expected" : "المتوقع"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Actual" : "الفعلي"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-start">
                      {language === "en" ? "Difference" : "الفرق"}
                    </th>
                    <th className="px-5 py-4 font-semibold text-center">
                      {language === "en" ? "Status" : "الحالة"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClosedShifts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12 text-ink-soft">
                        <div className="text-[32px] mb-2">📋</div>
                        <div className="font-bold text-[15px] text-ink">
                          {language === "en" ? "No closed shifts found" : "لا توجد ورديات مغلقة"}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredClosedShifts.map((s: any) => {
                      const expected = parseFloat(s.expected_amount || 0);
                      const actual = parseFloat(s.closing_amount || 0);
                      const diff = actual - expected;

                      return (
                        <tr
                          key={s.id}
                          className="border-b border-mint-line/50 hover:bg-bg/50 transition-all text-[14px]"
                        >
                          <td className="px-5 py-4 font-bold text-ink">
                            {s.cashier_name || "كاشير"}
                          </td>
                          <td className="px-5 py-4 text-ink-soft text-[13px]">
                            {s.branch_name || "الفرع الرئيسي"}
                          </td>
                          <td className="px-5 py-4 text-ink-soft text-[12px] font-mono">
                            {s.open_time ? new Date(s.open_time).toLocaleString(language === "en" ? "en-US" : "ar-EG") : "--"}
                          </td>
                          <td className="px-5 py-4 text-ink-soft text-[12px] font-mono">
                            {s.close_time ? new Date(s.close_time).toLocaleString(language === "en" ? "en-US" : "ar-EG") : "--"}
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold text-ink">
                            {parseFloat(s.opening_amount || 0).toFixed(2)} ₪
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold text-teal">
                            {parseFloat(s.cash_sales || 0).toFixed(2)} ₪
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-ink">
                            {expected.toFixed(2)} ₪
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-ink">
                            {actual.toFixed(2)} ₪
                          </td>
                          <td className="px-5 py-4 font-mono font-bold">
                            {diff === 0 ? (
                              <span className="text-teal font-black">0.00 ₪</span>
                            ) : diff > 0 ? (
                              <span className="text-teal font-black">+{diff.toFixed(2)} ₪</span>
                            ) : (
                              <span className="text-coral font-black">{diff.toFixed(2)} ₪</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="bg-bg text-ink-soft px-3 py-1 rounded-full text-[12px] font-bold border border-mint-line">
                              {language === "en" ? "Closed" : "مغلقة"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: OPEN SHIFT FOR EMPLOYEE ───────────────────────────────── */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-mint-line animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-mint-line">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">🏪🔑</span>
                <h3 className="text-[18px] font-black text-primary">
                  {language === "en" ? "Open Shift for Employee" : "فتح وردية جديدة لموظف"}
                </h3>
              </div>
              <button
                onClick={() => setShowOpenModal(false)}
                className="w-8 h-8 rounded-full bg-bg hover:bg-mint-bg flex items-center justify-center font-bold text-ink-soft"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              {/* Employee Selection */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Select Employee / Cashier *" : "اختر الموظف / الكاشير *"}
                </label>
                <select
                  value={selectedStaffEmail || selectedStaffName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = staffList.find((s: any) => s.email === val || s.name === val);
                    if (found) {
                      setSelectedStaffName(found.name || found.username);
                      setSelectedStaffEmail(found.email || "");
                    } else if (val === "current_user") {
                      setSelectedStaffName(user.managerName || user.name || user.username || "المدير");
                      setSelectedStaffEmail(user.email || "");
                    } else {
                      setSelectedStaffName(val);
                      setSelectedStaffEmail("");
                    }
                  }}
                  required
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-teal"
                >
                  <option value="current_user">
                    {user?.managerName || user?.name || "المدير الحالي"} (أنا - المدير)
                  </option>
                  {staffList.map((s: any) => {
                    const isOpen = activeShifts.some(
                      (ashift: any) =>
                        ashift.cashier_email === s.email || ashift.cashier_name === s.name
                    );
                    return (
                      <option key={s.id || s.email} value={s.email || s.name} disabled={isOpen}>
                        {s.name || s.username} ({s.role || "موظف"}) {isOpen ? `[لديه وردية مفتوحة حالياً]` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Branch Selection */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Branch *" : "الفرع *"}
                </label>
                <select
                  value={selectedBranchName}
                  onChange={(e) => setSelectedBranchName(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-teal"
                >
                  <option value="الفرع الرئيسي">
                    {language === "en" ? "Main Branch" : "الفرع الرئيسي"}
                  </option>
                  {branchesList.map((b: any) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opening Cash Amount */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Opening Cash in Drawer (₪) *" : "مبلغ العهدة المستلم بالصندوق (₪) *"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  required
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 font-mono text-[18px] font-bold text-center outline-none focus:border-teal"
                />

                {/* Quick amount pills */}
                <div className="flex gap-2 mt-2">
                  {[100, 200, 300, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpeningAmount(amt.toString())}
                      className="flex-1 bg-bg hover:bg-mint-bg text-ink text-[12px] font-bold py-1.5 rounded-lg border border-mint-line transition-all"
                    >
                      {amt} ₪
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 bg-bg text-ink-soft hover:bg-mint-bg font-bold py-3 rounded-xl transition-all text-[14px]"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-black py-3 rounded-xl transition-all shadow-md text-[14px] disabled:opacity-50"
                >
                  {loading
                    ? language === "en"
                      ? "Opening..."
                      : "جاري الفتح..."
                    : language === "en"
                      ? "Confirm & Open"
                      : "تأكيد فتح الوردية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: CLOSE SPECIFIC SHIFT ─────────────────────────────────── */}
      {showCloseModal && shiftToClose && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-mint-line animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-mint-line">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">🔒💵</span>
                <h3 className="text-[18px] font-black text-primary">
                  {language === "en" ? "Close & Reconcile Shift" : "إغلاق الوردية وتسوية الصندوق"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setShiftToClose(null);
                }}
                className="w-8 h-8 rounded-full bg-bg hover:bg-mint-bg flex items-center justify-center font-bold text-ink-soft"
              >
                ✕
              </button>
            </div>

            {/* Shift Context Card */}
            <div className="bg-bg rounded-2xl p-4 border border-mint-line mb-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-bold text-ink">
                  👤 {shiftToClose.cashier_name}
                </span>
                <span className="text-[11px] font-bold bg-white px-2.5 py-1 rounded-full text-ink-soft border border-mint-line">
                  🏪 {shiftToClose.branch_name || "الفرع الرئيسي"}
                </span>
              </div>
              <div className="flex justify-between text-[12px] text-ink-soft">
                <span>⏱️ {language === "en" ? "Active Duration:" : "المدة المستمرة:"}</span>
                <span className="font-bold text-ink">{getDuration(shiftToClose.open_time)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-ink-soft">
                <span>💵 {language === "en" ? "Opening Amount:" : "مبلغ العهدة:"}</span>
                <span className="font-bold text-ink">
                  {parseFloat(shiftToClose.opening_amount || 0).toFixed(2)} ₪
                </span>
              </div>
              <div className="flex justify-between text-[12px] text-teal font-bold pt-1 border-t border-mint-line">
                <span>📊 {language === "en" ? "Cash Sales in Shift:" : "مبيعات الكاش:"}</span>
                <span className="font-mono">
                  +{(Number(shiftToClose.live_cash_sales) || 0).toFixed(2)} ₪
                </span>
              </div>
              <div className="flex justify-between text-[14px] text-primary font-black pt-1">
                <span>💰 {language === "en" ? "Expected in Drawer:" : "المتوقع بالصندوق:"}</span>
                <span className="font-mono text-[16px]">
                  {expectedForClose.toFixed(2)} ₪
                </span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Actual Cash Input */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en"
                    ? "Actual Counted Cash in Drawer (₪) *"
                    : "الكاش الفعلي المعدود في الصندوق (₪) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 font-mono text-[20px] font-black text-center outline-none focus:border-teal"
                />
              </div>

              {/* Live Match Pill */}
              {closeDifference !== null && (
                <div
                  className={`p-3 rounded-xl border text-[13px] font-bold flex items-center justify-between ${
                    closeDifference === 0
                      ? "bg-teal-pale border-teal text-teal"
                      : closeDifference > 0
                        ? "bg-amber-pale border-amber text-amber-dark"
                        : "bg-coral-pale border-coral text-coral"
                  }`}
                >
                  <span>
                    {closeDifference === 0
                      ? language === "en"
                        ? "✅ Exact Match - Perfect Balance"
                        : "✅ الصندوق مطابق تماماً دون أي فرق"
                      : closeDifference > 0
                        ? language === "en"
                          ? "⬆️ Cash Surplus in Register"
                          : "⬆️ يوجد فائض نقدي في الصندوق"
                        : language === "en"
                          ? "⚠️ Cash Shortage in Register"
                          : "⚠️ يوجد عجز نقدي في الصندوق"}
                  </span>
                  <span className="font-mono font-black text-[15px]">
                    {closeDifference === 0
                      ? "0.00"
                      : Math.abs(closeDifference).toFixed(2)}{" "}
                    ₪
                  </span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Closing Notes (Optional)" : "ملاحظات الإغلاق والتسوية (اختياري)"}
                </label>
                <input
                  type="text"
                  placeholder={
                    language === "en"
                      ? "e.g. End of evening shift"
                      : "مثال: تسليم الوردية المسائية دون ملاحظات"
                  }
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-teal"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCloseModal(false);
                    setShiftToClose(null);
                  }}
                  className="flex-1 bg-bg text-ink-soft hover:bg-mint-bg font-bold py-3 rounded-xl transition-all text-[14px]"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-black py-3 rounded-xl transition-all shadow-md text-[14px] disabled:opacity-50"
                >
                  {loading
                    ? language === "en"
                      ? "Closing..."
                      : "جاري الإغلاق..."
                    : language === "en"
                      ? "Confirm & Close Shift"
                      : "تأكيد إغلاق الوردية"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
