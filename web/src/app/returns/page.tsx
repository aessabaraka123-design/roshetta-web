"use client";

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

  if (!user) {
    if (typeof window !== "undefined") router.push("/login");
    return null;
  }

  const { data: salesData, isLoading } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/sales`
      : null,
    fetcher,
  );

  const allSales = salesData?.sales || [];

  const completedSales = useMemo(
    () => allSales.filter((s: any) => s.status !== "refunded"),
    [allSales],
  );
  const refundedSales = useMemo(
    () => allSales.filter((s: any) => s.status === "refunded"),
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

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  const handleRefund = async () => {
    if (!selectedInvoice) return;
    setIsRefunding(true);
    try {
      let res;
      if (refundMode === "full") {
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/sales/${selectedInvoice.id}/refund`,
          {
            method: "PUT",
          },
        );
      } else {
        res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/sales/${selectedInvoice.id}/refund_partial`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemsToRefund: selectedItemsToRefund }),
          },
        );
      }

      const result = await res.json();

      if (result.success) {
        toast.success(
          refundMode === "full"
            ? language === "en" ? "Invoice refunded successfully!" : "تم استرجاع الفاتورة بنجاح!"
            : language === "en" ? "Items refunded successfully!" : "تم استرجاع الأصناف بنجاح!",
        );
        setSelectedInvoice(null);
        setSearchQuery("");
        mutate(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/sales`,
        );
        mutate(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`,
        );
        mutate(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/dashboard`,
        );
      } else {
        toast.error(result.error || (language === "en" ? "Failed to refund" : "فشل في الاسترجاع"));
      }
    } catch (e) {
      toast.error(language === "en" ? "Error connecting to server" : "حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setIsRefunding(false);
      setShowConfirmModal(false);
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
                        <span>{new Date(sale.date).toLocaleString(language === "en" ? "en-US" : "ar-EG")}</span>
                        <span className="w-1 h-1 rounded-full bg-mint-line"></span>
                        <span className="font-bold text-teal">{sale.branchName || (language === "en" ? "Main" : "الرئيسي")}</span>
                      </div>
                    </div>
                    <div className="text-end">
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
                      {new Date(selectedInvoice.date).toLocaleString(language === "en" ? "en-US" : "ar-EG")}
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
                        <th className="pb-2 font-bold w-1/3">{language === "en" ? "Item" : "الصنف"}</th>
                        <th className="pb-2 font-bold">{language === "en" ? "Sold" : "المباع"}</th>
                        <th className="pb-2 font-bold text-center">
                          {language === "en" ? "Returned Qty" : "الكمية المسترجعة"}
                        </th>
                        <th className="pb-2 font-bold text-end">
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
                            <td className="py-4 text-[14px] font-mono font-bold text-red-500 text-end">
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
                        onClick={() => {
                          setRefundMode("partial");
                          setShowConfirmModal(true);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        {language === "en" ? "Refund Selected Items" : "استرجاع الأصناف المحددة"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setRefundMode("full");
                        setShowConfirmModal(true);
                      }}
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
                      <th className="p-4 font-bold rounded-tr-xl rounded-br-xl">
                        {language === "en" ? "Invoice No" : "رقم الفاتورة"}
                      </th>
                      <th className="p-4 font-bold">{language === "en" ? "Date" : "التاريخ"}</th>
                      <th className="p-4 font-bold">
                        {language === "en" ? "Invoice Value (Pre-refund)" : "قيمة الفاتورة (قبل الاسترجاع)"}
                      </th>
                      <th className="p-4 font-bold">
                        {language === "en" ? "Branch" : "الفرع"}
                      </th>
                      <th className="p-4 font-bold rounded-tl-xl rounded-bl-xl">
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
                          {new Date(sale.date).toLocaleString(language === "en" ? "en-US" : "ar-EG")}
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
                  onClick={handleRefund}
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
    </main>
  );
}
