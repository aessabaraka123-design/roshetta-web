"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import AppBar from "@/components/AppBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ExpenseRecord,
  CANONICAL_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  calculateExpenseKPIs,
  filterExpensesList,
  formatExpenseVoucherNo,
  normalizeExpenseCategory,
  normalizeExpensePaymentMethod,
} from "@/lib/expenses/domain";
import {
  fetchExpensesApi,
  addExpenseApi,
  editExpenseApi,
  deleteExpenseApi,
  flushExpenseSyncQueue,
  printExpenseVoucher,
  loadExpenseSyncQueue,
} from "@/lib/expenses/transport";
import { API_BASE_URL } from "@/lib/config";

export default function ExpensesPage() {
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

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const monthStartStr = useMemo(() => todayStr.slice(0, 8) + "01", [todayStr]);

  // Filters State
  const [dateRangeMode, setDateRangeMode] = useState<"today" | "week" | "month" | "all" | "custom">("month");
  const [from, setFrom] = useState(monthStartStr);
  const [to, setTo] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [selectedAccountType, setSelectedAccountType] = useState<"all" | "opex_only" | "supplier_only">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Branches
  const [branches, setBranches] = useState<any[]>([]);

  // Expenses Data
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [modalForm, setModalForm] = useState({
    category: "ضيافة",
    description: "",
    amount: "",
    paymentMethod: "cash",
    branch_id: "",
    supplier_name: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Role permissions
  const isManager =
    user?.role === "owner" ||
    user?.role === "manager" ||
    user?.role === "superadmin" ||
    user?.role === "branchManager" ||
    user?.role === "مدير فرع";

  const userBranchObj = branches.find((b: any) => b.id === user?.branch || b.name === user?.branch);
  const userBranchId = userBranchObj ? String(userBranchObj.id) : (user?.branch || "main");

  // Handle Date Range Preset Changes
  const handleDatePreset = (preset: "today" | "week" | "month" | "all" | "custom") => {
    setDateRangeMode(preset);
    const now = new Date();
    if (preset === "today") {
      setFrom(todayStr);
      setTo(todayStr);
    } else if (preset === "week") {
      const past = new Date(now.getTime() - 7 * 86400000);
      setFrom(past.toISOString().split("T")[0]);
      setTo(todayStr);
    } else if (preset === "month") {
      setFrom(monthStartStr);
      setTo(todayStr);
    } else if (preset === "all") {
      setFrom("");
      setTo("");
    }
  };

  // Fetch branches on mount
  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`);
        const data = await res.json();
        if (data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      } catch {}
    }
    fetchBranches();
  }, [user?.pharmacy_id]);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!user?.pharmacy_id) return;
    setLoading(true);
    const activeBranch = !isManager ? userBranchId : branchFilter;
    try {
      const res = await fetchExpensesApi({
        pharmacyId: user.pharmacy_id,
        from: from || undefined,
        to: to || undefined,
        branchId: activeBranch !== "all" ? activeBranch : undefined,
      });
      setExpenses(res.expenses);
    } catch {
      toast.error(isEn ? "Failed to load expenses" : "تعذر تحميل المصروفات");
    } finally {
      setLoading(false);
      setOfflineQueueCount(loadExpenseSyncQueue().length);
    }
  }, [user?.pharmacy_id, from, to, branchFilter, isManager, userBranchId, isEn]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Auto flush offline queue when online
  useEffect(() => {
    const handleOnline = async () => {
      if (user?.pharmacy_id) {
        const flushed = await flushExpenseSyncQueue(user.pharmacy_id);
        if (flushed > 0) {
          toast.success(
            isEn ? `Synced ${flushed} offline expense(s)` : `تمت مزامنة ${flushed} مصروف مسجل أوفلاين بنجاح`
          );
          loadExpenses();
        }
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user?.pharmacy_id, isEn, loadExpenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const activeBranch = !isManager ? userBranchId : branchFilter;
    return filterExpensesList(expenses, {
      search: searchQuery,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      branchId: activeBranch !== "all" ? activeBranch : undefined,
      from: from || undefined,
      to: to || undefined,
      accountType: selectedAccountType,
    });
  }, [
    expenses,
    searchQuery,
    selectedCategory,
    selectedPaymentMethod,
    branchFilter,
    isManager,
    userBranchId,
    from,
    to,
    selectedAccountType,
  ]);

  // Financial KPIs
  const kpis = useMemo(() => {
    return calculateExpenseKPIs(filteredExpenses, {
      todayIso: todayStr,
      monthStartIso: monthStartStr,
    });
  }, [filteredExpenses, todayStr, monthStartStr]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingExpense(null);
    setModalForm({
      category: "ضيافة",
      description: "",
      amount: "",
      paymentMethod: "cash",
      branch_id: !isManager ? userBranchId : branchFilter !== "all" ? branchFilter : (branches[0]?.id || ""),
      supplier_name: "",
      notes: "",
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (expense: ExpenseRecord) => {
    if (!isManager) {
      toast.error(isEn ? "Only managers can edit expenses" : "تعديل المصروف مقتصر على المدراء فقط");
      return;
    }
    const catDef = normalizeExpenseCategory(expense.category);
    if (catDef.isProtected) {
      toast.error(
        isEn
          ? "Supplier invoice payments cannot be edited manually"
          : "سندات سداد الموردين محمية ولا يمكن تعديلها يدوياً لارتباطها بدفتر المورد"
      );
      return;
    }
    setEditingExpense(expense);
    setModalForm({
      category: expense.category,
      description: expense.description || "",
      amount: String(expense.amount || ""),
      paymentMethod: expense.paymentMethod || expense.payment_method || "cash",
      branch_id: expense.branch_id || "",
      supplier_name: expense.supplier_name || "",
      notes: expense.notes || "",
    });
    setShowModal(true);
  };

  // Save Add/Edit
  const handleSaveModal = async () => {
    if (!user?.pharmacy_id) return;
    const amt = parseFloat(modalForm.amount);
    if (!modalForm.amount || isNaN(amt) || amt <= 0) {
      toast.error(isEn ? "Please enter a valid amount" : "يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    if (!modalForm.description.trim()) {
      toast.error(isEn ? "Please enter expense description" : "يرجى كتابة بيان وتفاصيل المصروف");
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        const res = await editExpenseApi({
          pharmacyId: user.pharmacy_id,
          expenseId: editingExpense.id,
          updates: {
            category: modalForm.category,
            description: modalForm.description.trim(),
            amount: amt,
            paymentMethod: modalForm.paymentMethod,
            branch_id: modalForm.branch_id || null,
            supplier_name: modalForm.supplier_name.trim() || undefined,
            notes: modalForm.notes.trim() || undefined,
          },
        });
        if (res.success) {
          toast.success(
            res.queuedOffline
              ? isEn ? "Expense updated locally (Offline)" : "تم حفظ التعديل محلياً (سيتم رفعه عند عودة الاتصال)"
              : isEn ? "Expense updated successfully" : "تم تعديل المصروف بنجاح"
          );
          setShowModal(false);
          loadExpenses();
        } else {
          toast.error(res.error || (isEn ? "Failed to update expense" : "فشل تعديل المصروف"));
        }
      } else {
        const res = await addExpenseApi({
          pharmacyId: user.pharmacy_id,
          actorName: user.managerName || user.name || "الموظف",
          expense: {
            category: modalForm.category,
            description: modalForm.description.trim(),
            amount: amt,
            paymentMethod: modalForm.paymentMethod,
            branch_id: modalForm.branch_id || null,
            branch: branches.find((b) => b.id === modalForm.branch_id)?.name || "",
            supplier_name: modalForm.supplier_name.trim() || undefined,
            date: new Date().toISOString(),
          },
        });
        if (res.success) {
          toast.success(
            res.queuedOffline
              ? isEn ? "Expense saved locally (Offline)" : "تم تسجيل المصروف محلياً (محفوظ أوفلاين)"
              : isEn ? "Expense recorded successfully" : "تم تسجيل المصروف وسند الصرف بنجاح"
          );
          setShowModal(false);
          loadExpenses();
        } else {
          toast.error(res.error || (isEn ? "Failed to add expense" : "فشل تسجيل المصروف"));
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete Expense
  const handleDelete = async (expense: ExpenseRecord) => {
    if (!isManager) {
      toast.error(isEn ? "Only managers can delete expenses" : "حذف المصروف مقتصر على المدراء فقط");
      return;
    }
    const catDef = normalizeExpenseCategory(expense.category);
    if (catDef.isProtected) {
      toast.error(
        isEn
          ? "Supplier invoice payments cannot be deleted manually"
          : "سندات سداد الموردين محمية ولا يمكن حذفها يدوياً لارتباطها بدفتر المورد"
      );
      return;
    }

    if (
      !window.confirm(
        isEn
          ? `Are you sure you want to delete this expense (₪${expense.amount})?`
          : `هل أنت متأكد من حذف هذا المصروف بقيمة (${expense.amount} ₪)؟`
      )
    ) {
      return;
    }

    const res = await deleteExpenseApi({
      pharmacyId: user.pharmacy_id,
      expenseId: expense.id,
    });
    if (res.success) {
      toast.success(isEn ? "Expense deleted" : "تم حذف المصروف بنجاح");
      loadExpenses();
    } else {
      toast.error(res.error || (isEn ? "Failed to delete expense" : "فشل حذف المصروف"));
    }
  };

  // Print Payment Voucher
  const handlePrintVoucher = (expense: ExpenseRecord) => {
    const branchName =
      branches.find((b: any) => b.id === expense.branch_id)?.name ||
      expense.branch ||
      expense.branch_name ||
      "الفرع الرئيسي";

    printExpenseVoucher({
      expense,
      pharmacyName: user?.pharmacyName || user?.pharmacy_name || (isEn ? "Roshetta Pharmacy" : "صيدلية روشيتة"),
      branchName,
      language,
    });
  };

  return (
    <>
      <AppBar title={isEn ? "Expenses & Payment Vouchers" : "المصروفات وسندات الصرف"} />

      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Top Offline Queue Alert Banner (if pending) */}
        {offlineQueueCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <div>
                <div className="font-bold text-[14px]">
                  {isEn ? "Pending Offline Operations" : "عمليات معلقة بانتظار المزامنة"}
                </div>
                <div className="text-[12px] text-amber-700">
                  {isEn
                    ? `You have ${offlineQueueCount} expense(s) saved locally. They will sync automatically when online.`
                    : `يوجد لديك ${offlineQueueCount} مصروف محفوظ محلياً، سيتم رفعهم تلقائياً عند استقرار الإنترنت.`}
                </div>
              </div>
            </div>
            <button
              onClick={() => user?.pharmacy_id && flushExpenseSyncQueue(user.pharmacy_id).then(loadExpenses)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[12px] px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              {isEn ? "Sync Now" : "مزامنة الآن"}
            </button>
          </div>
        )}

        {/* Executive KPI Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Today's Expenses */}
          <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[11.5px] font-bold text-ink-soft mb-1 flex items-center justify-between">
              <span>{isEn ? "Today's Expenses" : "مصروفات اليوم"}</span>
              <span>📅</span>
            </div>
            <div className="text-[24px] font-mono font-black text-coral">
              ₪{kpis.todayTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-ink-soft mt-1">
              {isEn ? "Recorded today" : "مسجلة اليوم"}
            </div>
          </div>

          {/* Card 2: Period Total */}
          <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[11.5px] font-bold text-ink-soft mb-1 flex items-center justify-between">
              <span>{isEn ? "Period Total" : "إجمالي الفترة"}</span>
              <span>📊</span>
            </div>
            <div className="text-[24px] font-mono font-black text-primary">
              ₪{kpis.totalPeriod.toFixed(2)}
            </div>
            <div className="text-[11px] text-ink-soft mt-1">
              {kpis.totalTransactions} {isEn ? "transactions" : "عملية صرف"}
            </div>
          </div>

          {/* Card 3: Operating OPEX */}
          <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[11.5px] font-bold text-ink-soft mb-1 flex items-center justify-between">
              <span>{isEn ? "Operating OPEX" : "المصروفات التشغيلية"}</span>
              <span>💼</span>
            </div>
            <div className="text-[24px] font-mono font-black text-slate-800">
              ₪{kpis.operatingExpensesTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">
              {isEn ? "P&L Deductible" : "مخصومة من قائمة الدخل"}
            </div>
          </div>

          {/* Card 4: Drawer Cash Petty Outflows */}
          <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-[11.5px] font-bold text-ink-soft mb-1 flex items-center justify-between">
              <span>{isEn ? "Cash Drawer Outflows" : "مسحوبات الدرج النقدي"}</span>
              <span>💵</span>
            </div>
            <div className="text-[24px] font-mono font-black text-emerald-700">
              ₪{kpis.drawerCashTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-700 font-bold mt-1">
              {isEn ? "Affects active shifts" : "تؤثر على عهدة الورديات"}
            </div>
          </div>

          {/* Card 5: Supplier Settlements (AP) */}
          <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
            <div className="text-[11.5px] font-bold text-ink-soft mb-1 flex items-center justify-between">
              <span>{isEn ? "Supplier Payments (AP)" : "سداد دفعات الموردين"}</span>
              <span>📦</span>
            </div>
            <div className="text-[24px] font-mono font-black text-sky-700">
              ₪{kpis.supplierSettlementsTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-sky-700 font-bold mt-1">
              {isEn ? "Accounts Payable settlement" : "تسوية التزامات موردين"}
            </div>
          </div>
        </div>

        {/* Category Pill Navigation Carousel */}
        <div className="bg-white rounded-2xl border border-mint-line p-3 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {isEn ? "All Categories" : "جميع البنود"} ({expenses.length})
            </button>
            {CANONICAL_CATEGORIES.map((cat) => {
              const matchedKpi = kpis.categoryBreakdown.find((k) => k.categoryKey === cat.key);
              const count = matchedKpi ? matchedKpi.count : 0;
              const isSelected = selectedCategory === cat.id || selectedCategory === cat.key;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary text-white shadow-sm"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{isEn ? cat.labelEn : cat.labelAr}</span>
                  {count > 0 && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-mint-line p-4 shadow-sm flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-xs">
              <input
                type="text"
                placeholder={isEn ? "Search description, voucher, recipient..." : "بحث بالبيان، رقم السند، المستفيد..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg border border-mint-line rounded-xl px-3.5 py-2 text-[13px] outline-none focus:border-primary transition-colors pr-9"
              />
              <span className="absolute right-3 top-2.5 text-ink-soft text-sm pointer-events-none">🔍</span>
            </div>

            {/* Date Preset Buttons */}
            <div className="flex bg-bg rounded-xl p-1 border border-mint-line">
              {(["today", "week", "month", "all", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleDatePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    dateRangeMode === preset ? "bg-white shadow-sm text-primary" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {preset === "today"
                    ? isEn ? "Today" : "اليوم"
                    : preset === "week"
                    ? isEn ? "7 Days" : "آخر 7 أيام"
                    : preset === "month"
                    ? isEn ? "Month" : "هذا الشهر"
                    : preset === "all"
                    ? isEn ? "All" : "الكل"
                    : isEn ? "Custom" : "مخصص"}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {dateRangeMode === "custom" && (
              <div className="flex items-center gap-1.5 bg-bg border border-mint-line rounded-xl px-2 py-1">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="bg-transparent text-[12px] outline-none"
                />
                <span className="text-[12px] text-ink-soft font-bold">-</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="bg-transparent text-[12px] outline-none"
                />
              </div>
            )}

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="bg-bg border border-mint-line rounded-xl px-3 py-2 text-[12.5px] font-bold text-ink outline-none"
            >
              <option value="all">{isEn ? "All Payment Methods" : "جميع طرق الدفع"}</option>
              {EXPENSE_PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {isEn ? pm.labelEn : pm.labelAr}
                </option>
              ))}
            </select>

            {/* Branch Filter (Managers only) */}
            {isManager && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-bg border border-mint-line rounded-xl px-3 py-2 text-[12.5px] font-bold text-primary outline-none"
              >
                <option value="all">{isEn ? "All Branches" : "كل الفروع"}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="bg-primary hover:opacity-95 text-white px-5 py-2.5 rounded-xl font-bold text-[13.5px] shadow-md shadow-primary/20 flex items-center gap-2 transition-all"
            >
              <span>+</span>
              <span>{isEn ? "Record Expense" : "تسجيل مصروف جديد"}</span>
            </button>
          </div>
        </div>

        {/* Expenses List & Table */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center">
            <div className="inline-block animate-spin text-3xl mb-2">⏳</div>
            <div className="text-ink-soft font-bold text-[13px]">
              {isEn ? "Loading expenses..." : "جاري تحميل سجلات المصروفات..."}
            </div>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center shadow-sm">
            <div className="text-[44px] mb-3">💸</div>
            <div className="text-[16px] font-black text-ink mb-1">
              {isEn ? "No Expenses Found" : "لا توجد مصروفات مطابقة للبحث أو الفترة"}
            </div>
            <div className="text-ink-soft text-[13px] max-w-sm mx-auto mb-4">
              {isEn
                ? "Try adjusting your filters or record a new expense voucher."
                : "يمكنك تغيير الفلاتر المحددة أو إضافة سند صرف ومصروف جديد الآن."}
            </div>
            <button
              onClick={handleOpenAdd}
              className="bg-primary text-white font-bold text-[13px] px-5 py-2.5 rounded-xl shadow-sm hover:opacity-95"
            >
              + {isEn ? "Record Expense" : "تسجيل مصروف جديد"}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-mint-line shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-mint-line text-ink-soft font-bold text-[12px]">
                    <th className="p-3.5 text-center w-24">{isEn ? "Voucher #" : "رقم السند"}</th>
                    <th className="p-3.5">{isEn ? "Category" : "بند الصرف"}</th>
                    <th className="p-3.5">{isEn ? "Description & Particulars" : "البيان والتفاصيل"}</th>
                    <th className="p-3.5">{isEn ? "Payment Method" : "طريقة الصرف"}</th>
                    <th className="p-3.5">{isEn ? "Branch / Staff" : "الفرع / المنفذ"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Date & Time" : "التاريخ والوقت"}</th>
                    <th className="p-3.5 text-left">{isEn ? "Amount" : "المبلغ (₪)"}</th>
                    <th className="p-3.5 text-center w-28">{isEn ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line">
                  {filteredExpenses.map((expense) => {
                    const catDef = normalizeExpenseCategory(expense.category);
                    const pmDef = normalizeExpensePaymentMethod(expense.paymentMethod || expense.payment_method);
                    const voucherNo = formatExpenseVoucherNo(expense);
                    const branchName =
                      branches.find((b: any) => b.id === expense.branch_id)?.name ||
                      expense.branch ||
                      expense.branch_name ||
                      "الفرع الرئيسي";

                    return (
                      <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Voucher # */}
                        <td className="p-3.5 text-center">
                          <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {voucherNo}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border ${catDef.bgColor}`}
                          >
                            <span>{catDef.icon}</span>
                            <span>{isEn ? catDef.labelEn : catDef.labelAr}</span>
                          </span>
                        </td>

                        {/* Description */}
                        <td className="p-3.5">
                          <div className="font-bold text-ink text-[13.5px]">{expense.description}</div>
                          {expense.supplier_name && (
                            <div className="text-[11.5px] text-sky-700 font-bold mt-0.5 flex items-center gap-1">
                              <span>المورد:</span>
                              <span>{expense.supplier_name}</span>
                            </div>
                          )}
                          {catDef.accountType === "supplier_settlement" && (
                            <span className="inline-block text-[10px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.2 rounded mt-0.5">
                              {isEn ? "Accounts Payable Settlement" : "تسوية التزامات موردين"}
                            </span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[12px] font-bold">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pmDef.color }}
                            />
                            <span className="text-ink-soft">{isEn ? pmDef.labelEn : pmDef.labelAr}</span>
                          </div>
                          {pmDef.isDrawerCash && (
                            <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                              {isEn ? "Drawer Petty Cash" : "عهدة الدرج النقدي"}
                            </span>
                          )}
                        </td>

                        {/* Branch / Staff */}
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="font-bold text-[12.5px] text-ink">{branchName}</div>
                          <div className="text-[11px] text-ink-soft">{expense.created_by || "الموظف"}</div>
                        </td>

                        {/* Date */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="text-[12px] font-bold text-ink">
                            {expense.date ? expense.date.split("T")[0] : "-"}
                          </div>
                          <div className="text-[10.5px] text-ink-soft font-mono">
                            {expense.date && expense.date.includes("T")
                              ? expense.date.split("T")[1].slice(0, 5)
                              : ""}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-3.5 text-left whitespace-nowrap">
                          <span className="text-[16px] font-mono font-black text-coral">
                            ₪{Number(expense.amount || 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Print Voucher */}
                            <button
                              onClick={() => handlePrintVoucher(expense)}
                              title={isEn ? "Print Voucher" : "طباعة سند الصرف"}
                              className="p-1.5 text-ink-soft hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                              <span className="text-base">🖨️</span>
                            </button>

                            {/* Edit (Managers only) */}
                            {isManager && !catDef.isProtected && (
                              <button
                                onClick={() => handleOpenEdit(expense)}
                                title={isEn ? "Edit Expense" : "تعديل المصروف"}
                                className="p-1.5 text-ink-soft hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </button>
                            )}

                            {/* Delete (Managers only) */}
                            {isManager && !catDef.isProtected && (
                              <button
                                onClick={() => handleDelete(expense)}
                                title={isEn ? "Delete Expense" : "حذف المصروف"}
                                className="p-1.5 text-ink-soft hover:text-coral hover:bg-coral/10 rounded-lg transition-colors"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
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

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-mint-line my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <div>
                <h3 className="text-[19px] font-black text-primary">
                  {editingExpense
                    ? isEn ? "Edit Expense" : "تعديل بيانات المصروف"
                    : isEn ? "Record New Expense" : "تسجيل مصروف وسند صرف جديد"}
                </h3>
                <p className="text-[12px] text-ink-soft mt-0.5">
                  {isEn
                    ? "Fill in the particulars to issue an authorized financial voucher."
                    : "أدخل تفاصيل النفقة لإصدار سند صرف مالي معتمد وتحديث الأرصدة."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-ink-soft flex items-center justify-center transition-colors font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Category Grid Selection */}
              <div>
                <label className="block text-[12px] font-bold text-ink-soft mb-2">
                  {isEn ? "Expense Category (Chart of Accounts)" : "بند الصرف (شجرة الحسابات):"}
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1 border border-mint-line rounded-xl bg-slate-50/50">
                  {CANONICAL_CATEGORIES.filter((c) => !c.isProtected).map((cat) => {
                    const isSelected = modalForm.category === cat.key || modalForm.category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setModalForm((f) => ({ ...f, category: cat.key }))}
                        className={`p-2 rounded-xl text-center text-[12px] font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-ink border-mint-line hover:border-primary/40"
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="truncate w-full">{isEn ? cat.labelEn : cat.labelAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description & Particulars */}
              <div>
                <label className="block text-[12px] font-bold text-ink-soft mb-1">
                  {isEn ? "Description & Particulars *" : "البيان والتفاصيل (سبب الصرف) *"}
                </label>
                <input
                  type="text"
                  placeholder={
                    isEn
                      ? "e.g. Electricity bill, Air conditioner repair, Office coffee..."
                      : "مثال: فاتورة كهرباء شهر 11، صيانة مكيف الصيدلية، ضيافة قهوة وشاي..."
                  }
                  value={modalForm.description}
                  onChange={(e) => setModalForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13.5px] outline-none focus:border-primary transition-colors font-bold text-ink"
                  autoFocus
                />
              </div>

              {/* Amount & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {isEn ? "Disbursed Amount (₪) *" : "المبلغ المصروف (₪) *"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={modalForm.amount}
                      onChange={(e) => setModalForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[16px] font-mono font-black text-coral outline-none focus:border-primary transition-colors pr-8"
                    />
                    <span className="absolute right-3 top-3.5 text-coral font-bold pointer-events-none">₪</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {isEn ? "Payment Source" : "طريقة ومصدر الصرف"}
                  </label>
                  <select
                    value={modalForm.paymentMethod}
                    onChange={(e) => setModalForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink outline-none focus:border-primary"
                  >
                    {EXPENSE_PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {isEn ? pm.labelEn : pm.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch Selector (if multiple branches and manager) */}
              {isManager && branches.length > 0 && (
                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {isEn ? "Branch" : "الفرع المالي المسؤول"}
                  </label>
                  <select
                    value={modalForm.branch_id}
                    onChange={(e) => setModalForm((f) => ({ ...f, branch_id: e.target.value }))}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink outline-none focus:border-primary"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Beneficiary Name (Optional) */}
              <div>
                <label className="block text-[12px] font-bold text-ink-soft mb-1">
                  {isEn ? "Beneficiary / Recipient (Optional)" : "اسم المستفيد / المستلم (اختياري)"}
                </label>
                <input
                  type="text"
                  placeholder={isEn ? "e.g. Technician Ahmad, Landlord..." : "مثال: الفني أحمد، مالك العقار..."}
                  value={modalForm.supplier_name}
                  onChange={(e) => setModalForm((f) => ({ ...f, supplier_name: e.target.value }))}
                  className="w-full bg-bg border border-mint-line rounded-xl p-2.5 text-[13px] outline-none focus:border-primary transition-colors text-ink"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-mint-line">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-mint-line text-[13px] font-bold text-ink-soft hover:bg-slate-50 transition-colors"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveModal}
                className="bg-primary hover:opacity-95 text-white px-6 py-2.5 rounded-xl font-bold text-[13px] shadow-md shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {saving && <span className="animate-spin text-sm">⏳</span>}
                <span>
                  {editingExpense
                    ? isEn ? "Save Changes" : "حفظ التعديلات"
                    : isEn ? "Issue Voucher & Save" : "إصدار السند وحفظ المصروف"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
