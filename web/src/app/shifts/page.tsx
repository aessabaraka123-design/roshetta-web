"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo, useCallback } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import {
  DENOMINATION_VALUES,
  DENOMINATION_LABELS_AR,
  DENOMINATION_LABELS_EN,
  calculateDenominationsTotal,
  evaluateDiscrepancy,
  buildShiftThermalReceipt,
  DenominationCounts,
  round2,
} from "@/lib/shifts/domain";
import { getWebAuthHeaders } from "@/lib/customers/transport";

const fetcher = (url: string) => fetch(url, { headers: getWebAuthHeaders() }).then((r) => r.json());

export default function ShiftsPage() {
  const user = useStore((s: any) => s.user);
  const language = useStore((state: any) => state.language);
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  const API_BASE = API_BASE_URL;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<any | null>(null);
  const [shiftToClose, setShiftToClose] = useState<any | null>(null);

  // Denomination Counting State
  const [useDenominations, setUseDenominations] = useState(false);
  const [denoms, setDenoms] = useState<DenominationCounts>({});

  // Blind Mode State
  const [blindMode, setBlindMode] = useState(true);

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
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "balanced" | "surplus" | "shortage">("all");

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

  // Cashier identification query params for active shift
  const currentShiftUrl = user
    ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/shifts/current?cashier_email=${encodeURIComponent(
        user.email || ""
      )}&cashier_name=${encodeURIComponent(
        user.managerName || user.name || user.username || ""
      )}`
    : null;

  // Fetch Active Open Shifts
  const { data: currentData, mutate: mutateCurrentShifts } = useSWR(
    currentShiftUrl,
    fetcher,
    { refreshInterval: 12000 }
  );

  // Fetch All Shifts Log
  const { data: shiftsData, mutate: mutateShifts } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/shifts` : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!user?.pharmacy_id) return;
    const socket = io(API_BASE || (typeof window !== "undefined" ? window.location.origin : ""), {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      socket.emit("join_pharmacy", user.pharmacy_id);
    });

    socket.on("sync_update", (data: any) => {
      if (data?.type === "shifts" || data?.type === "sales" || data?.type === "customers" || data?.type === "expenses") {
        mutateCurrentShifts();
        mutateShifts();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.pharmacy_id, API_BASE, mutateCurrentShifts, mutateShifts]);

  const shifts: any[] = shiftsData?.shifts || [];

  const isManager = Boolean(
    user && (user.role === "manager" || user.role === "admin" || user.role === "owner" || user.role === "branchManager")
  );

  const isMyShift = useCallback((s: any) => {
    if (!s || !user) return false;
    const uEmail = String(user.email || "").toLowerCase();
    const uName = String(user.managerName || user.name || user.username || "").trim().toLowerCase();
    const sEmail = String(s.cashier_email || "").toLowerCase();
    const sName = String(s.cashier_name || "").trim().toLowerCase();
    return Boolean((uEmail && sEmail && uEmail === sEmail) || (uName && sName && uName === sName));
  }, [user]);

  // Safe Time Formatter
  const formatShiftTime = (timeStr: any) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString(isEn ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Active shifts list
  const activeShifts: any[] = useMemo(() => {
    if (currentData?.active_shifts && Array.isArray(currentData.active_shifts)) {
      return currentData.active_shifts.filter(Boolean);
    }
    return shifts.filter((s: any) => s && s.status === "open");
  }, [currentData, shifts]);

  // For cashiers: only view own active shift. For manager: view all.
  const visibleActiveShifts = useMemo(() => {
    if (isManager) return activeShifts;
    return activeShifts.filter((s: any) => isMyShift(s));
  }, [activeShifts, isManager, isMyShift]);

  // Closed shifts
  const closedShifts: any[] = useMemo(() => {
    return shifts.filter((s: any) => s && s.status === "closed");
  }, [shifts]);

  const visibleClosedShifts = useMemo(() => {
    if (isManager) return closedShifts;
    return closedShifts.filter((s: any) => isMyShift(s));
  }, [closedShifts, isManager, isMyShift]);

  // Filtered History
  const filteredClosedShifts = useMemo(() => {
    return visibleClosedShifts.filter((s: any) => {
      const matchSearch =
        !historySearch ||
        String(s.cashier_name || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        String(s.cashier_email || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        String(s.notes || "").toLowerCase().includes(historySearch.toLowerCase());
      const matchBranch =
        !isManager ||
        historyBranchFilter === "all" ||
        (s.branch_name || "الفرع الرئيسي") === historyBranchFilter;

      if (!matchSearch || !matchBranch) return false;

      if (historyStatusFilter !== "all") {
        const expected = Number(s.expected_amount || 0);
        const actual = Number(s.closing_amount || 0);
        const evalRes = evaluateDiscrepancy(actual, expected);
        if (evalRes.status !== historyStatusFilter) return false;
      }

      return true;
    });
  }, [visibleClosedShifts, historySearch, historyBranchFilter, historyStatusFilter, isManager]);

  // Helper for Duration
  const getDuration = (openTime: string, closeTime?: string) => {
    if (!openTime) return "--";
    try {
      const startTime = new Date(openTime).getTime();
      if (isNaN(startTime)) return "--";
      const endTime = closeTime ? new Date(closeTime).getTime() : Date.now();
      const diff = Math.max(0, endTime - startTime);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      return isEn ? `${h}h ${m}m` : `${h}س ${m}د`;
    } catch {
      return "--";
    }
  };

  // Denomination counter updater
  const handleDenomChange = (key: keyof DenominationCounts, delta: number) => {
    const current = Number(denoms[key] || 0);
    const nextVal = Math.max(0, current + delta);
    const updated = { ...denoms, [key]: nextVal };
    setDenoms(updated);
    const total = calculateDenominationsTotal(updated);
    if (showCloseModal) {
      setClosingAmount(total > 0 ? total.toFixed(2) : "");
    } else if (showOpenModal) {
      setOpeningAmount(total > 0 ? total.toFixed(2) : "");
    }
  };

  // Open Shift Handler
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffName) {
      toast.error(isEn ? "Please specify employee name" : "يرجى تحديد اسم الموظف");
      return;
    }

    const cleanOpening = (openingAmount || "").toString().replace(/,/g, "").trim();
    const parsedOpening = parseFloat(cleanOpening);

    if (cleanOpening === "" || isNaN(parsedOpening) || parsedOpening < 0) {
      toast.error(isEn ? "Please enter a valid opening cash float" : "يرجى إدخال مبلغ عهدة نقدية صحيح");
      return;
    }

    const hasActiveShift = activeShifts.some(
      (ashift: any) =>
        (selectedStaffEmail && ashift.cashier_email && ashift.cashier_email.toLowerCase() === selectedStaffEmail.toLowerCase()) ||
        (selectedStaffName && ashift.cashier_name && ashift.cashier_name.trim().toLowerCase() === selectedStaffName.trim().toLowerCase())
    );

    if (hasActiveShift) {
      toast.error(
        isEn
          ? `Staff member (${selectedStaffName}) already has an open shift!`
          : `يوجد وردية مفتوحة بالفعل لهذا الموظف (${selectedStaffName})!`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pharmacies/${user?.pharmacy_id}/shifts/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getWebAuthHeaders() },
        body: JSON.stringify({
          id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          cashier_name: selectedStaffName,
          cashier_email: selectedStaffEmail || "",
          branch_name: selectedBranchName || "الفرع الرئيسي",
          opening_amount: parsedOpening,
          open_time: new Date().toISOString(),
        }),
      });
      const r = await res.json();
      if (r.success) {
        toast.success(
          isEn
            ? `Shift opened for ${selectedStaffName} successfully!`
            : `تم فتح وردية جديدة للموظف (${selectedStaffName}) بنجاح!`
        );
        setShowOpenModal(false);
        setOpeningAmount("");
        setSelectedStaffName("");
        setSelectedStaffEmail("");
        setDenoms({});
        mutateCurrentShifts();
        mutateShifts();
      } else {
        toast.error(r.error || (isEn ? "Failed to open shift" : "فشل فتح الوردية"));
      }
    } catch {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Open Close Modal
  const handleOpenCloseModal = (shift: any) => {
    if (!isManager && !isMyShift(shift)) {
      alert(isEn ? "You do not have permission to close another employee's shift." : "لا تملك صلاحية لإغلاق دورية موظف آخر. هذه الصلاحية للمدير فقط.");
      return;
    }
    setShiftToClose(shift);
    setClosingAmount("");
    setCloseNotes("");
    setDenoms({});
    setBlindMode(!isManager);
    setShowCloseModal(true);
  };

  // Close Shift Handler
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftToClose) return;

    const cleanClosing = (closingAmount || "").toString().replace(/,/g, "").trim();
    const parsedClosing = parseFloat(cleanClosing);

    if (cleanClosing === "" || isNaN(parsedClosing) || parsedClosing < 0) {
      toast.error(isEn ? "Please enter actual cash in drawer" : "يرجى إدخال المبلغ الفعلي في الصندوق");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/pharmacies/${user?.pharmacy_id}/shifts/${shiftToClose.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getWebAuthHeaders() },
        body: JSON.stringify({
          closing_amount: parsedClosing,
          notes: closeNotes,
          close_time: new Date().toISOString(),
          cash_count_breakdown: Object.keys(denoms).length > 0 ? denoms : null,
        }),
      });
      const r = await res.json();

      if (r.alreadyClosed) {
        toast(isEn ? "Shift already closed on another device ✓" : "تم إغلاق هذه الوردية بالفعل من جهاز آخر ✓", { icon: "ℹ️" });
        setShowCloseModal(false);
        setShiftToClose(null);
        mutateCurrentShifts();
        mutateShifts();
        return;
      }

      if (r.success) {
        const expectedFinal = r.expected_amount !== undefined ? r.expected_amount : expectedForClose;
        const diffEval = evaluateDiscrepancy(parsedClosing, expectedFinal);
        if (diffEval.status === "balanced") {
          toast.success(isEn ? "Shift closed — Register matches perfectly ✓" : "تم إغلاق الوردية — الصندوق مطابق تماماً ✓");
        } else if (diffEval.status === "surplus") {
          toast.success(isEn ? `Shift closed — Surplus: ₪${diffEval.difference.toFixed(2)}` : `تم إغلاق الوردية — فائض: ₪${diffEval.difference.toFixed(2)}`);
        } else {
          toast.error(isEn ? `Shift closed — Shortage: ₪${Math.abs(diffEval.difference).toFixed(2)}` : `تم إغلاق الوردية — عجز: ₪${Math.abs(diffEval.difference).toFixed(2)}`);
        }

        setShowCloseModal(false);
        setShiftToClose(null);
        setClosingAmount("");
        setCloseNotes("");
        setDenoms({});
        mutateCurrentShifts();
        mutateShifts();
      } else {
        toast.error(r.error || (isEn ? "Failed to close shift" : "فشل الإغلاق"));
      }
    } catch {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  // Expected Cash calculation
  const expectedForClose = useMemo(() => {
    if (!shiftToClose) return 0;
    if (shiftToClose.live_expected_amount !== undefined && shiftToClose.live_expected_amount !== null) {
      return Number(shiftToClose.live_expected_amount);
    }
    const opening = Number(shiftToClose.opening_amount || 0);
    const liveCash = Number(shiftToClose.live_cash_sales || shiftToClose.cash_sales || 0);
    const liveExp = Number(shiftToClose.live_cash_expenses ?? shiftToClose.live_expenses ?? 0);
    return round2(opening + liveCash - liveExp);
  }, [shiftToClose]);

  // Live Discrepancy Evaluation
  const closeDifferenceEval = useMemo(() => {
    const cleanClosing = (closingAmount || "").toString().replace(/,/g, "").trim();
    if (cleanClosing === "" || isNaN(Number(cleanClosing))) return null;
    return evaluateDiscrepancy(parseFloat(cleanClosing), expectedForClose);
  }, [closingAmount, expectedForClose]);

  // Print Thermal Slip for a Shift
  const handlePrintThermalSlip = (shift: any) => {
    const receiptText = buildShiftThermalReceipt(shift, user?.pharmacyName || "صيدلية روشيتة");
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) {
      toast.error(isEn ? "Pop-up blocked" : "تم حظر نافذة الطباعة المنبثقة");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>Thermal Shift Slip</title>
          <style>
            @page { size: 80mm auto; margin: 3mm; }
            body {
              font-family: 'Courier New', monospace, Tahoma;
              font-size: 12px;
              line-height: 1.4;
              margin: 0;
              padding: 6px;
              white-space: pre-wrap;
              color: #000;
              background: #fff;
            }
          </style>
        </head>
        <body>${receiptText}
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Total cash currently in active drawers
  const totalCashInActiveDrawers = useMemo(() => {
    return round2(
      activeShifts.reduce((sum, s) => {
        if (!s) return sum;
        const opening = Number(s.opening_amount || 0);
        const cashSales = Number(s.live_cash_sales || s.cash_sales || 0);
        const cashExp = Number(s.live_cash_expenses ?? s.live_expenses ?? 0);
        const exp = Number(s.live_expected_amount ?? (opening + cashSales - cashExp));
        return sum + (Number.isFinite(exp) ? exp : 0);
      }, 0)
    );
  }, [activeShifts]);

  return (
    <>
      <AppBar title={isEn ? "Shifts & Cash Drawers" : "إدارة الورديات والصناديق"} />
      <div className="p-4 sm:p-6 space-y-6 pb-24 max-w-7xl mx-auto">
        {/* Top Executive Stats Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary via-[#1e3a5f] to-teal p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-bold text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {isEn ? "Live Cash Drawer Control (ERP Standard)" : "الرقابة النقدية المباشرة (معايير ERP المعتمدة)"}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">
              {isEn ? "Pharmacy Shifts & Drawer Reconciliation 🏪" : "إدارة ورديات الصيدلية وتسوية الصناديق 🏪"}
            </h1>
            <p className="text-sm text-white/80 max-w-2xl">
              {isEn
                ? "Deterministic float tracking, multi-channel payment reconciliation, and dual-blind cash audits."
                : "ضبط دقيق للعهدة النقدية، تفصيل قنوات الدفع المتعددة، ومطابقة عمياء للصناديق دون ثغرات."}
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedStaffName(user?.managerName || user?.name || user?.username || "");
                setSelectedStaffEmail(user?.email || "");
                setOpeningAmount("");
                setDenoms({});
                setShowOpenModal(true);
              }}
              className="bg-white text-primary hover:bg-slate-100 px-5 py-3 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
            >
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              {isManager ? (isEn ? "+ Open Shift for Staff" : "+ فتح وردية لموظف") : (isEn ? "+ Open My Shift" : "+ فتح ورديتي")}
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-xs font-bold text-ink-soft mb-1">{isEn ? "Active Shifts" : "الورديات المفتوحة حالياً"}</div>
            <div className="text-2xl font-black font-mono text-primary flex items-baseline gap-1">
              {activeShifts.length}
              <span className="text-xs font-bold text-ink-soft font-sans">{isEn ? "active" : "وردية"}</span>
            </div>
            <div className="text-xs font-bold text-emerald-700 mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700"></span>
              {isEn ? "Real-time sync" : "تزامن فوري متصل"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-xs font-bold text-ink-soft mb-1">{isEn ? "Total Cash in Drawers" : "إجمالي نقدية الصناديق"}</div>
            <div className="text-2xl font-black font-mono text-emerald-800">
              ₪{totalCashInActiveDrawers.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-ink-soft mt-2">{isEn ? "Opening + cash sales - cash expenses" : "العهدة + كاش المبيعات - المصاريف"}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-xs font-bold text-ink-soft mb-1">{isEn ? "Closed Shifts Log" : "سجل الورديات المغلقة"}</div>
            <div className="text-2xl font-black font-mono text-primary">
              {closedShifts.length}
            </div>
            <div className="text-xs font-bold text-ink-soft mt-2">{isEn ? "Historical audited shifts" : "سجلات مطابقة سابقة"}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-mint-line shadow-sm">
            <div className="text-xs font-bold text-ink-soft mb-1">{isEn ? "Cashier Status" : "حالة الكاشير الحالي"}</div>
            <div className="text-lg font-black text-ink">
              {currentData?.shift ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-ping"></span>
                  {isEn ? "Shift Active" : "وردية مفتوحة 🟢"}
                </span>
              ) : (
                <span className="text-amber-700">{isEn ? "No Open Shift" : "لا توجد وردية مفتوحة"}</span>
              )}
            </div>
            <div className="text-xs font-bold text-ink-soft mt-2 truncate">
              {user?.managerName || user?.name || user?.email}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-mint-line gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "active" ? "border-primary text-primary" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <span>{isEn ? "Active Shifts & Cash Drawers" : "الورديات النشطة والصناديق"}</span>
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {visibleActiveShifts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "history" ? "border-primary text-primary" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            <span>{isEn ? "Shift History & Audit Log" : "سجل الورديات السابقة والمطابقات"}</span>
            <span className="bg-slate-100 text-ink-soft text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {closedShifts.length}
            </span>
          </button>
        </div>

        {/* TAB 1: ACTIVE SHIFTS */}
        {activeTab === "active" && (
          <div className="space-y-6">
            {/* If user has no active shift, display CTA banner */}
            {!currentData?.shift && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center text-2xl font-bold">
                    🚪
                  </div>
                  <div>
                    <h3 className="font-black text-amber-900 text-base">
                      {isEn ? "Your cash drawer is currently closed" : "صندوقك النقدي مغلق حالياً"}
                    </h3>
                    <p className="text-xs text-amber-800 font-medium">
                      {isEn
                        ? "Open your shift with your initial float to start recording cash sales accurately."
                        : "سجل عهدة البداية لفتح الصندوق وبدء تسجيل المبيعات النقدية بدقة ومطابقة آمنة."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStaffName(user?.managerName || user?.name || user?.username || "");
                    setSelectedStaffEmail(user?.email || "");
                    setOpeningAmount("");
                    setDenoms({});
                    setShowOpenModal(true);
                  }}
                  className="bg-amber-700 hover:bg-amber-800 text-white font-black px-6 py-3 rounded-2xl text-sm shadow-md transition-all active:scale-95"
                >
                  {isEn ? "Open My Shift Now" : "بدء وفتح ورديتي الآن"}
                </button>
              </div>
            )}

            {/* List of Visible Active Shifts */}
            {visibleActiveShifts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-mint-line space-y-3">
                <div className="text-4xl">🏪</div>
                <h3 className="text-lg font-black text-ink">
                  {isEn ? "No active shifts open right now" : "لا توجد أي ورديات مفتوحة حالياً"}
                </h3>
                <p className="text-sm text-ink-soft max-w-md mx-auto">
                  {isEn
                    ? "Any shift opened by cashiers across branches will appear here in real time."
                    : "أي وردية يتم فتحها بواسطة أي كاشير في أي فرع ستظهر هنا مباشرة بلحظتها مع تحديثات المبيعات."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleActiveShifts.map((shift: any) => {
                  if (!shift) return null;
                  const opening = Number(shift.opening_amount || 0);
                  const cashSales = Number(shift.live_cash_sales || shift.cash_sales || 0);
                  const cashExp = Number(shift.live_cash_expenses ?? shift.live_expenses ?? 0);
                  const expectedVal = Number(shift.live_expected_amount ?? (opening + cashSales - cashExp));
                  const expected = Number.isFinite(expectedVal) ? expectedVal : 0;
                  const digital = Number(shift.live_digital_sales || shift.digital_sales || 0);
                  const credit = Number(shift.live_credit_sales || shift.credit_sales || 0);
                  const totalShiftSales = round2((Number.isFinite(cashSales) ? cashSales : 0) + (Number.isFinite(digital) ? digital : 0) + (Number.isFinite(credit) ? credit : 0));
                  const cashierDisplay = String(shift.cashier_name || "كاشير");
                  const initialLetter = cashierDisplay.trim().charAt(0) || "ك";

                  const isMine = isMyShift(shift);

                  return (
                    <div
                      key={shift.id}
                      className="bg-white rounded-3xl border border-mint-line shadow-sm hover:shadow-md transition-all p-6 space-y-5"
                    >
                      {/* Shift Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-base">
                            {initialLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-ink text-base">{cashierDisplay}</h3>
                              {isMine && (
                                <span className="bg-teal/15 text-teal text-[11px] font-black px-2 py-0.5 rounded-full">
                                  {isEn ? "You" : "وردتك أنت"}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-bold text-ink-soft">
                              {shift.branch_name || "الفرع الرئيسي"}
                            </div>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse"></span>
                            {isEn ? "Active" : "نشطة"}
                          </span>
                          <div className="text-[11px] font-bold text-ink-soft mt-1">
                            {getDuration(shift.open_time)}
                          </div>
                        </div>
                      </div>

                      {/* Cash Drawer Reconciliation Grid */}
                      <div className="bg-bg rounded-2xl p-4 space-y-3 border border-mint-line/60">
                        <div className="text-xs font-black text-primary flex items-center justify-between">
                          <span>💵 {isEn ? "Cash Drawer Live Balance" : "نقدية الصندوق (الدرج الفعلي)"}</span>
                          <span className="text-ink-soft font-mono text-[11px]">
                            {formatShiftTime(shift.open_time)}
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-mint-line">
                            <div className="text-ink-soft font-bold text-[11px]">{isEn ? "Float" : "العهدة"}</div>
                            <div className="font-black font-mono text-ink mt-0.5">₪{opening.toFixed(2)}</div>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-mint-line">
                            <div className="text-emerald-800 font-bold text-[11px]">{isEn ? "+ Cash" : "+ كاش"}</div>
                            <div className="font-black font-mono text-emerald-800 mt-0.5">₪{cashSales.toFixed(2)}</div>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-mint-line">
                            <div className="text-coral font-bold text-[11px]">{isEn ? "- Expenses" : "- مصاريف"}</div>
                            <div className="font-black font-mono text-coral mt-0.5">₪{cashExp.toFixed(2)}</div>
                          </div>

                          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                            <div className="text-emerald-900 font-black text-[11px]">{isEn ? "= Expected" : "= المتوقع"}</div>
                            <div className="font-black font-mono text-emerald-900 mt-0.5">₪{expected.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Multi-Channel Digital Breakdown */}
                      <div className="space-y-1.5 text-xs font-bold text-ink-soft">
                        <div className="flex justify-between items-center text-ink font-bold pb-1 border-b border-mint-line/40">
                          <span>🌐 {isEn ? "Non-Cash Tenders (Outside Drawer)" : "المدفوعات الإلكترونية والذمم (خارج الصندوق)"}</span>
                          <span className="font-mono font-black text-primary">₪{round2(digital + credit).toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                          <div className="flex justify-between bg-white p-2 rounded-lg border border-mint-line">
                            <span>💳 {isEn ? "Card" : "بطاقة"}:</span>
                            <span className="font-mono font-bold text-ink">₪{Number(shift.live_card_sales || shift.card_sales || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between bg-white p-2 rounded-lg border border-mint-line">
                            <span>📱 {isEn ? "Jawwal" : "جوال باي"}:</span>
                            <span className="font-mono font-bold text-ink">₪{Number(shift.live_jawwal_sales || shift.jawwal_sales || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between bg-white p-2 rounded-lg border border-mint-line">
                            <span>💳 {isEn ? "PalPay" : "بال باي"}:</span>
                            <span className="font-mono font-bold text-ink">₪{Number(shift.live_palpay_sales || shift.palpay_sales || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between bg-white p-2 rounded-lg border border-mint-line">
                            <span>🏦 {isEn ? "Bank" : "تحويل"}:</span>
                            <span className="font-mono font-bold text-ink">₪{Number(shift.live_bank_sales || shift.bank_sales || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between bg-white p-2 rounded-lg border border-mint-line">
                            <span>📝 {isEn ? "Credit" : "ذمم"}:</span>
                            <span className="font-mono font-bold text-ink">₪{credit.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between bg-teal/10 p-2 rounded-lg border border-teal/20 text-teal">
                            <span>📊 {isEn ? "Total Sales" : "الإجمالي"}:</span>
                            <span className="font-mono font-black">₪{totalShiftSales.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-mint-line">
                        <button
                          onClick={() => handlePrintThermalSlip(shift)}
                          className="px-4 py-2.5 rounded-xl border border-mint-line text-ink-soft hover:text-ink hover:bg-bg font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                          🖨️ {isEn ? "Thermal Preview" : "معاينة الإيصال"}
                        </button>

                        {(isManager || isMine) && (
                          <button
                            onClick={() => handleOpenCloseModal(shift)}
                            className="flex-1 bg-coral hover:bg-coral/90 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-md shadow-coral/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                          >
                            <span>🏁 {isEn ? "Close Shift & Count Cash" : "إغلاق الوردية وتسوية الصندوق"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHIFT HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={isEn ? "Search by cashier name or notes..." : "بحث باسم الكاشير أو الملاحظات..."}
                  className="bg-bg border border-mint-line rounded-xl px-4 py-2 text-xs font-bold text-ink focus:outline-none focus:border-primary flex-1"
                />

                {isManager && branchesList.length > 0 && (
                  <select
                    value={historyBranchFilter}
                    onChange={(e) => setHistoryBranchFilter(e.target.value)}
                    className="bg-bg border border-mint-line rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none focus:border-primary"
                  >
                    <option value="all">{isEn ? "All Branches" : "كل الفروع"}</option>
                    {branchesList.map((b: any) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                  className="bg-bg border border-mint-line rounded-xl px-3 py-2 text-xs font-bold text-primary focus:outline-none focus:border-primary"
                >
                  <option value="all">{isEn ? "All Statuses" : "كل حالات المطابقة"}</option>
                  <option value="balanced">{isEn ? "Balanced Only ✓" : "مطابق فقط ✓"}</option>
                  <option value="surplus">{isEn ? "Surplus Only (+)" : "فائض فقط (+)"}</option>
                  <option value="shortage">{isEn ? "Shortage Only (-)" : "عجز فقط (-)"}</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            {filteredClosedShifts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-mint-line space-y-2">
                <div className="text-3xl">📁</div>
                <h3 className="text-base font-black text-ink">
                  {isEn ? "No closed shifts match the selected filters" : "لا توجد أي ورديات مغلقة مطابقة للفلاتر"}
                </h3>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-mint-line shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-bg border-b border-mint-line text-ink-soft font-black">
                      <tr>
                        <th className="p-3.5 text-start">#</th>
                        <th className="p-3.5 text-start">{isEn ? "Cashier & Branch" : "الكاشير والفرع"}</th>
                        <th className="p-3.5 text-start">{isEn ? "Times & Duration" : "التوقيت والمدة"}</th>
                        <th className="p-3.5 text-start">{isEn ? "Float & Sales" : "العهدة والمبيعات"}</th>
                        <th className="p-3.5 text-start">{isEn ? "Expected / Actual" : "المتوقع / الفعلي"}</th>
                        <th className="p-3.5 text-start">{isEn ? "Discrepancy" : "الفارق والمطابقة"}</th>
                        <th className="p-3.5 text-center">{isEn ? "Actions" : "الإجراءات"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mint-line/60">
                      {filteredClosedShifts.map((s: any, idx: number) => {
                        const opening = Number(s.opening_amount || 0);
                        const expected = Number(s.expected_amount || 0);
                        const actual = Number(s.closing_amount || 0);
                        const disc = evaluateDiscrepancy(actual, expected);

                        return (
                          <tr key={s.id} className="hover:bg-bg/50 transition-colors">
                            <td className="p-3.5 font-mono text-ink-soft font-bold">{idx + 1}</td>
                            <td className="p-3.5">
                              <div className="font-black text-ink">{s.cashier_name || "كاشير"}</div>
                              <div className="text-[11px] font-bold text-ink-soft">{s.branch_name || "الفرع الرئيسي"}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-ink">
                                {s.open_time ? new Date(s.open_time).toLocaleDateString(isEn ? "en-US" : "ar-EG") : "-"}
                              </div>
                              <div className="text-[11px] font-mono text-ink-soft">
                                {getDuration(s.open_time, s.close_time)}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-ink">عهدة: ₪{opening.toFixed(2)}</div>
                              <div className="font-mono text-[11px] text-teal font-black">
                                مبيعات: ₪{Number(s.cash_sales || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="p-3.5 font-mono">
                              <div className="text-ink-soft font-bold">متوقع: ₪{expected.toFixed(2)}</div>
                              <div className="text-ink font-black">فعلي: ₪{actual.toFixed(2)}</div>
                            </td>
                            <td className="p-3.5">
                              <span
                                className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black border"
                                style={{
                                  backgroundColor: `${disc.badgeColor}15`,
                                  borderColor: `${disc.badgeColor}40`,
                                  color: disc.badgeColor,
                                }}
                              >
                                {isEn ? disc.statusTextEn : disc.statusTextAr}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedShiftForDetail(s);
                                    setShowDetailModal(true);
                                  }}
                                  className="p-1.5 rounded-lg bg-bg text-primary hover:bg-primary/10 font-bold transition-all text-xs"
                                  title={isEn ? "View Details" : "عرض التفاصيل"}
                                >
                                  🔍
                                </button>
                                <button
                                  onClick={() => handlePrintThermalSlip(s)}
                                  className="p-1.5 rounded-lg bg-bg text-teal hover:bg-teal/10 font-bold transition-all text-xs"
                                  title={isEn ? "Print Receipt" : "طباعة إيصال"}
                                >
                                  🖨️
                                </button>
                              </div>
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
        )}

        {/* MODAL 1: OPEN SHIFT MODAL */}
        {showOpenModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-mint-line space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-mint-line">
                <h3 className="font-black text-lg text-ink flex items-center gap-2">
                  <span>🚪</span>
                  <span>{isEn ? "Open New Cashier Shift" : "فتح وردية عمل جديدة واستلام الصندوق"}</span>
                </h3>
                <button
                  onClick={() => setShowOpenModal(false)}
                  className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-4">
                {/* Employee Selection */}
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    {isEn ? "Cashier / Staff Member *" : "الموظف / الكاشير المستلم *"}
                  </label>
                  {isManager && staffList.length > 0 ? (
                    <select
                      value={selectedStaffEmail}
                      onChange={(e) => {
                        const email = e.target.value;
                        setSelectedStaffEmail(email);
                        const matched = staffList.find((st: any) => st.email === email);
                        if (matched) {
                          setSelectedStaffName(matched.name || "");
                          if (matched.branch) setSelectedBranchName(matched.branch);
                        }
                      }}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-xs font-bold text-ink focus:outline-none focus:border-primary"
                    >
                      <option value="">{isEn ? "-- Select Staff --" : "-- اختر الموظف --"}</option>
                      {staffList.map((st: any) => (
                        <option key={st.id || st.email} value={st.email}>
                          {st.name} ({st.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={selectedStaffName}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-xs font-bold text-ink opacity-80"
                    />
                  )}
                </div>

                {/* Branch Selection */}
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    {isEn ? "Pharmacy Branch *" : "الفرع المستلم فيه الصندوق *"}
                  </label>
                  {isManager && branchesList.length > 0 ? (
                    <select
                      value={selectedBranchName}
                      onChange={(e) => setSelectedBranchName(e.target.value)}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-xs font-bold text-ink focus:outline-none focus:border-primary"
                    >
                      {branchesList.map((b: any) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={selectedBranchName}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-xs font-bold text-ink opacity-80"
                    />
                  )}
                </div>

                {/* Opening Cash Float */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-ink">
                      {isEn ? "Opening Cash Float in Register (₪) *" : "عهدة البداية المستلمة في الصندوق (₪) *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(!useDenominations)}
                      className="text-xs font-bold text-teal hover:underline flex items-center gap-1"
                    >
                      {useDenominations ? (isEn ? "Manual input" : "إدخال يدوي") : (isEn ? "🧮 Denomination counter" : "🧮 حاسبة الفئات")}
                    </button>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-sm font-black font-mono text-emerald-800 focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Optional Interactive Denomination Counter */}
                {useDenominations && (
                  <div className="bg-bg p-3.5 rounded-2xl border border-mint-line space-y-2.5">
                    <div className="text-xs font-black text-ink-soft">
                      {isEn ? "Denomination Breakdown Counter" : "عد الفئات النقدية المستلمة في الدرج"}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(DENOMINATION_VALUES) as (keyof DenominationCounts)[]).map((key) => {
                        const count = Number(denoms[key] || 0);
                        const label = isEn ? DENOMINATION_LABELS_EN[key] : DENOMINATION_LABELS_AR[key];
                        return (
                          <div key={key} className="bg-white p-2 rounded-xl border border-mint-line text-center">
                            <div className="text-[11px] font-bold text-ink-soft">{label}</div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => handleDenomChange(key, -1)}
                                className="w-6 h-6 rounded-md bg-bg text-ink font-bold hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-xs min-w-5">{count}</span>
                              <button
                                type="button"
                                onClick={() => handleDenomChange(key, 1)}
                                className="w-6 h-6 rounded-md bg-teal text-white font-bold hover:bg-teal/90"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOpenModal(false)}
                    className="flex-1 py-3 rounded-xl bg-bg text-ink font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    {isEn ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs shadow-md shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (isEn ? "Opening..." : "جاري الفتح...") : (isEn ? "Confirm & Open Shift" : "تأكيد وفتح الوردية")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CLOSE SHIFT & RECONCILIATION MODAL */}
        {showCloseModal && shiftToClose && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-mint-line space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-mint-line">
                <div>
                  <h3 className="font-black text-lg text-ink flex items-center gap-2">
                    <span>🏁</span>
                    <span>{isEn ? "Close Shift & Drawer Reconciliation" : "إغلاق الوردية وتسوية الصندوق"}</span>
                  </h3>
                  <div className="text-xs font-bold text-ink-soft">
                    {shiftToClose.cashier_name} — {shiftToClose.branch_name || "الفرع الرئيسي"}
                  </div>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Blind Mode Toggle / Summary Display */}
              <div className="bg-bg rounded-2xl p-4 border border-mint-line space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary">
                    {isEn ? "Book Expected Cash" : "المتوقع وجوده دفترياً بالدرج"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBlindMode(!blindMode)}
                    className="text-xs font-bold text-teal hover:underline"
                  >
                    {blindMode ? (isEn ? "👁️ Reveal Expected" : "👁️ كشف المتوقع") : (isEn ? "🔒 Blind Mode" : "🔒 مطابقة عمياء")}
                  </button>
                </div>

                <div className="font-mono text-2xl font-black text-emerald-800">
                  {blindMode ? "₪ ***.**" : `₪${expectedForClose.toFixed(2)}`}
                </div>

                {!blindMode && (
                  <div className="text-[11px] font-bold text-ink-soft grid grid-cols-3 gap-1 pt-1 border-t border-mint-line/50">
                    <div>عهدة: ₪{Number(shiftToClose.opening_amount || 0).toFixed(2)}</div>
                    <div>+ كاش: ₪{Number(shiftToClose.live_cash_sales || shiftToClose.cash_sales || 0).toFixed(2)}</div>
                    <div>- مصاريف: ₪{Number(shiftToClose.live_cash_expenses ?? shiftToClose.live_expenses ?? 0).toFixed(2)}</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleCloseShift} className="space-y-4">
                {/* Counted Cash */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-ink">
                      {isEn ? "Actual Physical Cash Counted (₪) *" : "المبلغ الفعلي المعدود في الصندوق (₪) *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseDenominations(!useDenominations)}
                      className="text-xs font-bold text-teal hover:underline flex items-center gap-1"
                    >
                      {useDenominations ? (isEn ? "Manual input" : "إدخال يدوي") : (isEn ? "🧮 Denomination counter" : "🧮 حاسبة الفئات")}
                    </button>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-base font-black font-mono text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Denomination Counter for Closing */}
                {useDenominations && (
                  <div className="bg-bg p-3.5 rounded-2xl border border-mint-line space-y-2.5">
                    <div className="text-xs font-black text-ink-soft">
                      {isEn ? "Physical Count Denomination Breakdown" : "تفصيل الفئات النقدية المعدودة في الدرج"}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(DENOMINATION_VALUES) as (keyof DenominationCounts)[]).map((key) => {
                        const count = Number(denoms[key] || 0);
                        const label = isEn ? DENOMINATION_LABELS_EN[key] : DENOMINATION_LABELS_AR[key];
                        return (
                          <div key={key} className="bg-white p-2 rounded-xl border border-mint-line text-center">
                            <div className="text-[11px] font-bold text-ink-soft">{label}</div>
                            <div className="flex items-center justify-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => handleDenomChange(key, -1)}
                                className="w-6 h-6 rounded-md bg-bg text-ink font-bold hover:bg-slate-200"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-xs min-w-5">{count}</span>
                              <button
                                type="button"
                                onClick={() => handleDenomChange(key, 1)}
                                className="w-6 h-6 rounded-md bg-teal text-white font-bold hover:bg-teal/90"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live Discrepancy Evaluation Badge */}
                {closeDifferenceEval && (
                  <div
                    className="p-3.5 rounded-2xl border flex items-center justify-between text-xs font-black"
                    style={{
                      backgroundColor: `${closeDifferenceEval.badgeColor}15`,
                      borderColor: `${closeDifferenceEval.badgeColor}40`,
                      color: closeDifferenceEval.badgeColor,
                    }}
                  >
                    <span>{isEn ? "Reconciliation Result:" : "نتيجة المطابقة والتسوية:"}</span>
                    <span className="text-sm">{isEn ? closeDifferenceEval.statusTextEn : closeDifferenceEval.statusTextAr}</span>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-black text-ink mb-1.5">
                    {isEn ? "Shift Handover & Reconciliation Notes" : "ملاحظات الإغلاق وتسليم العهدة"}
                  </label>
                  <textarea
                    rows={2}
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder={isEn ? "Optional notes or reason for discrepancy..." : "ملاحظات اختيارية أو تبرير الفارق إن وجد..."}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-xs font-bold text-ink focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="flex-1 py-3 rounded-xl bg-bg text-ink font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    {isEn ? "Cancel" : "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-coral hover:bg-coral/90 text-white font-black text-xs shadow-md shadow-coral/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (isEn ? "Closing..." : "جاري الإغلاق...") : (isEn ? "Confirm & Close Shift" : "تأكيد وإغلاق الوردية")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: SHIFT AUDIT DETAIL MODAL */}
        {showDetailModal && selectedShiftForDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-mint-line space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-mint-line">
                <div>
                  <h3 className="font-black text-lg text-ink">
                    {isEn ? "Shift Audit Statement" : "السجل المحاسبي التفصيلي للوردية"}
                  </h3>
                  <div className="text-xs font-bold text-ink-soft">
                    #{String(selectedShiftForDetail.id).substring(0, 8)} — {selectedShiftForDetail.cashier_name}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-full bg-bg text-ink-soft hover:text-ink font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-bg p-3.5 rounded-2xl border border-mint-line">
                  <div>
                    <span className="text-ink-soft font-bold">الفرع: </span>
                    <span className="font-black text-ink">{selectedShiftForDetail.branch_name || "الفرع الرئيسي"}</span>
                  </div>
                  <div>
                    <span className="text-ink-soft font-bold">المدة: </span>
                    <span className="font-black text-ink">{getDuration(selectedShiftForDetail.open_time, selectedShiftForDetail.close_time)}</span>
                  </div>
                  <div>
                    <span className="text-ink-soft font-bold">وقت الفتح: </span>
                    <span className="font-mono text-ink font-bold">
                      {selectedShiftForDetail.open_time ? new Date(selectedShiftForDetail.open_time).toLocaleString(isEn ? "en-US" : "ar-EG") : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-soft font-bold">وقت الإغلاق: </span>
                    <span className="font-mono text-ink font-bold">
                      {selectedShiftForDetail.close_time ? new Date(selectedShiftForDetail.close_time).toLocaleString(isEn ? "en-US" : "ar-EG") : "-"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-mint-line space-y-2">
                  <div className="font-black text-primary text-xs pb-1 border-b border-mint-line">
                    التسوية النقدية للصندوق
                  </div>
                  <div className="flex justify-between py-1 border-b border-mint-line/40">
                    <span className="text-ink-soft">العهدة الافتتاحية:</span>
                    <span className="font-mono font-bold text-ink">₪{Number(selectedShiftForDetail.opening_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-mint-line/40">
                    <span className="text-emerald-800 font-bold">+ مبيعات الكاش:</span>
                    <span className="font-mono font-bold text-emerald-800">₪{Number(selectedShiftForDetail.cash_sales || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-mint-line/40">
                    <span className="text-coral font-bold">- مصروفات الدرج:</span>
                    <span className="font-mono font-bold text-coral">₪{Number(selectedShiftForDetail.expenses_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-mint-line/40 bg-bg px-2 rounded-lg">
                    <span className="font-black text-primary">المتوقع بالصندوق:</span>
                    <span className="font-mono font-black text-primary">₪{Number(selectedShiftForDetail.expected_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-mint-line/40 bg-bg px-2 rounded-lg">
                    <span className="font-black text-ink">المبلغ الفعلي المعدود:</span>
                    <span className="font-mono font-black text-ink">₪{Number(selectedShiftForDetail.closing_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="font-black">حالة المطابقة:</span>
                    <span>
                      {(() => {
                        const disc = evaluateDiscrepancy(
                          Number(selectedShiftForDetail.closing_amount || 0),
                          Number(selectedShiftForDetail.expected_amount || 0)
                        );
                        return (
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-black border"
                            style={{
                              backgroundColor: `${disc.badgeColor}15`,
                              borderColor: `${disc.badgeColor}40`,
                              color: disc.badgeColor,
                            }}
                          >
                            {isEn ? disc.statusTextEn : disc.statusTextAr}
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                </div>

                {selectedShiftForDetail.notes && (
                  <div className="bg-bg p-3 rounded-xl border border-mint-line text-xs">
                    <div className="font-black text-ink mb-1">ملاحظات التسوية:</div>
                    <div className="text-ink-soft">{selectedShiftForDetail.notes}</div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => handlePrintThermalSlip(selectedShiftForDetail)}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  🖨️ {isEn ? "Print Thermal Slip" : "طباعة إيصال التسوية"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="py-3 px-6 rounded-xl bg-bg text-ink font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  {isEn ? "Close" : "إغلاق"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
