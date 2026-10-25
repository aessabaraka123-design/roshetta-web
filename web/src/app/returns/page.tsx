"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useMemo, useEffect } from "react";
import AppBar from "@/components/AppBar";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Returns() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const { data: salesData, isLoading } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales`
      : null,
    fetcher,
  );

  const allSales = salesData?.sales || [];

  const isDebtPaymentRecord = (s: any) =>
    s.status === "debt_payment" ||
    s.type === "debt_payment" ||
    String(s.id || "").startsWith("PAY") ||
    String(s.id || "").startsWith("RET-CR") ||
    s.paymentMethod === "debt_payment" ||
    s.paymentMethod === "تسديد دين" ||
    s.paymentMethod === "سداد دين" ||
    s.paymentMethod === "سداد دَين" ||
    s.paymentMethod === "سداد";

  const completedSales = useMemo(
    () =>
      allSales.filter(
        (s: any) =>
          s &&
          s.id &&
          s.status !== "refunded" &&
          s.status !== "refund_proxy" &&
          !String(s.id).startsWith("REF-") &&
          Number(s.total || 0) > 0 &&
          !isDebtPaymentRecord(s),
      ),
    [allSales],
  );
  const refundedSales = useMemo(
    () =>
      allSales.filter(
        (s: any) =>
          s &&
          s.id &&
          (s.status === "refunded" || s.isRefunded || s.is_refunded) &&
          s.status !== "refund_proxy" &&
          !isDebtPaymentRecord(s),
      ),
    [allSales],
  );

  const [activeTab, setActiveTab] = useState<"search" | "history">("search");
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return completedSales
      .filter(
        (s: any) =>
          s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.customer &&
            s.customer.name &&
            s.customer.name.toLowerCase().includes(searchQuery.toLowerCase())),
      )
      .slice(0, 5);
  }, [searchQuery, completedSales]);

  const { data: customersData } = useSWR(
    user ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/customers` : null,
    fetcher,
  );
  const allCustomers = customersData?.customers || [];

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundMode, setRefundMode] = useState<"full" | "partial">("full");

  // Track partial refund quantities: { itemId: qtyToReturn }
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number>>({});

  // Reset partial map when invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      setReturnQtyMap({});
    }
  }, [selectedInvoice]);

  const handleUpdateQty = (itemId: string, maxQty: number, delta: number) => {
    setReturnQtyMap((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      if (next === 0) {
        const newMap = { ...prev };
        delete newMap[itemId];
        return newMap;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const selectedItemsToRefund = useMemo(() => {
    if (!selectedInvoice) return [];
    return Object.entries(returnQtyMap).map(([id, qty]) => ({ id, qty }));
  }, [returnQtyMap, selectedInvoice]);

  const partialRefundTotal = useMemo(() => {
    if (!selectedInvoice) return 0;
    return selectedItemsToRefund.reduce((sum, req) => {
      const item = selectedInvoice.items.find((i: any) => i.id === req.id);
      return sum + (item?.price || 0) * req.qty;
    }, 0);
  }, [selectedItemsToRefund, selectedInvoice]);

  const initiateRefund = (mode: "full" | "partial") => {
    if (!selectedInvoice) return;
    setRefundMode(mode);

    const totalRefund =
      mode === "full"
        ? Number(selectedInvoice.total || 0)
        : partialRefundTotal;

    const customer = selectedInvoice.customer;
    const hasCustomer = !!(customer && customer.id);
    const origPm = (selectedInvoice.paymentMethod || "").toString().trim().toLowerCase();

    let salePayments: any = null;
    try {
      salePayments =
        typeof selectedInvoice.payments === "string"
          ? JSON.parse(selectedInvoice.payments)
          : selectedInvoice.payments;
    } catch (e) {}

    const hasSplitCredit = salePayments && Number(salePayments.credit || 0) > 0;
    const isCreditSale =
      origPm === "credit" ||
      origPm === "آجل" ||
      origPm === "اجل" ||
      origPm === "ذمم" ||
      origPm === "دين" ||
      hasSplitCredit;

    const saleTotal = Number(selectedInvoice.total || 0);
    let creditPart = 0;
    let paidPart = 0;
    let paidMethodName = "نقداً (كاش)";

    const storeCustomer = hasCustomer
      ? allCustomers.find((c: any) => c.id === customer.id) || customer
      : null;

    if (hasSplitCredit) {
      creditPart = Number(salePayments.credit || 0);
      paidPart = Math.max(0, saleTotal - creditPart);
      if (Number(salePayments.jawwal_pay || salePayments.jawwalpay) > 0)
        paidMethodName = "جوال باي";
      else if (Number(salePayments.palpay) > 0) paidMethodName = "بال باي";
      else if (Number(salePayments.card) > 0) paidMethodName = "بطاقة بنكية";
      else if (Number(salePayments.bank) > 0) paidMethodName = "تحويل بنكي";
      else paidMethodName = "نقداً (كاش)";
    } else if (isCreditSale) {
      const currentDebt = Number(storeCustomer?.debt || 0);
      if (currentDebt < saleTotal) {
        paidPart = Math.max(0, saleTotal - currentDebt);
        creditPart = Math.max(0, saleTotal - paidPart);
      } else {
        creditPart = saleTotal;
        paidPart = 0;
      }
    } else {
      paidPart = saleTotal;
      creditPart = 0;
      if (origPm === "jawwalpay" || origPm === "jawwal") paidMethodName = "جوال باي";
      else if (origPm === "palpay") paidMethodName = "بال باي";
      else if (origPm === "card") paidMethodName = "بطاقة بنكية";
      else if (origPm === "bank") paidMethodName = "تحويل بنكي";
      else paidMethodName = "نقداً (كاش)";
    }

    const debtToCancel = Math.min(totalRefund, creditPart);
    const paidAmountToRefund = Math.max(0, totalRefund - debtToCancel);

    // إذا كان العميل موجوداً ودفع جزءاً من الفاتورة (> 0): إظهار نافذة التسوية للاختيار
    if (hasCustomer && paidAmountToRefund > 0) {
      const currentDebt = Number(storeCustomer?.debt || 0);
      const previousOtherDebt = Math.max(0, currentDebt - debtToCancel);
      setSettlementData({
        mode,
        totalRefund,
        debtToCancel,
        paidAmountToRefund,
        paidMethodName,
        customer: storeCustomer,
        previousOtherDebt,
      });
      setShowSettlementModal(true);
      return;
    }

    // الحالة الأولى: فاتورة ذمم لم يدفع منها شيء (100% دين) أو لا يوجد عميل
    setShowConfirmModal(true);
  };

  const handleRefund = async (customOptions?: any) => {
    if (!selectedInvoice) return;
    setIsRefunding(true);

    const totalRefund =
      refundMode === "full"
        ? Number(selectedInvoice.total || 0)
        : partialRefundTotal;

    const refundOptions = customOptions || {
      returnPaidMode: "cash_out",
      debtToCancel: totalRefund,
      paidAmountToRefund: 0,
      paymentMethod: selectedInvoice.paymentMethod || "cash",
      customerId: selectedInvoice.customer?.id,
      customerName: selectedInvoice.customer?.name,
    };

    try {
      let res;
      if (refundMode === "full") {
        res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales/${selectedInvoice.id}/refund`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refundOptions }),
          },
        );
      } else {
        res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales/${selectedInvoice.id}/refund_partial`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemsToRefund: selectedItemsToRefund,
              totalRefund,
              refundOptions,
            }),
          },
        );
      }

      const result = await res.json();

      if (result.success) {
        const successMsg =
          refundOptions.returnPaidMode === "credit_balance" &&
          refundOptions.paidAmountToRefund > 0
            ? language === "en"
              ? `Refund completed and ₪${refundOptions.paidAmountToRefund.toFixed(2)} credited to customer balance!`
              : `تم الاسترجاع وتحويل ${refundOptions.paidAmountToRefund.toFixed(2)} ₪ لرصيد الزبون بنجاح!`
            : refundMode === "full"
              ? language === "en"
                ? "Invoice refunded successfully!"
                : "تم استرجاع الفاتورة بنجاح!"
              : language === "en"
                ? "Items refunded successfully!"
                : "تم استرجاع الأصناف بنجاح!";

        toast.success(successMsg);
        setSelectedInvoice(null);
        setSearchQuery("");
        mutate(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/sales`);
        mutate(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory`);
        mutate(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`);
        mutate(`${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/customers`);
      } else {
        toast.error(result.error || (language === "en" ? "Failed to refund" : "فشل في الاسترجاع"));
      }
    } catch (e) {
      toast.error(language === "en" ? "Error connecting to server" : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsRefunding(false);
      setShowConfirmModal(false);
      setShowSettlementModal(false);
      setSettlementData(null);
    }
  };

  return (
    <main className="w-full pb-24 relative">
      <AppBar title={language === "en" ? "Returns" : "المرتجعات"} backHref="/" />

      <div className="max-w-4xl mx-auto p-4 mt-4 space-y-8">
        {/* Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-mint-line p-1">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all ${activeTab === "search" ? "bg-primary text-white shadow-md" : "text-ink-soft hover:bg-mint-bg"}`}
          >
            {language === "en" ? "Refund Invoice/Items" : "استرجاع فاتورة / أصناف"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-[15px] font-bold rounded-xl transition-all ${activeTab === "history" ? "bg-primary text-white shadow-md" : "text-ink-soft hover:bg-mint-bg"}`}
          >
            {language === "en" ? "Returns History" : "سجل المرتجعات"}
          </button>
        </div>

        {activeTab === "search" && (
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-mint-line space-y-6">
            <h2 className="text-[20px] font-black text-primary">
              {language === "en" ? "Search for invoice to refund" : "البحث عن فاتورة لاسترجاعها"}
            </h2>

            <div className="relative">
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-ink-soft"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "en" ? "Search by invoice number (e.g. INV...) or customer name..." : "ابحث برقم الفاتورة (مثال: INV...) أو اسم العميل..."}
                className="w-full bg-bg border-2 border-mint-line rounded-2xl pr-12 pl-4 py-4 text-[16px] font-bold text-ink focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            {searchQuery && searchResults.length > 0 && !selectedInvoice && (
              <div className="bg-bg border border-mint-line rounded-2xl overflow-hidden shadow-inner">
                {searchResults.map((sale: any) => (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedInvoice(sale)}
                    className="p-4 border-b border-mint-line last:border-0 hover:bg-mint-bg cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div
                        className="font-bold text-primary text-[15px]"
                        dir="ltr"
                      >
                        {sale.id}
                      </div>
                      <div className="text-[13px] text-ink-soft mt-1 flex items-center gap-2">
                        <span>{new Date(sale.date).toLocaleString(language === "en" ? "en-US" : language === "en" ? "en-US" : "ar-EG")}</span>
                        <span className="w-1 h-1 rounded-full bg-mint-line"></span>
                        <span className="font-bold text-teal">{sale.branchName || (language === "en" ? "Main" : "الرئيسي")}</span>
                      </div>
                    </div>
                    <div className="text-start">
                      <div className="font-mono font-bold text-ink text-[16px]">
                        {sale.total.toLocaleString()} ₪
                      </div>
                      <div className="text-[12px] bg-teal-pale text-teal px-2 py-0.5 rounded-md mt-1 inline-block">
                        {sale.items.length} {language === "en" ? "Items" : "أصناف"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !selectedInvoice && (
              <div className="text-center p-8 text-ink-soft font-bold bg-bg rounded-2xl border border-mint-line">
                {language === "en" ? "No matching invoice found." : "لم يتم العثور على أي فاتورة متطابقة."}
              </div>
            )}

            {/* Selected Invoice Details */}
            {selectedInvoice && (
              <div className="mt-8 bg-white border-2 border-primary/20 rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-primary/5 p-4 border-b border-primary/10 flex justify-between items-start">
                  <div>
                    <h3 className="text-[18px] font-black text-primary mb-1 flex items-center gap-2">
                      {language === "en" ? "Invoice Details:" : "تفاصيل الفاتورة:"}{" "}
                      <span
                        className="font-mono text-ink bg-white px-2 py-0.5 rounded-md border border-mint-line"
                        dir="ltr"
                      >
                        {selectedInvoice.id}
                      </span>
                    </h3>
                    <p className="text-[14px] text-ink-soft">
                      {new Date(selectedInvoice.date).toLocaleString(language === "en" ? "en-US" : language === "en" ? "en-US" : "ar-EG")}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-ink-soft hover:text-red-500 font-bold text-[13px] bg-white px-3 py-1.5 rounded-lg border border-mint-line"
                  >
                    {language === "en" ? "Deselect" : "إلغاء التحديد"}
                  </button>
                </div>

                <div className="p-4">
                  <div className="bg-orange-50 text-orange-800 p-3 rounded-xl mb-4 text-[13px] font-bold flex gap-2 items-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4" />
                      <path d="M12 16h.01" />
                    </svg>
                    {language === "en" ? "You can refund the entire invoice, or specify quantities for each item to refund partially." : "يمكنك استرجاع الفاتورة بالكامل، أو تحديد كميات معينة لكل صنف لاسترجاعها جزئياً."}
                  </div>

                  <table className="w-full text-start mb-4 border-collapse">
                    <thead>
                      <tr className="text-[12px] text-ink-soft border-b border-mint-line">
                        <th className="pb-2 font-bold w-1/3 text-start">{language === "en" ? "Item" : "الصنف"}</th>
                        <th className="pb-2 font-bold text-start">{language === "en" ? "Sold" : "المباع"}</th>
                        <th className="pb-2 font-bold text-center">
                          {language === "en" ? "Returned Qty" : "الكمية المسترجعة"}
                        </th>
                        <th className="pb-2 font-bold text-start">
                          {language === "en" ? "Refund Value" : "قيمة الاسترجاع"}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item: any, idx: number) => {
                        const maxQty = item.cartQty || item.qty;
                        const returned = returnQtyMap[item.id] || 0;
                        return (
                          <tr
                            key={idx}
                            className="border-b border-mint-line/30 last:border-0 hover:bg-mint-bg/30"
                          >
                            <td className="py-4 text-[14px] font-bold text-ink">
                              {item.name}
                            </td>
                            <td className="py-4 text-[14px] font-mono text-ink-soft">
                              {maxQty}
                            </td>
                            <td className="py-4 text-center">
                              <div className="inline-flex items-center gap-3 bg-bg border border-mint-line p-1 rounded-lg">
                                <button
                                  onClick={() =>
                                    handleUpdateQty(item.id, maxQty, 1)
                                  }
                                  disabled={returned >= maxQty}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-primary hover:bg-mint-bg disabled:opacity-30"
                                >
                                  +
                                </button>
                                <span className="font-mono font-bold text-[15px] w-4 text-center">
                                  {returned}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateQty(item.id, maxQty, -1)
                                  }
                                  disabled={returned <= 0}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-red-500 hover:bg-red-50 disabled:opacity-30"
                                >
                                  -
                                </button>
                              </div>
                            </td>
                            <td className="py-4 text-[14px] font-mono font-bold text-red-500 text-start">
                              {returned > 0
                                ? `-${(item.price * returned).toLocaleString()} ₪`
                                : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex flex-col md:flex-row justify-between items-center bg-bg p-4 rounded-xl border border-mint-line gap-4">
                    <div className="text-center md:text-start">
                      <div className="font-bold text-ink-soft text-[13px] mb-1">
                        {language === "en" ? "Previously Paid Total:" : "الإجمالي المدفوع سابقاً:"}
                      </div>
                      <div className="font-mono font-bold text-[18px] text-ink">
                        {selectedInvoice.total.toLocaleString()} ₪
                      </div>
                    </div>
                    {partialRefundTotal > 0 && (
                      <div className="text-center md:text-end bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                        <div className="font-bold text-red-600 text-[13px] mb-1">
                          {language === "en" ? "Current Refund Total:" : "إجمالي المرتجع الآن:"}
                        </div>
                        <div className="font-mono font-black text-[20px] text-red-600">
                          -{partialRefundTotal.toLocaleString()} ₪
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                    {selectedItemsToRefund.length > 0 && (
                      <button
                        onClick={() => initiateRefund("partial")}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        {language === "en" ? "Refund Selected Items" : "استرجاع الأصناف المحددة"}
                      </button>
                    )}
                    <button
                      onClick={() => initiateRefund("full")}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      {language === "en" ? "Refund Entire Invoice" : "استرجاع الفاتورة بالكامل"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-mint-line">
            <h2 className="text-[20px] font-black text-primary mb-6">
              {language === "en" ? "Fully Refunded Invoices History" : "سجل الفواتير المسترجعة (كلياً)"}
            </h2>

            {refundedSales.length === 0 ? (
              <div className="text-center p-12 text-ink-soft font-bold bg-bg rounded-2xl border border-mint-line">
                {language === "en" ? "No fully refunded invoices. (Partial refunds remain visible in sales with updated totals)." : "لا توجد فواتير مسترجعة كلياً. (المرتجعات الجزئية تظل ظاهرة في المبيعات مع تحديث إجمالي الفاتورة)."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-bg text-ink-soft text-[14px]">
                      <th className="p-4 font-bold rounded-tr-xl rounded-br-xl text-start">
                        {language === "en" ? "Invoice No" : "رقم الفاتورة"}
                      </th>
                      <th className="p-4 font-bold text-start">{language === "en" ? "Date" : "التاريخ"}</th>
                      <th className="p-4 font-bold text-start">
                        {language === "en" ? "Invoice Value (Pre-refund)" : "قيمة الفاتورة (قبل الاسترجاع)"}
                      </th>
                      <th className="p-4 font-bold text-start">
                        {language === "en" ? "Branch" : "الفرع"}
                      </th>
                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl text-start">
                        {language === "en" ? "Cashier" : "الكاشير"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundedSales.map((sale: any) => (
                      <tr
                        key={sale.id}
                        className="border-b border-mint-line last:border-0 hover:bg-mint-bg/50 transition-colors"
                      >
                        <td className="p-4">
                          <div
                            className="text-[15px] font-mono font-bold text-ink"
                            dir="ltr"
                          >
                            {sale.id}
                          </div>
                          <div className="text-[12px] bg-red-100 text-red-600 px-2 py-0.5 rounded mt-1 inline-block font-bold">
                            {language === "en" ? "Fully Refunded" : "مسترجعة كلياً"}
                          </div>
                        </td>
                        <td className="p-4 text-[14px] text-ink-soft">
                          {new Date(sale.date).toLocaleString(language === "en" ? "en-US" : language === "en" ? "en-US" : "ar-EG")}
                        </td>
                        <td className="p-4 text-[15px] font-mono font-bold text-red-500">
                          {sale.total.toLocaleString()} ₪
                        </td>
                        <td className="p-4 text-[14px] font-bold text-ink-soft">
                          {sale.branchName || (language === "en" ? "Main" : "الرئيسي")}
                        </td>
                        <td className="p-4 text-[14px] font-bold text-primary">
                          {sale.cashierName || (language === "en" ? "Unknown" : "غير معروف")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 text-red-500/10">
              <svg
                width="150"
                height="150"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </div>

              <h2 className="text-[22px] font-black text-ink mb-2">
                {refundMode === "full"
                  ? language === "en" ? "Refund Entire Invoice?" : "استرجاع الفاتورة بالكامل؟"
                  : language === "en" ? "Refund Selected Items?" : "استرجاع الأصناف المحددة؟"}
              </h2>

              <p className="text-[15px] font-medium text-ink-soft mb-6 leading-relaxed">
                {refundMode === "full" ? (
                  <>
                    {language === "en" ? "All items for invoice " : "سيتم إرجاع جميع الأصناف للفاتورة "}
                    <span
                      className="font-mono font-bold text-primary"
                      dir="ltr"
                    >
                      {selectedInvoice.id}
                    </span>{" "}
                    {language === "en" ? " will be returned to stock." : "إلى المخزون."}
                  </>
                ) : (
                  <>
                    {language === "en" ? "Will return " : "سيتم إرجاع "}
                    <span className="font-bold text-red-500">
                      {selectedItemsToRefund.length}
                    </span>{" "}
                    {language === "en" ? " selected items valued at " : "أصناف محددة بقيمة "}
                    <span className="font-mono font-bold text-red-500">
                      {partialRefundTotal} ₪
                    </span>{" "}
                    {language === "en" ? " to stock." : "إلى المخزون."}
                  </>
                )}
                <br />
                <br />
                <span className="text-red-500 font-bold">{language === "en" ? "Note:" : "ملاحظة:"}</span> {language === "en" ? " This action cannot be undone after confirmation." : "لا يمكنك التراجع عن هذه العملية بعد التأكيد."}
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleRefund()}
                  disabled={isRefunding}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRefunding ? (language === "en" ? "Refunding..." : "جارٍ الاسترجاع...") : (language === "en" ? "Confirm Refund" : "تأكيد الاسترجاع")}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isRefunding}
                  className="px-6 py-3.5 font-bold text-ink-soft bg-bg border border-mint-line hover:bg-mint-bg rounded-xl transition-colors disabled:opacity-50"
                >
                  {language === "en" ? "Cancel" : "إلغاء"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Debt & Credit Settlement Modal */}
      {showSettlementModal && settlementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-7 relative overflow-hidden border border-mint-line">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-mint-line">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[18px] font-black text-ink">
                    {language === "en" ? "Refund Settlement Choice" : "تسوية مستحقات المرتجع للزبون"}
                  </h3>
                  <p className="text-[13px] font-bold text-ink-soft">
                    {settlementData.customer?.name} ({settlementData.customer?.phone || settlementData.customer?.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="w-8 h-8 rounded-full bg-bg hover:bg-mint-bg flex items-center justify-center text-ink-soft transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Breakdown Card */}
            <div className="bg-[#F8FAFC] border border-mint-line rounded-2xl p-4 space-y-2.5 mb-5 text-[14px]">
              <div className="flex justify-between items-center text-ink-soft">
                <span>{language === "en" ? "Total Refund Amount:" : "إجمالي المبلغ المسترجع:"}</span>
                <span className="font-mono font-black text-[16px] text-ink">
                  {settlementData.totalRefund?.toFixed(2)} ₪
                </span>
              </div>

              {settlementData.debtToCancel > 0 && (
                <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span className="font-bold">{language === "en" ? "Drop remaining invoice debt:" : "إسقاط الذمم المتبقية من الفاتورة:"}</span>
                  <span className="font-mono font-black text-[15px]">
                    -{settlementData.debtToCancel?.toFixed(2)} ₪
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                <span className="font-bold">
                  {language === "en" ? `Paid portion to settle (${settlementData.paidMethodName}):` : `المبلغ المدفوع مسبقاً (${settlementData.paidMethodName}):`}
                </span>
                <span className="font-mono font-black text-[16px]">
                  {settlementData.paidAmountToRefund?.toFixed(2)} ₪
                </span>
              </div>

              {settlementData.previousOtherDebt > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[12px] flex items-center gap-2">
                  <span className="text-[16px]">⚠️</span>
                  <span>
                    {language === "en"
                      ? `Customer has other previous debt of ₪${settlementData.previousOtherDebt.toFixed(2)} unrelated to this returned invoice.`
                      : `ملاحظة: على الزبون ديون سابقة أخرى بقيمة (${settlementData.previousOtherDebt.toFixed(2)} ₪) غير مرتبطة بهذه الفاتورة.`}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[12px] flex items-center gap-2">
                  <span className="text-[16px]">✅</span>
                  <span>
                    {language === "en"
                      ? "Customer account is clean with no previous debt."
                      : "حساب الزبون صافٍ ولا توجد عليه أي ديون سابقة."}
                  </span>
                </div>
              )}
            </div>

            {/* Prompt */}
            <p className="text-[14px] font-bold text-ink mb-3 text-start">
              {language === "en"
                ? `Choose how to handle the paid amount (₪${settlementData.paidAmountToRefund?.toFixed(2)}):`
                : `حدد رغبة الزبون في استرجاع المبلغ المدفوع (${settlementData.paidAmountToRefund?.toFixed(2)} ₪):`}
            </p>

            {/* 2 Main Action Buttons */}
            <div className="space-y-3">
              {/* Button 1: Credit Balance */}
              <button
                onClick={() => {
                  handleRefund({
                    returnPaidMode: "credit_balance",
                    debtToCancel: settlementData.debtToCancel,
                    paidAmountToRefund: settlementData.paidAmountToRefund,
                    paymentMethod: selectedInvoice.paymentMethod || "cash",
                    customerId: settlementData.customer?.id,
                    customerName: settlementData.customer?.name,
                  });
                }}
                disabled={isRefunding}
                className="w-full p-4 rounded-2xl bg-[#1E3A8A] hover:bg-[#1E40AF] text-white text-start transition-all shadow-md shadow-blue-900/20 flex items-center gap-4 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-black text-[15px] text-white">
                    {language === "en" ? "Transfer to Customer Credit Balance" : "تحويل إلى رصيد الزبون (مستحق له)"}
                  </div>
                  <div className="text-[12px] text-blue-200 mt-0.5">
                    {settlementData.previousOtherDebt > 0
                      ? (language === "en" ? `Deduct from previous debt (₪${settlementData.previousOtherDebt.toFixed(2)})` : `سداد وخصم من ديونه السابقة المتبقية (${settlementData.previousOtherDebt.toFixed(2)} ₪)`)
                      : (language === "en" ? "Add as store credit for future purchases (shows in green)" : "قيد المبلغ كرصيد دائن مستحق له للشراء به لاحقاً (يظهر بالأخضر)")}
                  </div>
                </div>
              </button>

              {/* Button 2: Cash Out */}
              <button
                onClick={() => {
                  handleRefund({
                    returnPaidMode: "cash_out",
                    debtToCancel: settlementData.debtToCancel,
                    paidAmountToRefund: settlementData.paidAmountToRefund,
                    paymentMethod: selectedInvoice.paymentMethod || "cash",
                    customerId: settlementData.customer?.id,
                    customerName: settlementData.customer?.name,
                  });
                }}
                disabled={isRefunding}
                className="w-full p-4 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white text-start transition-all shadow-md shadow-emerald-900/20 flex items-center gap-4 group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-black text-[15px] text-white">
                    {language === "en" ? `Receive Remaining Amount (${settlementData.paidMethodName})` : `استلام باقي المبلغ (${settlementData.paidMethodName})`}
                  </div>
                  <div className="text-[12px] text-emerald-200 mt-0.5">
                    {language === "en"
                      ? "Pay out to customer now without touching previous debts"
                      : "إرجاع المبلغ للزبون بيده فوراً دون المساس بأي ديون سابقة"}
                  </div>
                </div>
              </button>

              {/* Cancel Button */}
              <button
                onClick={() => setShowSettlementModal(false)}
                disabled={isRefunding}
                className="w-full py-3 rounded-xl border border-mint-line text-ink-soft hover:bg-bg font-bold text-[14px] transition-colors"
              >
                {language === "en" ? "Cancel" : "إلغاء التراجع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
