"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import AppBar from "@/components/AppBar";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BranchManager() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && (localStorage.getItem("roshetta_user") || localStorage.getItem("roshetta-web-storage"));
      if (!hasStored) {
        router.push("/login");
      }
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<
    "shift" | "stock" | "approvals" | "drugs"
  >("shift");

  const API_BASE = API_BASE_URL;

  // ─── Shift Management State ───────────────────────────────────────────────
  const [cashInDrawer, setCashInDrawer] = useState("");

  const { data: shiftData } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/shift/current` : null,
    fetcher,
    { refreshInterval: 30000 },
  );

  const systemCash = shiftData?.expectedCash || 0;
  const cashSalesCount = shiftData?.cashSalesCount || 0;

  // ─── Live Inventory for Damage Logging ────────────────────────────────────
  const { data: invData, mutate: mutateInventory } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/inventory` : null,
    fetcher,
  );
  const inventoryList: any[] = invData?.inventory || [];

  // ─── Live Stock Adjustments & Scrap ───────────────────────────────────────
  const {
    data: adjData,
    mutate: mutateAdjustments,
    isLoading: loadingAdjustments,
  } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/stock-adjustments` : null,
    fetcher,
    { refreshInterval: 15000 },
  );
  const stockAdjustments: any[] = adjData?.adjustments || [];

  // ─── Live Controlled Drugs Log ────────────────────────────────────────────
  const { data: controlledData, isLoading: loadingControlled } = useSWR(
    user ? `${API_BASE}/api/pharmacies/${user.pharmacy_id}/controlled-drugs-log` : null,
    fetcher,
    { refreshInterval: 20000 },
  );
  const controlledDrugsList: any[] = controlledData?.log || [];

  // Filter & Search states
  const [stockSearch, setStockSearch] = useState("");
  const [stockReasonFilter, setStockReasonFilter] = useState("all");
  const [searchDrug, setSearchDrug] = useState("");

  // Modal State for Logging Damaged / Expired Drug
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedDrugId, setSelectedDrugId] = useState("");
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
  const [damageReason, setDamageReason] = useState("كسر في العبوة");
  const [damageQty, setDamageQty] = useState<number | string>(1);
  const [damageNotes, setDamageNotes] = useState("");
  const [isSubmittingDamage, setIsSubmittingDamage] = useState(false);

  // Selected drug details
  const selectedDrug = useMemo(() => {
    return inventoryList.find((item: any) => String(item.id) === String(selectedDrugId));
  }, [inventoryList, selectedDrugId]);

  const selectedDrugCost = useMemo(() => {
    if (!selectedDrug) return 0;
    const cost = Number(selectedDrug.cost);
    if (cost > 0) return cost;
    return Number(selectedDrug.price || 0) * 0.7; // Standard estimation if cost not set
  }, [selectedDrug]);

  const totalCalculatedLoss = useMemo(() => {
    const qty = Number(damageQty) || 0;
    return parseFloat((qty * selectedDrugCost).toFixed(2));
  }, [damageQty, selectedDrugCost]);

  // Filtered adjustments
  const filteredAdjustments = useMemo(() => {
    return stockAdjustments.filter((adj: any) => {
      const matchSearch =
        !stockSearch ||
        (adj.drug_name || "").toLowerCase().includes(stockSearch.toLowerCase()) ||
        (adj.id || "").toLowerCase().includes(stockSearch.toLowerCase());
      const matchReason =
        stockReasonFilter === "all" ||
        (adj.reason || "").includes(stockReasonFilter);
      return matchSearch && matchReason;
    });
  }, [stockAdjustments, stockSearch, stockReasonFilter]);

  // Adjustments summary stats
  const scrapStats = useMemo(() => {
    const totalCount = stockAdjustments.length;
    const totalQty = stockAdjustments.reduce(
      (sum: number, a: any) => sum + (Number(a.qty) || 0),
      0
    );
    const totalLoss = stockAdjustments.reduce(
      (sum: number, a: any) => sum + (Number(a.loss_value) || 0),
      0
    );
    return { totalCount, totalQty, totalLoss };
  }, [stockAdjustments]);

  // Filtered controlled drugs
  const filteredControlledDrugs = useMemo(() => {
    return controlledDrugsList.filter((item: any) => {
      if (!searchDrug) return true;
      const q = searchDrug.toLowerCase();
      return (
        (item.patient || "").toLowerCase().includes(q) ||
        (item.doctor || "").toLowerCase().includes(q) ||
        (item.drug || "").toLowerCase().includes(q)
      );
    });
  }, [controlledDrugsList, searchDrug]);

  // Shift Close Handler
  const handleCloseShift = () => {
    if (!cashInDrawer) {
      toast.error(
        language === "en"
          ? "Please enter the actual cash in the drawer"
          : "الرجاء إدخال الكاش الفعلي في الدرج"
      );
      return;
    }
    const actual = parseFloat(cashInDrawer);
    const difference = actual - systemCash;
    if (difference === 0) {
      toast.success(
        language === "en"
          ? "✅ Drawer matches perfectly. Shift closed successfully!"
          : "✅ الصندوق مطابق تماماً. تم تقفيل الوردية بنجاح!"
      );
    } else if (difference > 0) {
      toast.success(
        language === "en"
          ? `Shift closed with an excess of ${difference.toFixed(2)} ₪`
          : `تم تقفيل الوردية بزيادة قدرها ${difference.toFixed(2)} ₪`
      );
    } else {
      toast.error(
        language === "en"
          ? `⚠️ Shift closed with a shortage of ${Math.abs(difference).toFixed(2)} ₪`
          : `⚠️ تم تقفيل الوردية بعجز قدره ${Math.abs(difference).toFixed(2)} ₪`
      );
    }
  };

  // Submit Damaged Drug to ERP backend
  const handleSubmitDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrugId) {
      toast.error(
        language === "en" ? "Please select a medicine" : "يرجى اختيار الدواء"
      );
      return;
    }
    const qty = Number(damageQty);
    if (!qty || qty <= 0) {
      toast.error(
        language === "en" ? "Enter a valid quantity" : "أدخل كمية صحيحة أكبر من الصفر"
      );
      return;
    }
    if (selectedDrug && qty > Number(selectedDrug.qty || 0)) {
      toast.error(
        language === "en"
          ? `Quantity cannot exceed available stock (${selectedDrug.qty})`
          : `الكمية المدخلة (${qty}) تتجاوز الرصيد المتوفر في المخزون (${selectedDrug.qty})`
      );
      return;
    }

    setIsSubmittingDamage(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${user.pharmacy_id}/stock-adjustments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            drug_id: selectedDrugId,
            reason: damageReason + (damageNotes ? ` - ${damageNotes}` : ""),
            qty,
            recorded_by: user.name || user.managerName || "المدير",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record adjustment");
      }

      toast.success(
        language === "en"
          ? `✅ Successfully recorded damage: ${qty} units deducted (Loss: ${data.adjustment?.loss_value || totalCalculatedLoss} ₪)`
          : `✅ تم تسجيل إتلاف ${qty} علبة وخصمها من المخزون بنجاح (خسارة: ${data.adjustment?.loss_value || totalCalculatedLoss} ₪)`
      );

      // Refresh data
      mutateAdjustments();
      mutateInventory();

      // Reset & close
      setShowDamageModal(false);
      setSelectedDrugId("");
      setMedicineSearchQuery("");
      setDamageQty(1);
      setDamageNotes("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (language === "en" ? "Failed to save" : "فشل حفظ العملية"));
    } finally {
      setIsSubmittingDamage(false);
    }
  };

  // Approvals Log State
  const approvalsLog = [
    {
      id: "APP-501",
      action: language === "en" ? "Cancel Invoice" : "إلغاء فاتورة",
      details:
        language === "en"
          ? "Cancel invoice worth 120 ₪"
          : "إلغاء فاتورة بقيمة 120 ₪",
      date: "2026-08-10 10:30 AM",
      cashier: language === "en" ? "Pharmacist Ahmed" : "صيدلي أحمد",
      status: "approved",
    },
    {
      id: "APP-502",
      action: language === "en" ? "Special Discount" : "خصم استثنائي",
      details:
        language === "en"
          ? "15% discount for loyal customer"
          : "خصم 15% لعميل دائم",
      date: "2026-08-09 04:15 PM",
      cashier: language === "en" ? "Pharmacist Sarah" : "صيدلي سارة",
      status: "approved",
    },
  ];

  if (!user) return null;

  return (
    <div className="w-full pb-10">
      <AppBar />

      {/* Header Banner */}
      <div className="mb-6 flex justify-between items-center bg-gradient-to-l from-primary to-teal p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-[24px] font-black mb-1">
            {language === "en"
              ? "Pharmacy Operations & Scrap Manager 💼"
              : "إدارة العمليات، الجرد والتوالف 💼"}
          </h1>
          <p className="text-[15px] font-medium opacity-90">
            {language === "en"
              ? "Shift audit, damaged goods deduction, accounting waste, and controlled drug logs"
              : "إغلاق الوردية، تسجيل التوالف والخصم الآلي، قيود الهدر المحاسبي، ودفتر السموم المعتمد"}
          </p>
        </div>
        <div className="relative z-10 text-start bg-white/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="text-[11px] font-bold opacity-80">
            {language === "en" ? "Current Responsible" : "المسؤول الحالي"}
          </div>
          <div className="text-[16px] font-black">
            {user?.managerName ||
              user?.name ||
              user?.cashierName ||
              (language === "en" ? "Manager" : "المدير المسؤول")}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-mint-line pb-4 overflow-x-auto hide-scrollbar">
        {[
          {
            id: "shift",
            label: language === "en" ? "Close Drawer 💵" : "تقفيل الصندوق والوردية 💵",
          },
          {
            id: "stock",
            label: language === "en" ? "Scrap & Stock Adjustments 📦" : "الجرد والتوالف والهدر 📦",
          },
          {
            id: "approvals",
            label: language === "en" ? "Audit & Approvals 🛡️" : "طلبات الموافقة والرقابة 🛡️",
          },
          {
            id: "drugs",
            label: language === "en" ? "Controlled Drugs Register 💊" : "دفتر السموم والمخدرات 💊",
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-bg text-ink-soft hover:bg-mint-bg hover:text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: SHIFT / CASH DRAWER ────────────────────────────────────── */}
      {activeTab === "shift" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
            <h2 className="text-[18px] font-black text-primary mb-4">
              {language === "en" ? "End of Shift" : "إنهاء الوردية وجرد الصندوق (End of Shift)"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-bg rounded-2xl p-5 border border-mint-line">
                <div className="text-[14px] text-ink-soft font-bold mb-1">
                  {language === "en"
                    ? "System Cash Total"
                    : "المبيعات النقدية المسجلة في النظام"}
                </div>
                {shiftData ? (
                  <>
                    <div className="font-mono text-[32px] font-black text-ink">
                      {systemCash.toFixed(2)} ₪
                    </div>
                    <div className="text-[12px] font-bold mt-2 flex items-center gap-1 text-teal bg-teal-pale w-fit px-2 py-0.5 rounded-full">
                      {language === "en"
                        ? `Total ${cashSalesCount} cash receipts in this shift`
                        : `إجمالي ${cashSalesCount} إيصال كاش خلال الوردية`}
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[28px] font-black text-ink-soft animate-pulse">
                    {language === "en" ? "Loading..." : "جاري التحميل..."}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  {language === "en"
                    ? "Actual Physical Cash in Drawer (₪)"
                    : "الكاش الفعلي المعدود في الدرج (₪)"}
                </label>
                <input
                  type="number"
                  value={cashInDrawer}
                  onChange={(e) => setCashInDrawer(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-4 outline-none focus:border-teal transition-colors font-mono text-[20px] font-bold text-center"
                  placeholder={
                    language === "en" ? "Enter counted amount..." : "أدخل المبلغ المحسوب..."
                  }
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
                    ? language === "en"
                      ? "✅ Perfect Match - Exact Balance"
                      : "✅ مطابق تماماً دون أي فرق"
                    : parseFloat(cashInDrawer) > systemCash
                      ? language === "en"
                        ? "⬆️ Excess in Drawer"
                        : "⬆️ زيادة في الصندوق"
                      : language === "en"
                        ? "⚠️ Shortage in Drawer"
                        : "⚠️ عجز مالي في الصندوق"}
                </span>
                <span className="font-mono text-[20px] font-black">
                  {parseFloat(cashInDrawer) === systemCash
                    ? "0.00"
                    : Math.abs(parseFloat(cashInDrawer) - systemCash).toFixed(2)}{" "}
                  ₪
                </span>
              </div>
            )}

            <button
              onClick={handleCloseShift}
              className="w-full mt-6 bg-primary text-white font-bold py-4 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-all text-[16px]"
            >
              {language === "en"
                ? "Close and Audit Shift"
                : "تقفيل وتأكيد جرد الوردية"}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: INVENTORY & DAMAGES (SCRAP) ─────────────────────────────── */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-mint-line shadow-sm">
              <div className="text-[13px] font-bold text-ink-soft mb-1">
                {language === "en" ? "Total Scrap Value (Loss)" : "إجمالي خسائر التوالف والهدر"}
              </div>
              <div className="text-[26px] font-mono font-black text-coral">
                {scrapStats.totalLoss.toFixed(2)} ₪
              </div>
              <div className="text-[11px] text-ink-soft mt-1">
                {language === "en" ? "Recorded in Expenses (Losses)" : "مسجلة آلياً في قيود المصروفات"}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-mint-line shadow-sm">
              <div className="text-[13px] font-bold text-ink-soft mb-1">
                {language === "en" ? "Total Destroyed Units" : "إجمالي العبوات المتلفة"}
              </div>
              <div className="text-[26px] font-mono font-black text-ink">
                {scrapStats.totalQty}{" "}
                <span className="text-[14px] font-bold text-ink-soft">
                  {language === "en" ? "Units" : "علبة"}
                </span>
              </div>
              <div className="text-[11px] text-ink-soft mt-1">
                {language === "en" ? "Deducted from stock" : "تم خصمها من رصيد الصيدلية"}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-mint-line shadow-sm">
              <div className="text-[13px] font-bold text-ink-soft mb-1">
                {language === "en" ? "Scrap Records" : "عدد عمليات الإتلاف"}
              </div>
              <div className="text-[26px] font-mono font-black text-teal">
                {scrapStats.totalCount}{" "}
                <span className="text-[14px] font-bold text-ink-soft">
                  {language === "en" ? "Records" : "حالة"}
                </span>
              </div>
              <div className="text-[11px] text-ink-soft mt-1">
                {language === "en" ? "Audited adjustments" : "عمليات مسجلة رسمياً"}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
            {/* Table Header & Actions */}
            <div className="p-5 border-b border-mint-line bg-bg flex flex-col md:flex-row gap-4 justify-between items-center">
              <div>
                <h2 className="text-[18px] font-black text-primary">
                  {language === "en"
                    ? "Inventory Scrap & Damaged Drugs Log"
                    : "سجل الجرد والتوالف والهدر المخزني"}
                </h2>
                <p className="text-[12px] text-ink-soft font-medium">
                  {language === "en"
                    ? "Deductions comply with international pharmacy inventory and write-off standards"
                    : "خصومات المخزون الرسمية المعتمدة وفق معايير أنظمة الصيدليات العالمية"}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowDamageModal(true)}
                  className="bg-coral text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-[#e11d48] transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  {language === "en" ? "+ Log Damaged Drug" : "+ تسجيل دواء تالف"}
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-mint-line flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder={
                  language === "en"
                    ? "Search by drug name or ID..."
                    : "البحث باسم الدواء أو رقم السجل..."
                }
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="flex-1 bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:border-teal"
              />

              <select
                value={stockReasonFilter}
                onChange={(e) => setStockReasonFilter(e.target.value)}
                className="bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:border-teal"
              >
                <option value="all">
                  {language === "en" ? "All Reasons" : "جميع الأسباب"}
                </option>
                <option value="كسر">
                  {language === "en" ? "Broken / Damaged Packaging" : "كسر أو تلف بالعبوة"}
                </option>
                <option value="انتهاء الصلاحية">
                  {language === "en" ? "Expired in Storage" : "انتهاء الصلاحية"}
                </option>
                <option value="رطوبة">
                  {language === "en" ? "Storage Temperature / Moisture" : "رطوبة أو حرارة"}
                </option>
                <option value="عجز">
                  {language === "en" ? "Inventory Discrepancy" : "عجز في الجرد"}
                </option>
                <option value="عيب مصنعي">
                  {language === "en" ? "Manufacturer Recall" : "عيب مصنعي / سحب تشغيلة"}
                </option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-mint-line text-ink-soft text-[13px] bg-bg/40">
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Record ID" : "رقم السجل"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Drug Name" : "اسم الدواء"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Reason" : "السبب والمبرر"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Quantity" : "الكمية المتلفة"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Loss Value" : "الخسارة المالية"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Recorded By" : "سجله"}
                    </th>
                    <th className="py-4 px-6 font-semibold text-start">
                      {language === "en" ? "Date" : "تاريخ التسجيل"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAdjustments ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-ink-soft font-bold">
                        {language === "en" ? "Loading adjustments..." : "جاري تحميل سجل التوالف..."}
                      </td>
                    </tr>
                  ) : filteredAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-ink-soft">
                        <div className="text-[32px] mb-2">📦✨</div>
                        <div className="font-bold text-[16px] text-ink">
                          {language === "en"
                            ? "No damaged medicines recorded"
                            : "لا توجد توالف أو إتلافات مسجلة"}
                        </div>
                        <div className="text-[13px] text-ink-soft mt-1">
                          {language === "en"
                            ? "Your stock is intact. Click '+ Log Damaged Drug' to record any scrap."
                            : "مخزون الصيدلية سليم. اضغط '+ تسجيل دواء تالف' لتوثيق أي هدر أو كسر."}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAdjustments.map((adj: any) => (
                      <tr
                        key={adj.id}
                        className="border-b border-mint-line/50 hover:bg-bg/50 transition-all text-[14px]"
                      >
                        <td className="py-4 px-6 font-mono font-bold text-ink">
                          {adj.id}
                        </td>
                        <td className="py-4 px-6 font-bold text-ink">
                          <div>{adj.drug_name}</div>
                          {adj.barcode && (
                            <div className="font-mono text-[11px] text-ink-soft">
                              {adj.barcode}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold text-coral">
                          <span className="bg-coral-pale px-3 py-1 rounded-full text-[12px]">
                            {adj.reason}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-black text-ink">
                          {adj.qty} {language === "en" ? "Units" : "علبة"}
                        </td>
                        <td className="py-4 px-6 font-mono font-bold text-coral">
                          {(Number(adj.loss_value) || 0).toFixed(2)} ₪
                        </td>
                        <td className="py-4 px-6 text-ink-soft font-medium">
                          {adj.recorded_by || "المدير"}
                        </td>
                        <td className="py-4 px-6 text-ink-soft text-[12px]">
                          {(adj.created_at || "").replace("T", " ").slice(0, 16)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: AUDIT & APPROVALS ───────────────────────────────────────── */}
      {activeTab === "approvals" && (
        <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
          <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
            <h2 className="text-[18px] font-black text-primary">
              {language === "en"
                ? "Permissions and Approvals Audit Log"
                : "سجل الصلاحيات والموافقات والرقابة"}
            </h2>
          </div>
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Process ID" : "رقم العملية"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Action Type" : "نوع الإجراء"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Details" : "التفاصيل"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Pharmacist" : "الصيدلي"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Date" : "التاريخ"}
                </th>
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

      {/* ─── TAB 4: CONTROLLED DRUGS LOG ────────────────────────────────────── */}
      {activeTab === "drugs" && (
        <div className="bg-white rounded-3xl shadow-sm border border-mint-line overflow-hidden">
          <div className="p-5 border-b border-mint-line bg-bg flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-[18px] font-black text-primary">
                {language === "en"
                  ? "Controlled & Narcotic Drugs Register (MOH Standard)"
                  : "دفتر السموم والأدوية الخاضعة للرقابة (معتمد لوزارة الصحة)"}
              </h2>
              <p className="text-[12px] text-ink-soft font-medium">
                {language === "en"
                  ? "Audit trail of all dispensed scheduled drugs with patient and doctor details"
                  : "سجل رسمي لجميع الوصفات المصروفة للأدوية المراقبة والنفسية"}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-[#259775] transition-all flex items-center gap-2 whitespace-nowrap"
            >
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
              {language === "en"
                ? "Print Official Register (MOH)"
                : "طباعة الدفتر لوزارة الصحة"}
            </button>
          </div>

          <div className="p-4 border-b border-mint-line">
            <input
              type="text"
              placeholder={
                language === "en"
                  ? "Search by patient, doctor, or drug name..."
                  : "بحث باسم المريض، الطبيب المعالج، أو اسم الدواء..."
              }
              value={searchDrug}
              onChange={(e) => setSearchDrug(e.target.value)}
              className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:border-teal"
            />
          </div>

          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px] bg-bg/30">
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Patient" : "المريض"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Prescribing Doctor" : "الطبيب الواصف"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Drug" : "الدواء الممنوح"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Quantity" : "الكمية"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Dispensed By" : "الصيدلي المنفذ"}
                </th>
                <th className="py-4 px-6 font-semibold text-start">
                  {language === "en" ? "Date" : "التاريخ"}
                </th>
                <th className="py-4 px-6 font-semibold text-center">
                  {language === "en" ? "Status" : "الحالة"}
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingControlled ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-ink-soft font-bold">
                    {language === "en" ? "Loading records..." : "جاري تحميل السجلات..."}
                  </td>
                </tr>
              ) : filteredControlledDrugs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-ink-soft">
                    <div className="text-[32px] mb-2">💊📋</div>
                    <div className="font-bold text-[16px] text-ink">
                      {language === "en"
                        ? "No controlled medications logged yet"
                        : "لا توجد أدوية خاضعة للرقابة مسجلة حالياً"}
                    </div>
                    <div className="text-[13px] text-ink-soft mt-1">
                      {language === "en"
                        ? "Prescriptions containing controlled items will appear here automatically upon sale."
                        : "أي دواء مصنف كمخدر أو خاضع للرقابة يُباع في نقطة البيع سيتم توثيقه هنا تلقائياً."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredControlledDrugs.map((drug: any, index: number) => (
                  <tr
                    key={drug.id + "-" + index}
                    className="border-b border-mint-line/50 hover:bg-bg/50 transition-all text-[14px]"
                  >
                    <td className="py-4 px-6 font-bold text-ink">
                      {drug.patient}
                    </td>
                    <td className="py-4 px-6 text-ink-soft">
                      {drug.doctor}
                    </td>
                    <td className="py-4 px-6 font-bold text-primary">
                      {drug.drug}
                    </td>
                    <td className="py-4 px-6 font-black">
                      {drug.qty} {language === "en" ? "Units" : "علبة"}
                    </td>
                    <td className="py-4 px-6 text-ink-soft">
                      {drug.cashier || (language === "en" ? "Pharmacist" : "الصيدلي المسؤول")}
                    </td>
                    <td className="py-4 px-6 text-ink-soft">
                      {drug.date}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-teal-pale text-teal">
                        {language === "en" ? "Dispensed & Logged" : "تم الصرف والتوثيق"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── MODAL: LOG DAMAGED DRUG (SCRAP & ADJUSTMENT) ───────────────────── */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-mint-line relative animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-mint-line">
              <div className="flex items-center gap-2">
                <span className="text-[22px]">📦⚠️</span>
                <h3 className="text-[18px] font-black text-primary">
                  {language === "en"
                    ? "Log Damaged / Expired Medicine"
                    : "تسجيل دواء تالف وهدر مخزني"}
                </h3>
              </div>
              <button
                onClick={() => setShowDamageModal(false)}
                className="w-8 h-8 rounded-full bg-bg hover:bg-mint-bg flex items-center justify-center text-ink-soft hover:text-ink transition-all font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-ink-soft mb-4">
              {language === "en"
                ? "This will immediately deduct the items from pharmacy stock and record an operational waste expense according to IFRS standards."
                : "سيتم خصم الكمية فوراً من المخزون وتوثيق القيد في حساب الهدر والتلفيات وفق المعايير المحاسبية المعتمدة."}
            </p>

            <form onSubmit={handleSubmitDamage} className="space-y-4">
              {/* Medicine Select / Search */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Select Medicine from Inventory *" : "اختر الدواء من المخزون *"}
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={
                      language === "en"
                        ? "Search by name or barcode..."
                        : "ابحث بالاسم أو الباركود..."
                    }
                    value={medicineSearchQuery}
                    onChange={(e) => setMedicineSearchQuery(e.target.value)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                  />
                  <select
                    value={selectedDrugId}
                    onChange={(e) => setSelectedDrugId(e.target.value)}
                    required
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-teal"
                  >
                    <option value="">
                      {language === "en" ? "-- Choose a medicine --" : "-- اضغط لاختيار الدواء --"}
                    </option>
                    {inventoryList
                      .filter((item: any) => {
                        if (!medicineSearchQuery) return true;
                        const q = medicineSearchQuery.toLowerCase();
                        return (
                          (item.name || "").toLowerCase().includes(q) ||
                          (item.barcode || "").toLowerCase().includes(q)
                        );
                      })
                      .map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name} | {language === "en" ? "Stock:" : "الرصيد:"} {item.qty} علبة | {language === "en" ? "Cost:" : "التكلفة:"} {(Number(item.cost) || Number(item.price || 0) * 0.7).toFixed(2)} ₪
                        </option>
                      ))}
                  </select>
                </div>

                {selectedDrug && (
                  <div className="mt-2 bg-bg p-3 rounded-xl border border-mint-line flex items-center justify-between text-[12px]">
                    <div>
                      <span className="text-ink-soft font-bold">
                        {language === "en" ? "Available in Stock:" : "الرصيد المتوفر:"}
                      </span>{" "}
                      <span className="font-mono font-black text-teal">
                        {selectedDrug.qty} {language === "en" ? "Units" : "علبة"}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-soft font-bold">
                        {language === "en" ? "Unit Cost:" : "سعر التكلفة:"}
                      </span>{" "}
                      <span className="font-mono font-black text-ink">
                        {selectedDrugCost.toFixed(2)} ₪
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[13px] font-bold text-ink-soft">
                    {language === "en" ? "Damaged Quantity *" : "الكمية التالفة (علب) *"}
                  </label>
                  {selectedDrug && (
                    <button
                      type="button"
                      onClick={() => setDamageQty(selectedDrug.qty)}
                      className="text-[11px] text-teal hover:underline font-bold"
                    >
                      {language === "en" ? "Full Batch (Max)" : "كامل الرصيد (الكل)"}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={selectedDrug ? selectedDrug.qty : undefined}
                  value={damageQty}
                  onChange={(e) => setDamageQty(e.target.value)}
                  required
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 font-mono text-[16px] font-bold outline-none focus:border-teal text-center"
                />
                {selectedDrug && Number(damageQty) > Number(selectedDrug.qty) && (
                  <p className="text-[12px] text-coral font-bold mt-1">
                    ⚠️ {language === "en" ? "Quantity exceeds available stock!" : "الكمية المدخلة أكبر من الرصيد المتوفر في المخزون!"}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Reason (International Standards) *" : "سبب الإتلاف (المعايير المعتمدة) *"}
                </label>
                <select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-teal"
                >
                  <option value="كسر في العبوة">
                    {language === "en" ? "Broken or Damaged Packaging / Spillage" : "كسر أو تلف فيزيائي في العبوة"}
                  </option>
                  <option value="انتهاء الصلاحية أثناء التخزين">
                    {language === "en" ? "Expired During Storage" : "انتهاء الصلاحية أثناء التخزين"}
                  </option>
                  <option value="تلف بالرطوبة أو الحرارة / سوء تخزين">
                    {language === "en" ? "Storage Temperature / Humidity Breach" : "تلف بالرطوبة أو الحرارة / سوء تخزين"}
                  </option>
                  <option value="عجز في الجرد الفعلي">
                    {language === "en" ? "Physical Inventory Discrepancy" : "عجز في الجرد الفعلي"}
                  </option>
                  <option value="عيب مصنعي أو تشغيلة مسحوبة">
                    {language === "en" ? "Manufacturer Defect or Batch Recall" : "عيب مصنعي أو تشغيلة مسحوبة"}
                  </option>
                  <option value="أخرى">
                    {language === "en" ? "Other Reason" : "أخرى (مذكور بالملاحظات)"}
                  </option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1">
                  {language === "en" ? "Additional Notes / Batch #" : "ملاحظات إضافية أو رقم التشغيلة"}
                </label>
                <input
                  type="text"
                  placeholder={
                    language === "en"
                      ? "e.g. Broken during shelf reorganization"
                      : "مثال: سقطت الزجاجة أثناء ترتيب الرف"
                  }
                  value={damageNotes}
                  onChange={(e) => setDamageNotes(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-teal"
                />
              </div>

              {/* Calculation Preview Box */}
              <div className="bg-coral-pale/40 border border-coral/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-coral">
                    {language === "en" ? "Total Financial Loss Value" : "القيمة الإجمالية للخسارة المالية"}
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    {language === "en"
                      ? `${damageQty || 0} units × ${selectedDrugCost.toFixed(2)} ₪ cost`
                      : `${damageQty || 0} علبة × ${selectedDrugCost.toFixed(2)} ₪ تكلفة`}
                  </div>
                </div>
                <div className="font-mono text-[22px] font-black text-coral">
                  {totalCalculatedLoss.toFixed(2)} ₪
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDamageModal(false)}
                  className="flex-1 bg-bg text-ink-soft hover:bg-mint-bg font-bold py-3 rounded-xl transition-all text-[14px]"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDamage}
                  className="flex-1 bg-coral text-white hover:bg-[#e11d48] font-bold py-3 rounded-xl transition-all shadow-md shadow-coral/20 text-[14px] disabled:opacity-50"
                >
                  {isSubmittingDamage
                    ? language === "en"
                      ? "Recording..."
                      : "جاري الخصم والتسجيل..."
                    : language === "en"
                      ? "Confirm & Deduct Stock"
                      : "تأكيد الخصم والإتلاف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
