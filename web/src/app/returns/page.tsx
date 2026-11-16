"use client";

import { useState, useMemo, useEffect } from "react";
import AppBar from "@/components/AppBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/lib/config";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import {
  ReturnCondition,
  ReturnReason,
  RETURN_CONDITIONS,
  RETURN_REASONS,
  ReturnItemRequest,
  RefundOptions,
  computeRefundSettlement,
  calculateReturnsKPIs,
  buildCreditNoteHtml,
  CreditNotePayload,
  round2,
  formatCurrency,
} from "@/lib/returns/domain";
import {
  fetchReturnsApi,
  refundSaleApi,
  fetchCreditNoteApi,
  printCreditNote,
} from "@/lib/returns/transport";

const fetcher = (url: string) => fetch(url, { headers: getWebAuthHeaders() }).then((res) => res.json());

export default function ReturnsPage() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();
  const isEn = language === "en";

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<"search" | "history">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  // Fetch branches
  const { data: dashboardData } = useSWR(
    user?.pharmacy_id ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard` : null,
    fetcher
  );
  const branches = dashboardData?.branches || [];

  // Fetch sales for invoice search
  const { data: salesData, isLoading: salesLoading } = useSWR(
    user?.pharmacy_id ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales` : null,
    fetcher
  );
  const allSales = salesData?.sales || [];

  // Eligible sales for return
  const eligibleSales = useMemo(() => {
    return allSales.filter(
      (s: any) =>
        s &&
        s.id &&
        s.status !== "refunded" &&
        s.status !== "refund_proxy" &&
        !String(s.id).startsWith("REF-") &&
        Number(s.total || 0) > 0 &&
        s.status !== "debt_payment" &&
        s.paymentMethod !== "debt_payment"
    );
  }, [allSales]);

  // Invoice search matches
  const invoiceSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return eligibleSales
      .filter((s: any) => {
        const idMatch = String(s.id).toLowerCase().includes(q);
        const custObj = typeof s.customer === "string" ? JSON.parse(s.customer || "{}") : (s.customer || {});
        const custMatch = custObj?.name && String(custObj.name).toLowerCase().includes(q);
        const phoneMatch = custObj?.phone && String(custObj.phone).includes(q);
        return idMatch || custMatch || phoneMatch;
      })
      .slice(0, 6);
  }, [searchQuery, eligibleSales]);

  // Fetch returns history
  const { data: returnsData, isLoading: returnsLoading, mutate: mutateReturns } = useSWR(
    user?.pharmacy_id
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/returns?branch=${encodeURIComponent(branchFilter)}`
      : null,
    () => fetchReturnsApi({ pharmacyId: user!.pharmacy_id, branch: branchFilter })
  );

  const returnsList = returnsData?.returns || [];
  const kpis = useMemo(() => {
    if (returnsData?.kpis) return returnsData.kpis;
    return calculateReturnsKPIs(returnsList);
  }, [returnsData, returnsList]);

  // State for active return form
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [returnItemsState, setReturnItemsState] = useState<
    Record<string, { qty: number; condition: ReturnCondition; reason: ReturnReason }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settlement & confirmation modal state
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementDraft, setSettlementDraft] = useState<any>(null);

  // Credit Note Modal State
  const [activeCreditNote, setActiveCreditNote] = useState<CreditNotePayload | null>(null);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);

  // Reset form when changing selected invoice
  useEffect(() => {
    if (selectedInvoice && Array.isArray(selectedInvoice.items)) {
      const initial: Record<string, { qty: number; condition: ReturnCondition; reason: ReturnReason }> = {};
      selectedInvoice.items.forEach((item: any) => {
        initial[item.id] = {
          qty: 0,
          condition: "restock",
          reason: "customer_changed_mind",
        };
      });
      setReturnItemsState(initial);
    } else {
      setReturnItemsState({});
    }
  }, [selectedInvoice]);

  // Parse items of selected invoice
  const parsedInvoiceItems = useMemo(() => {
    if (!selectedInvoice) return [];
    if (Array.isArray(selectedInvoice.items)) return selectedInvoice.items;
    try {
      return JSON.parse(selectedInvoice.items || "[]");
    } catch {
      return [];
    }
  }, [selectedInvoice]);

  // Parse customer of selected invoice
  const parsedCustomer = useMemo(() => {
    if (!selectedInvoice?.customer) return null;
    if (typeof selectedInvoice.customer === "object") return selectedInvoice.customer;
    try {
      return JSON.parse(selectedInvoice.customer || "{}");
    } catch {
      return null;
    }
  }, [selectedInvoice]);

  // Selected return items list
  const requestedReturnItems = useMemo<ReturnItemRequest[]>(() => {
    return Object.entries(returnItemsState)
      .filter(([_, state]) => state.qty > 0)
      .map(([id, state]) => ({
        id,
        qty: state.qty,
        condition: state.condition,
        reason: state.reason,
      }));
  }, [returnItemsState]);

  // Calculate live return value (accounting for discounts)
  const currentRefundPreview = useMemo(() => {
    if (!selectedInvoice) return { totalRefund: 0, isPartial: false };
    const items = parsedInvoiceItems;
    const gross = items.reduce(
      (sum: number, it: any) => sum + Number(it.cartQty ?? it.qty ?? 1) * Number(it.unitPrice ?? it.price ?? 0),
      0
    );
    const ratio = gross > 0 ? Number(selectedInvoice.total || 0) / gross : 1;

    const totalRefund = requestedReturnItems.reduce((sum, req) => {
      const it = items.find((x: any) => String(x.id) === String(req.id));
      const price = Number(it?.unitPrice ?? it?.price ?? 0);
      return sum + req.qty * price * ratio;
    }, 0);

    const totalSoldQty = items.reduce((sum: number, it: any) => sum + Number(it.cartQty ?? it.qty ?? 0), 0);
    const totalReturnedQty = requestedReturnItems.reduce((sum, it) => sum + it.qty, 0);
    const isPartial = totalReturnedQty < totalSoldQty;

    return {
      totalRefund: round2(totalRefund),
      isPartial,
    };
  }, [selectedInvoice, parsedInvoiceItems, requestedReturnItems]);

  // Quick action: Select ALL items for 100% full return
  const selectAllForFullReturn = () => {
    if (!selectedInvoice) return;
    const updated: Record<string, { qty: number; condition: ReturnCondition; reason: ReturnReason }> = {};
    parsedInvoiceItems.forEach((it: any) => {
      const soldQty = Number(it.cartQty ?? it.qty ?? 0);
      updated[it.id] = {
        qty: soldQty,
        condition: "restock",
        reason: "wrong_item",
      };
    });
    setReturnItemsState(updated);
  };

  // Stepper handlers
  const updateItemQty = (id: string, maxQty: number, delta: number) => {
    setReturnItemsState((prev) => {
      const current = prev[id] || { qty: 0, condition: "restock", reason: "customer_changed_mind" };
      const nextQty = Math.max(0, Math.min(maxQty, current.qty + delta));
      return {
        ...prev,
        [id]: { ...current, qty: nextQty },
      };
    });
  };

  const updateItemCondition = (id: string, condition: ReturnCondition) => {
    setReturnItemsState((prev) => {
      const current = prev[id] || { qty: 0, condition: "restock", reason: "customer_changed_mind" };
      return {
        ...prev,
        [id]: { ...current, condition },
      };
    });
  };

  const updateItemReason = (id: string, reason: ReturnReason) => {
    setReturnItemsState((prev) => {
      const current = prev[id] || { qty: 0, condition: "restock", reason: "customer_changed_mind" };
      return {
        ...prev,
        [id]: { ...current, reason },
      };
    });
  };

  // Open settlement modal before finalizing
  const handleOpenSettlement = (forceFull: boolean = false) => {
    if (!selectedInvoice) return;
    if (forceFull) {
      selectAllForFullReturn();
    }

    const items = forceFull
      ? parsedInvoiceItems.map((it: any) => ({
          id: it.id,
          qty: Number(it.cartQty ?? it.qty ?? 0),
          condition: (returnItemsState[it.id]?.condition || "restock") as ReturnCondition,
          reason: (returnItemsState[it.id]?.reason || "wrong_item") as ReturnReason,
        }))
      : requestedReturnItems;

    if (!items.length) {
      toast.error(isEn ? "Please select at least 1 item to return" : "يرجى تحديد صنف واحد على الأقل للإرجاع");
      return;
    }

    const settlement = computeRefundSettlement({
      mode: forceFull ? "full" : currentRefundPreview.isPartial ? "partial" : "full",
      sale: selectedInvoice,
      itemsToRefund: items,
      customerDebt: Number(parsedCustomer?.debt || 0),
    });

    setSettlementDraft({
      forceFull,
      items,
      settlement,
      returnPaidMode: settlement.debtToCancel > 0 && settlement.paidAmountToRefund === 0 ? "cash_out" : "cash_out",
    });
    setShowSettlementModal(true);
  };

  // Execute return via API
  const handleExecuteReturn = async () => {
    if (!selectedInvoice || !settlementDraft || !user?.pharmacy_id) return;
    setIsSubmitting(true);

    const { items, settlement, returnPaidMode, forceFull } = settlementDraft;
    const isPartial = !forceFull && currentRefundPreview.isPartial;

    const refundOptions: RefundOptions = {
      returnPaidMode,
      debtToCancel: settlement.debtToCancel,
      paidAmountToRefund: settlement.paidAmountToRefund,
      paymentMethod: selectedInvoice.paymentMethod || "cash",
      customerId: parsedCustomer?.id,
      customerName: parsedCustomer?.name,
      cashierName: user.managerName || user.name || "الكاشير",
      branchName: user.branch || "الفرع الرئيسي",
      branchId: user.branch_id || "",
    };

    try {
      const result = await refundSaleApi({
        pharmacyId: user.pharmacy_id,
        saleId: selectedInvoice.id,
        isPartial,
        itemsToRefund: items,
        refundOptions,
      });

      toast.success(
        isEn
          ? `Return completed! Credit Note #${result.creditNoteNumber || "SAVED"}`
          : `تم تسجيل المرتجع بنجاح! إشعار دائن رقم ${result.creditNoteNumber || "معتمد"}`
      );

      // Refresh sales and returns data
      await mutate(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales`);
      await mutateReturns();

      setShowSettlementModal(false);
      setSelectedInvoice(null);
      setSearchQuery("");

      // Automatically fetch and show credit note for immediate print
      try {
        const cn = await fetchCreditNoteApi(user.pharmacy_id, selectedInvoice.id);
        setActiveCreditNote(cn);
        setShowCreditNoteModal(true);
      } catch (cnErr) {
        console.warn("Auto credit note fetch skipped:", cnErr);
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Failed to process return" : "تعذر إتمام عملية المرتجع"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open credit note modal from history
  const handleViewCreditNote = async (returnId: string) => {
    if (!user?.pharmacy_id) return;
    try {
      const cn = await fetchCreditNoteApi(user.pharmacy_id, returnId);
      setActiveCreditNote(cn);
      setShowCreditNoteModal(true);
    } catch (err: any) {
      toast.error(isEn ? "Failed to load credit note" : "تعذر جلب إشعار الدائن");
    }
  };

  // Filtered returns history
  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return returnsList.filter((r: any) => {
      if (!q) return true;
      const cn = String(r.creditNoteNumber || "").toLowerCase();
      const id = String(r.id || "").toLowerCase();
      const cust = String(r.customer?.name || r.customer || "").toLowerCase();
      const cash = String(r.cashierName || "").toLowerCase();
      return cn.includes(q) || id.includes(q) || cust.includes(q) || cash.includes(q);
    });
  }, [returnsList, historySearch]);

  return (
    <div className="min-h-screen bg-bg pb-12 font-sans" dir={isEn ? "ltr" : "rtl"}>
      <AppBar
        title={isEn ? "Returns & Credit Notes" : "المرتجعات وإشعارات الدائن"}
        backHref="/pos"
      />

      <div className="max-w-6xl mx-auto p-4 mt-2 space-y-6">
        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Total Returns" : "إجمالي المرتجعات"}
            </div>
            <div className="text-[20px] font-black text-coral font-mono">
              {formatCurrency(kpis.totalRefundAmount)}
            </div>
            <div className="text-[10px] text-ink-soft mt-1">
              {kpis.totalReturnsCount} {isEn ? "returns processed" : "عملية إرجاع مسجلة"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Restocked Items" : "أصناف أعيدت للمخزن"}
            </div>
            <div className="text-[20px] font-black text-primary font-mono">
              {kpis.totalRestockedItemsCount} {isEn ? "units" : "عبوة"}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1 font-semibold">
              {isEn ? "Sellable condition (FEFO batch restored)" : "صالح للبيع واسترجاع التشغيلة"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Damaged / Shrinkage" : "تالف وعجز مخزون"}
            </div>
            <div className="text-[20px] font-black text-amber font-mono">
              {kpis.totalDamagedItemsCount} {isEn ? "units" : "عبوة"}
            </div>
            <div className="text-[10px] text-amber-700 mt-1 font-semibold">
              {isEn ? "Written off (Not added to shelf)" : "شطب كخسارة عجز (لا يعود للمخزن)"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Cash Outflow vs Credit" : "تسوية نقدية vs رصيد دائن"}
            </div>
            <div className="text-[15px] font-bold text-slate-800 font-mono">
              كاش: {formatCurrency(kpis.cashRefundsAmount)}
            </div>
            <div className="text-[11px] text-primary font-bold font-mono mt-0.5">
              رصيد/شطب: {formatCurrency(kpis.creditBalanceRefundsAmount + kpis.debtCancelledAmount)}
            </div>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-mint-line shadow-sm w-fit">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
              activeTab === "search"
                ? "bg-primary text-white shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            🔍 {isEn ? "New Return / Search Invoice" : "إرجاع جديد / بحث عن فاتورة"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
              activeTab === "history"
                ? "bg-primary text-white shadow-sm"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            📋 {isEn ? "Returns History & Credit Notes" : "سجل المرتجعات وإشعارات الدائن"}
          </button>
        </div>

        {/* TAB 1: Search & New Return */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Box */}
            <div className="bg-white rounded-2xl p-5 border border-mint-line shadow-sm space-y-3">
              <label className="block text-[13px] font-bold text-ink">
                {isEn ? "Search Invoice by # or Customer Name / Phone:" : "ابحث عن الفاتورة برقمها أو اسم العميل أو الهاتف:"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? "e.g. INV-1002, 0599..., John Doe" : "مثال: INV-1002، 0599...، أحمد خالد"}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-ink focus:outline-none focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-3 text-ink-soft hover:text-ink text-[14px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {invoiceSearchResults.length > 0 && (
                <div className="border border-mint-line rounded-xl overflow-hidden divide-y divide-mint-line bg-white shadow-lg mt-2">
                  {invoiceSearchResults.map((sale: any) => {
                    const cust = typeof sale.customer === "string" ? JSON.parse(sale.customer || "{}") : (sale.customer || {});
                    return (
                      <div
                        key={sale.id}
                        onClick={() => {
                          setSelectedInvoice(sale);
                          setSearchQuery("");
                        }}
                        className="p-3.5 hover:bg-bg cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[13px] font-black text-primary font-mono">
                            #{sale.id}
                          </div>
                          <div className="text-[12px] text-ink-soft font-semibold">
                            {cust?.name || (isEn ? "Walk-in Customer" : "عميل نقدي")} • {sale.branchName || "الفرع الرئيسي"} • {new Date(sale.date || sale.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] font-black text-ink font-mono">
                            {formatCurrency(Number(sale.total || 0))}
                          </div>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {sale.paymentMethod || "نقدي"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Invoice Details & Items Stepper */}
            {selectedInvoice ? (
              <div className="bg-white rounded-2xl p-6 border border-mint-line shadow-sm space-y-6">
                {/* Invoice Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-bg rounded-xl border border-mint-line">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-black text-primary font-mono">
                        #{selectedInvoice.id}
                      </span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                        {selectedInvoice.status || "مكتملة"}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink-soft font-semibold mt-1">
                      {isEn ? "Customer:" : "العميل:"} <strong>{parsedCustomer?.name || (isEn ? "Walk-in" : "نقدي")}</strong> • {isEn ? "Cashier:" : "الكاشير:"} {selectedInvoice.cashierName || "الصيدلي"} • {new Date(selectedInvoice.date || selectedInvoice.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[11px] text-ink-soft font-bold">
                        {isEn ? "Original Total:" : "إجمالي الفاتورة:"}
                      </div>
                      <div className="text-[18px] font-black text-ink font-mono">
                        {formatCurrency(Number(selectedInvoice.total || 0))}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="text-coral hover:bg-coral/10 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                    >
                      {isEn ? "Close" : "إغلاق"}
                    </button>
                  </div>
                </div>

                {/* Items Return Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-black text-ink">
                      {isEn ? "Invoice Items & Return Conditions:" : "أصناف الفاتورة وتحديد حالة المرتجع:"}
                    </h3>
                    <button
                      onClick={selectAllForFullReturn}
                      className="text-[12px] text-primary hover:underline font-bold"
                    >
                      ⚡ {isEn ? "Select all items for full return" : "تحديد جميع الأصناف لإرجاع كامل"}
                    </button>
                  </div>

                  <div className="border border-mint-line rounded-xl overflow-hidden divide-y divide-mint-line">
                    {parsedInvoiceItems.map((item: any) => {
                      const maxQty = Number(item.cartQty ?? item.qty ?? 0);
                      const state = returnItemsState[item.id] || { qty: 0, condition: "restock", reason: "customer_changed_mind" };
                      const isSelected = state.qty > 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 transition-all flex flex-wrap items-center justify-between gap-4 ${
                            isSelected ? "bg-emerald-50/40" : "bg-white"
                          }`}
                        >
                          <div className="min-w-[200px] flex-1">
                            <div className="text-[13px] font-black text-ink">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-ink-soft font-semibold mt-0.5">
                              {formatCurrency(Number(item.unitPrice ?? item.price ?? 0))} / {item.unit || (isEn ? "unit" : "عبوة")} • {isEn ? "Sold Qty:" : "الكمية المباعة:"} {maxQty}
                            </div>
                            {(item.batch_number || item.expiry) && (
                              <div className="text-[10px] text-ink-soft font-mono mt-0.5">
                                تشغيلة: {item.batch_number || "—"} | انتهاء: {item.expiry || "—"}
                              </div>
                            )}
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQty(item.id, maxQty, -1)}
                              disabled={state.qty <= 0}
                              className="w-8 h-8 rounded-lg bg-bg border border-mint-line text-ink font-black hover:bg-mint-line/50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              -
                            </button>
                            <span className="w-10 text-center font-mono font-black text-[14px]">
                              {state.qty}
                            </span>
                            <button
                              onClick={() => updateItemQty(item.id, maxQty, 1)}
                              disabled={state.qty >= maxQty}
                              className="w-8 h-8 rounded-lg bg-bg border border-mint-line text-ink font-black hover:bg-mint-line/50 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          {/* Condition & Reason Selector */}
                          {isSelected && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={state.condition}
                                onChange={(e) => updateItemCondition(item.id, e.target.value as ReturnCondition)}
                                className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border focus:outline-none ${
                                  state.condition === "restock"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                    : "bg-red-50 text-red-800 border-red-300"
                                }`}
                              >
                                {RETURN_CONDITIONS.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {isEn ? c.nameEn : c.nameAr}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={state.reason}
                                onChange={(e) => updateItemReason(item.id, e.target.value as ReturnReason)}
                                className="text-[12px] font-bold bg-bg border border-mint-line rounded-lg px-2.5 py-1.5 text-ink focus:outline-none"
                              >
                                {RETURN_REASONS.map((r) => (
                                  <option key={r.key} value={r.key}>
                                    {isEn ? r.nameEn : r.nameAr}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 bg-bg rounded-xl border border-mint-line flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] text-ink-soft font-bold">
                      {isEn ? "Selected Return Items:" : "الأصناف المحددة للإرجاع:"}{" "}
                      <strong className="text-ink">{requestedReturnItems.length}</strong>
                    </div>
                    <div className="text-[18px] font-black text-coral font-mono">
                      {isEn ? "Total Refund:" : "قيمة المرتجع:"} {formatCurrency(currentRefundPreview.totalRefund)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSettlement(true)}
                      className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-sm"
                    >
                      🔄 {isEn ? "Full Invoice Refund" : "إرجاع الفاتورة كاملة"}
                    </button>
                    <button
                      onClick={() => handleOpenSettlement(false)}
                      disabled={requestedReturnItems.length === 0}
                      className="bg-coral hover:bg-coral/90 text-white px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ✓ {isEn ? "Refund Selected Items" : "إرجاع الأصناف المحددة"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-mint-line text-ink-soft">
                <div className="text-[32px] mb-2">🧾</div>
                <div className="text-[14px] font-bold">
                  {isEn ? "No invoice selected. Search above to begin." : "لم يتم تحديد فاتورة. ابحث أعلاه للبدء بعملية الإرجاع."}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Returns History */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl p-6 border border-mint-line shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[16px] font-black text-primary">
                {isEn ? "Official Returns & Credit Notes Ledger" : "سجل المرتجعات وإشعارات الدائن المعتمدة"}
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={isEn ? "Filter by Credit Note #, Customer..." : "تصفية برقم الإشعار، العميل..."}
                  className="bg-bg border border-mint-line rounded-lg px-3 py-1.5 text-[12px] font-bold text-ink focus:outline-none"
                />

                {branches.length > 0 && (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="bg-bg border border-mint-line rounded-lg px-3 py-1.5 text-[12px] font-bold text-primary focus:outline-none"
                  >
                    <option value="all">{isEn ? "All Branches" : "جميع الفروع"}</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {returnsLoading ? (
              <div className="p-12 text-center text-ink-soft font-bold">
                {isEn ? "Loading returns ledger..." : "جاري تحميل سجل المرتجعات..."}
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-ink-soft font-bold">
                {isEn ? "No return records found." : "لا توجد عمليات إرجاع مسجلة."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[12px]">
                  <thead>
                    <tr className="bg-bg border-b border-mint-line text-ink-soft font-bold">
                      <th className="p-3"># إشعار دائن</th>
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">العميل</th>
                      <th className="p-3">الفرع</th>
                      <th className="p-3">الكاشير</th>
                      <th className="p-3 text-center">المبلغ المسترد</th>
                      <th className="p-3 text-center">نوع الإرجاع</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mint-line">
                    {filteredHistory.map((ret: any) => {
                      const custName = ret.customer?.name || (typeof ret.customer === "string" ? ret.customer : "عميل نقدي");
                      const isFull = ret.status === "refunded";
                      const amt = Math.abs(Number(ret.total || ret.refundedAmount || 0));

                      return (
                        <tr key={ret.id} className="hover:bg-bg/50 transition-all">
                          <td className="p-3 font-mono font-black text-primary">
                            {ret.creditNoteNumber || `CN-${ret.id.replace(/^(REF-|INV-)/, "").slice(0, 8)}`}
                          </td>
                          <td className="p-3 font-mono text-ink-soft">
                            #{ret.notes?.originalSaleId || ret.id}
                          </td>
                          <td className="p-3 text-ink-soft font-mono">
                            {new Date(ret.date || ret.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-ink">
                            {custName}
                          </td>
                          <td className="p-3 text-ink-soft">
                            {ret.branchName || "الفرع الرئيسي"}
                          </td>
                          <td className="p-3 text-ink-soft">
                            {ret.cashierName || "الكاشير"}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-coral">
                            {formatCurrency(amt)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFull
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isFull ? (isEn ? "Full" : "إرجاع كامل") : (isEn ? "Partial" : "إرجاع جزئي")}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleViewCreditNote(ret.id)}
                              className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1 rounded-lg font-bold text-[11px] transition-all"
                            >
                              🖨️ {isEn ? "Credit Note" : "إشعار الدائن"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {showSettlementModal && settlementDraft && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-mint-line shadow-2xl">
            <div className="flex items-center justify-between border-b border-mint-line pb-3">
              <h3 className="text-[16px] font-black text-primary">
                {isEn ? "Confirm Return Settlement" : "تأكيد تسوية مبلغ المرتجع"}
              </h3>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="text-ink-soft hover:text-ink font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-bg p-4 rounded-2xl border border-mint-line">
              <div className="flex justify-between text-[13px]">
                <span className="text-ink-soft font-bold">{isEn ? "Total Refund Amount:" : "إجمالي قيمة المرتجع:"}</span>
                <span className="font-mono font-black text-coral">{formatCurrency(settlementDraft.settlement.refundAmount)}</span>
              </div>

              {settlementDraft.settlement.debtToCancel > 0 && (
                <div className="flex justify-between text-[13px] text-amber-800 font-bold bg-amber-50 p-2 rounded-lg">
                  <span>{isEn ? "Cancel Customer Debt:" : "شطب من ذمم العميل:"}</span>
                  <span className="font-mono">{formatCurrency(settlementDraft.settlement.debtToCancel)}</span>
                </div>
              )}

              <div className="flex justify-between text-[13px] text-primary font-bold">
                <span>{isEn ? "Net Paid Refund:" : "المبلغ المتبقي للصرف:"}</span>
                <span className="font-mono">{formatCurrency(settlementDraft.settlement.paidAmountToRefund)}</span>
              </div>
            </div>

            {/* Payout Channel Selector (if paid refund > 0) */}
            {settlementDraft.settlement.paidAmountToRefund > 0 && (
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-ink block">
                  {isEn ? "How would you like to refund the net amount?" : "كيف ترغب في تسوية المبلغ المتبقي؟"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlementDraft((prev: any) => ({ ...prev, returnPaidMode: "cash_out" }))}
                    className={`p-3 rounded-xl border text-[12px] font-bold text-center transition-all ${
                      settlementDraft.returnPaidMode === "cash_out"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-ink border-mint-line hover:bg-bg"
                    }`}
                  >
                    💵 {isEn ? "Cash Drawer Payout" : "صرف نقدي من الدرج"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementDraft((prev: any) => ({ ...prev, returnPaidMode: "credit_balance" }))}
                    className={`p-3 rounded-xl border text-[12px] font-bold text-center transition-all ${
                      settlementDraft.returnPaidMode === "credit_balance"
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-ink border-mint-line hover:bg-bg"
                    }`}
                  >
                    💳 {isEn ? "Customer Store Credit" : "إيداع كرصيد دائن للعميل"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowSettlementModal(false)}
                className="flex-1 bg-bg hover:bg-mint-line/30 text-ink-soft py-3 rounded-xl font-bold text-[13px] transition-all"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </button>
              <button
                onClick={handleExecuteReturn}
                disabled={isSubmitting}
                className="flex-1 bg-coral hover:bg-coral/90 text-white py-3 rounded-xl font-bold text-[13px] transition-all shadow-md disabled:opacity-50"
              >
                {isSubmitting ? (isEn ? "Processing..." : "جاري التنفيذ...") : (isEn ? "Confirm Return" : "تأكيد واعتماد الإرجاع")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Viewer & Print Modal */}
      {showCreditNoteModal && activeCreditNote && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 border border-mint-line shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-mint-line pb-3">
              <div>
                <h3 className="text-[16px] font-black text-primary">
                  {isEn ? "Official Credit Note" : "إشعار دائن وسند إرجاع رسمي معتمد"}
                </h3>
                <div className="text-[12px] font-mono text-ink-soft">
                  {activeCreditNote.creditNoteNumber}
                </div>
              </div>
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="text-ink-soft hover:text-ink font-bold text-[16px]"
              >
                ✕
              </button>
            </div>

            {/* Document Preview Frame */}
            <div
              className="flex-1 overflow-y-auto border border-mint-line rounded-2xl p-4 bg-white shadow-inner"
              dangerouslySetInnerHTML={{
                __html: buildCreditNoteHtml({
                  creditNote: activeCreditNote,
                  pharmacyName: user?.pharmacyName || "صيدلية روشتة",
                  branchName: user?.branch || "الفرع الرئيسي",
                  language,
                }),
              }}
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-mint-line">
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="bg-bg hover:bg-mint-line/30 text-ink-soft px-5 py-2.5 rounded-xl font-bold text-[13px] transition-all"
              >
                {isEn ? "Close" : "إغلاق"}
              </button>
              <button
                onClick={() =>
                  printCreditNote({
                    creditNote: activeCreditNote,
                    pharmacyName: user?.pharmacyName || "صيدلية روشتة",
                    branchName: user?.branch || "الفرع الرئيسي",
                    language,
                  })
                }
                className="bg-primary hover:opacity-95 text-white px-6 py-2.5 rounded-xl font-bold text-[13px] transition-all shadow-md flex items-center gap-2"
              >
                <span>🖨️</span>
                <span>{isEn ? "Print Vector Credit Note" : "طباعة إشعار الدائن"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
