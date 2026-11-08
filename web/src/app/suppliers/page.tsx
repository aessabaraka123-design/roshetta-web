"use client";
import { API_BASE_URL } from "@/lib/config";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { useStore } from "@/store";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";

const API_BASE = API_BASE_URL;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SuppliersPage() {
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const pharmacyId = user?.pharmacy_id;

  const { data, error, mutate } = useSWR(
    pharmacyId ? `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers` : null,
    fetcher,
  );
  const suppliers = data?.suppliers;

  const { data: invoicesData, mutate: mutateInvoices } = useSWR(
    pharmacyId
      ? `${API_BASE}/api/pharmacies/${pharmacyId}/purchase-invoices`
      : null,
    fetcher,
  );
  const invoices = invoicesData?.invoices || [];

  const getInvoiceEffectiveRemaining = (inv: any, supplier?: any) => {
    if (!inv || inv.status === "draft") return 0;
    const supp =
      supplier ||
      (inv.supplier_id
        ? suppliers?.find((s: any) => s.id === inv.supplier_id)
        : inv.supplier_name
        ? suppliers?.find((s: any) => s.name === inv.supplier_name)
        : null);
    if (supp && Number(supp.balance) <= 0) {
      return 0;
    }
    const rawRem = Number(
      inv.remaining !== undefined && inv.remaining !== null
        ? inv.remaining
        : Number(inv.total_cost || 0) - Number(inv.paid_amount || 0)
    );
    return Math.max(0, rawRem);
  };

  const getInvoiceEffectivePaid = (inv: any, supplier?: any) => {
    if (!inv) return 0;
    if (inv.status === "draft") return Number(inv.paid_amount || 0);
    const supp =
      supplier ||
      (inv.supplier_id
        ? suppliers?.find((s: any) => s.id === inv.supplier_id)
        : inv.supplier_name
        ? suppliers?.find((s: any) => s.name === inv.supplier_name)
        : null);
    if (supp && Number(supp.balance) <= 0) {
      return Number(inv.total_cost || 0);
    }
    return Number(inv.paid_amount || 0);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("كاش / نقدي");
  const [isPaying, setIsPaying] = useState(false);
  const [viewingSupplierInvoices, setViewingSupplierInvoices] =
    useState<any>(null);
  const [viewingInvoiceDetails, setViewingInvoiceDetails] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
  });

  const [statementSupplier, setStatementSupplier] = useState<any>(null);
  const { data: statementData } = useSWR(
    pharmacyId && statementSupplier
      ? `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers/${statementSupplier.id}/transactions`
      : null,
    fetcher,
  );

  const serverTransactions = statementData?.transactions || [];
  const transactions = useMemo(() => {
    if (!statementSupplier) return [];
    if (serverTransactions && serverTransactions.length > 0) return serverTransactions;

    // Fallback directly from invoices loaded on the page to mirror mobile app logic
    const suppId = statementSupplier.id;
    const suppName = (statementSupplier.name || "").trim().toLowerCase();
    const fallbackList: any[] = [];

    (invoices || []).forEach((inv: any) => {
      const matchId = inv.supplier_id && String(inv.supplier_id) === String(suppId);
      const matchName = suppName && (inv.supplier_name || "").toLowerCase().includes(suppName);
      if (matchId || matchName) {
        const total = Number(inv.total_cost || inv.total || 0);
        const paid = Number(inv.paid_amount != null ? inv.paid_amount : (inv.paid || 0));
        const rem = Number(inv.remaining != null ? inv.remaining : Math.max(0, total - paid));
        const invNum = inv.invoice_number || inv.id;
        const branch = inv.branch_id || inv.branch || "";

        fallbackList.push({
          id: `PURCH-${inv.id}`,
          type: paid >= total && total > 0 ? "payment" : (paid > 0 ? "partial_payment" : "invoice"),
          invoice_number: invNum,
          amount: total,
          paid_amount: paid,
          remaining: rem,
          notes: `فاتورة مشتريات #${invNum} (الإجمالي: ₪${total.toFixed(2)}${paid > 0 ? ` - المسدد: ₪${paid.toFixed(2)}` : ""}${rem > 0 ? ` - المتبقي: ₪${rem.toFixed(2)}` : ""})${branch ? ` [${branch}]` : ""}`,
          date: inv.date || new Date().toISOString(),
          method: inv.paymentMethod || inv.payment_method || "كاش",
          branch: branch,
        });
      }
    });

    return fallbackList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [statementSupplier, serverTransactions, invoices]);

  const totalPaidInStatement = useMemo(() => {
    return (transactions || []).reduce((sum: number, tx: any) => {
      const p = tx.paid_amount != null ? Number(tx.paid_amount) : (tx.type === 'payment' || tx.type === 'voucher' ? Number(tx.amount || 0) : 0);
      return sum + (p > 0 ? p : 0);
    }, 0);
  }, [transactions]);

  // Clean sequential payment voucher numbering (#001, #002...)
  const formattedTransactions = useMemo(() => {
    const paymentList = [...(transactions || [])]
      .filter((tx: any) => {
        const hasInvoiceNumber = tx.invoice_number && String(tx.invoice_number).trim() && !String(tx.invoice_number).startsWith('STX-') && !String(tx.invoice_number).startsWith('EXP-');
        return !hasInvoiceNumber && tx.type !== 'invoice';
      })
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());

    const voucherNumMap = new Map<string, string>();
    paymentList.forEach((tx, index) => {
      const serial = String(index + 1).padStart(3, '0');
      voucherNumMap.set(String(tx.id), language === 'en' ? `PV-${serial}` : `سند #${serial}`);
    });

    return (transactions || []).map((tx: any) => {
      const hasInvoiceNumber = tx.invoice_number && String(tx.invoice_number).trim() && !String(tx.invoice_number).startsWith('STX-') && !String(tx.invoice_number).startsWith('EXP-');
      
      let displayRef = "";
      let isVoucherSerial = false;
      if (hasInvoiceNumber) {
        displayRef = tx.invoice_number;
      } else {
        displayRef = voucherNumMap.get(String(tx.id)) || (language === 'en' ? 'PV-001' : 'سند #001');
        isVoucherSerial = true;
      }

      const rawRef = tx.invoice_number || tx.reference_id || tx.id || "—";

      return {
        ...tx,
        displayRef,
        isVoucherSerial,
        rawRef
      };
    });
  }, [transactions, language]);

  const totalSuppliers = suppliers?.length || 0;
  const totalDebt =
    suppliers?.reduce(
      (sum: number, s: any) => sum + (Number(s.balance) > 0 ? Number(s.balance) : 0),
      0,
    ) || 0;
  const totalCredit =
    suppliers?.reduce(
      (sum: number, s: any) => sum + (Number(s.balance) < 0 ? Math.abs(Number(s.balance)) : 0),
      0,
    ) || 0;

  const handleOpenModal = (supplier: any = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        company: supplier.company || "",
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        company: "",
        notes: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId) return;

    try {
      const url = editingSupplier
        ? `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers/${editingSupplier.id}`
        : `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers`;

      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save supplier");

      toast.success(
        editingSupplier ? (language === 'en' ? 'Supplier updated successfully' : "تم تعديل المورد بنجاح") : (language === 'en' ? 'Supplier added successfully' : "تم إضافة المورد بنجاح"),
      );
      mutate();
      handleCloseModal();
    } catch (err) {
      toast.error(language === 'en' ? 'An error occurred while saving' : "حدث خطأ أثناء الحفظ");
    }
  };

  const handleOpenPaymentModal = (e: React.MouseEvent, supplier: any) => {
    e.stopPropagation(); // prevent opening invoices
    setPayingSupplier(supplier);
    setPaymentAmount("");
    setPaymentMethod("كاش");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId || !payingSupplier) return;
    setIsPaying(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers/${payingSupplier.id}/payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parseFloat(paymentAmount),
            paymentMethod,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to process payment");

      toast.success(language === 'en' ? 'Payment processed successfully' : "تم تسجيل الدفعة بنجاح");
      mutate();
      mutateInvoices();
      setIsPaymentModalOpen(false);
      setPayingSupplier(null);
    } catch (err) {
      toast.error(language === 'en' ? 'Error processing payment' : "حدث خطأ أثناء التسديد");
    } finally {
      setIsPaying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!pharmacyId) return;
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this supplier?' : "هل أنت متأكد من حذف هذا المورد؟")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to delete supplier");

      toast.success(language === 'en' ? 'Supplier deleted successfully' : "تم حذف المورد بنجاح");
      mutate();
    } catch (err) {
      toast.error(language === 'en' ? 'An error occurred while deleting' : "حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans" dir={language === 'en' ? 'ltr' : 'rtl'}>
      <AppBar title={language === 'en' ? 'Suppliers Management' : "إدارة الموردين"} />

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-mint-line shadow-sm">
            <h3 className="text-ink-soft text-sm">{language === 'en' ? 'Number of Suppliers' : "عدد الموردين"}</h3>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalSuppliers}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-coral/20 bg-coral-pale/10 shadow-sm">
            <h3 className="text-ink-soft text-sm font-semibold">{language === 'en' ? 'Debt Owed to Suppliers' : "ديون للموردين (مطلوب منا)"}</h3>
            <p className="text-2xl font-bold font-mono text-coral mt-1">
              ₪{totalDebt.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-teal/20 bg-teal-pale/10 shadow-sm">
            <h3 className="text-ink-soft text-sm font-semibold">{language === 'en' ? 'Our Credit with Suppliers' : "رصيدنا عند الموردين (دائن)"}</h3>
            <p className="text-2xl font-bold font-mono text-teal mt-1">
              ₪{totalCredit.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">{language === 'en' ? 'Suppliers List' : "قائمة الموردين"}</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-teal text-white px-4 py-2 rounded-lg transition-colors"
          >
            {language === 'en' ? '+ Add Supplier' : "+ إضافة مورد"}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-2xl border border-mint-line shadow-sm">
          <table className="w-full text-start border-collapse">
            <thead className="bg-bg/80 border-b border-mint-line text-[14px]">
              <tr>
                <th className="py-4 px-6 text-ink-soft font-semibold text-start w-[22%]">
                  {language === 'en' ? 'Supplier Name' : "الاسم"}
                </th>
                <th className="py-4 px-6 text-ink-soft font-semibold text-start w-[18%]">
                  {language === 'en' ? 'Company' : "الشركة"}
                </th>
                <th className="py-4 px-6 text-ink-soft font-semibold text-start w-[16%]">
                  {language === 'en' ? 'Phone' : "الجوال"}
                </th>
                <th className="py-4 px-6 text-ink-soft font-semibold text-start w-[16%]">
                  {language === 'en' ? 'Remaining Balance' : "الرصيد المتبقي"}
                </th>
                <th className="py-4 px-6 text-ink-soft font-semibold text-start w-[14%]">
                  {language === 'en' ? 'Date Added' : "تاريخ الإضافة"}
                </th>
                <th className="py-4 px-6 text-ink-soft font-semibold text-center w-[14%]">
                  {language === 'en' ? 'Actions' : "الإجراءات"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-line/40 text-[14px]">
              {!suppliers ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-soft">
                    {language === 'en' ? 'Loading...' : "جاري التحميل..."}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-coral">
                    {language === 'en' ? 'An error occurred while loading data' : "حدث خطأ أثناء تحميل البيانات"}
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-soft">
                    {language === 'en' ? 'No suppliers found' : "لا يوجد موردين"}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier: any) => (
                  <tr
                    key={supplier.id}
                    onClick={() => setViewingSupplierInvoices(supplier)}
                    className="hover:bg-bg/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-pale text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {(supplier.name || "م").substring(0, 1).toUpperCase()}
                        </div>
                        <span className="font-bold text-primary group-hover:underline">
                          {supplier.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-start text-ink-soft">
                      {supplier.company || "—"}
                    </td>
                    <td className="py-4 px-6 text-start font-mono text-ink-soft">
                      {supplier.phone || "—"}
                    </td>
                    <td className="py-4 px-6 text-start">
                      {Number(supplier.balance || 0) > 0 ? (
                        <span className="inline-block font-black font-mono text-[13px] px-2.5 py-1 rounded-lg bg-coral-pale/40 text-coral border border-coral/30">
                          {language === 'en' ? 'Owed: ' : 'مطلوب للمورد: '}₪{Number(supplier.balance || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : Number(supplier.balance || 0) < 0 ? (
                        <span className="inline-block font-black font-mono text-[13px] px-2.5 py-1 rounded-lg bg-teal-pale/40 text-teal border border-teal/30">
                          {language === 'en' ? 'Credit: ' : 'رصيد لك عنده: '}₪{Math.abs(Number(supplier.balance || 0)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : (
                        <span className="inline-block font-bold font-mono text-[13px] px-2.5 py-1 rounded-lg bg-bg text-ink-soft border border-mint-line">
                          {language === 'en' ? 'Settled: 0.00 ₪' : 'الرصيد خالص: 0.00 ₪'}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-start text-ink-soft text-[13px]">
                      {supplier.date_added
                        ? new Date(supplier.date_added).toLocaleDateString(
                            language === 'en' ? "en-US" : "ar-SA",
                          )
                        : "—"}
                    </td>
                    <td
                      className="py-4 px-6 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => handleOpenPaymentModal(e, supplier)}
                          className="px-2.5 py-1.5 text-xs font-bold text-teal bg-teal/10 hover:bg-teal hover:text-white rounded-lg transition-all flex items-center gap-1 shadow-sm border border-teal/20"
                          title={language === 'en' ? 'Pay Supplier' : "تسديد دفعة"}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{language === 'en' ? 'Pay' : "تسديد"}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatementSupplier(supplier);
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-ink-soft bg-bg hover:bg-ink hover:text-white rounded-lg transition-all flex items-center gap-1 shadow-sm border border-mint-line"
                          title={language === 'en' ? 'Account Statement' : "كشف حساب وسجل حركات"}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>{language === 'en' ? 'Statement' : "كشف حساب"}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(supplier);
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-primary bg-primary-pale hover:bg-primary hover:text-white rounded-lg transition-all border border-mint-line shadow-sm"
                        >
                          {language === 'en' ? 'Edit' : "تعديل"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id);
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-coral bg-coral-pale/30 hover:bg-coral hover:text-white rounded-lg transition-all border border-coral/20 shadow-sm"
                        >
                          {language === 'en' ? 'Delete' : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Payment Modal */}
      {isPaymentModalOpen && payingSupplier && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-mint-line">
            <div className="p-5 border-b border-mint-line flex justify-between items-center bg-bg/50">
              <h3 className="font-bold text-[18px] text-primary">
                {language === 'en' ? 'Pay Supplier: ' : "تسديد المورد: "}
                <span className="text-teal">{payingSupplier.name}</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-ink-soft hover:text-coral transition-colors bg-white hover:bg-coral-pale/30 w-8 h-8 flex items-center justify-center rounded-lg border border-mint-line text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 text-start">
              {Number(payingSupplier.balance || 0) > 0 ? (
                <div className="bg-coral-pale/20 p-3 rounded-xl border border-coral/20 flex justify-between items-center">
                  <span className="text-sm text-ink-soft font-semibold">{language === 'en' ? 'Current Debt Owed:' : "الرصيد المطلوب للمورد حالياً:"}</span>
                  <span className="font-bold font-mono text-coral text-base">₪{Number(payingSupplier.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : Number(payingSupplier.balance || 0) < 0 ? (
                <div className="bg-teal-pale/20 p-3 rounded-xl border border-teal/20 flex justify-between items-center">
                  <span className="text-sm text-ink-soft font-semibold">{language === 'en' ? 'Your Credit Balance:' : "رصيد لك عنده حالياً (دائن):"}</span>
                  <span className="font-bold font-mono text-teal text-base">₪{Math.abs(Number(payingSupplier.balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <div className="bg-bg p-3 rounded-xl border border-mint-line flex justify-between items-center">
                  <span className="text-sm text-ink-soft font-semibold">{language === 'en' ? 'Current Balance:' : "الرصيد الحالي:"}</span>
                  <span className="font-bold font-mono text-ink-soft text-base">0.00 ₪ (خالص)</span>
                </div>
              )}

              <p className="text-[12px] text-teal bg-teal-pale/20 p-2.5 rounded-xl border border-teal/20 leading-relaxed font-medium">
                💡 {language === 'en'
                  ? 'You can pay any amount. Any overpayment is automatically credited to your balance with this supplier and deducted from future purchase invoices.'
                  : 'يمكنك دفع أي مبلغ. أي دفعة زائدة تُسجل كرصيد دائن لك عند المورد، وتُخصم تلقائياً من فواتير الشراء القادمة.'}
              </p>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  {language === 'en' ? 'Payment Amount (₪) *' : "المبلغ المدفوع (₪) *"}
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-3 border border-mint-line rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all font-mono text-lg font-bold text-teal"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  {language === 'en' ? 'Payment Method' : "طريقة الدفع"}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-3 border border-mint-line rounded-xl focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none transition-all font-semibold bg-white"
                >
                  <option value="كاش / نقدي">{language === 'en' ? 'Cash' : "كاش / نقدي"}</option>
                  <option value="شيك">{language === 'en' ? 'Cheque' : "شيك"}</option>
                  <option value="تحويل بنكي">{language === 'en' ? 'Bank Transfer' : "تحويل بنكي"}</option>
                  <option value="فيزا / بطاقة">{language === 'en' ? 'Card / Visa' : "فيزا / بطاقة"}</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-mint-line">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 text-ink-soft hover:bg-bg rounded-xl transition-colors border border-mint-line font-bold text-sm"
                >
                  {language === 'en' ? 'Cancel' : "إلغاء"}
                </button>
                <button
                  type="submit"
                  disabled={isPaying || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="px-6 py-2.5 bg-teal hover:bg-teal-dark text-white rounded-xl transition-all font-bold text-sm flex items-center justify-center min-w-[110px] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaying ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    language === 'en' ? 'Confirm Payment' : "تأكيد الدفع"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-mint-line flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary">
                {editingSupplier ? (language === 'en' ? 'Edit Supplier' : "تعديل مورد") : (language === 'en' ? 'Add New Supplier' : "إضافة مورد جديد")}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-ink-soft hover:text-ink text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className={`p-4 space-y-4 text-start`}>
              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  {language === 'en' ? 'Name *' : "الاسم *"}
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className={`w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-start`}
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  {language === 'en' ? 'Company' : "الشركة"}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className={`w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-start`}
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  {language === 'en' ? 'Phone' : "الجوال"}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-start"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  {language === 'en' ? 'Email' : "البريد الإلكتروني"}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-start"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  {language === 'en' ? 'Notes' : "ملاحظات"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className={`w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal h-24 resize-none text-start`}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-teal text-white py-2 rounded-lg transition-colors font-medium"
                >
                  {language === 'en' ? 'Save' : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-bg hover:bg-mint-line text-ink py-2 rounded-lg transition-colors font-medium border border-mint-line"
                >
                  {language === 'en' ? 'Cancel' : "إلغاء"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoices Modal */}
      {viewingSupplierInvoices && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#CBD5E1] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[18px] text-primary">
                {language === 'en' ? 'Supplier Invoices: ' : "فواتير المورد: "}
                <span className="text-teal">
                  {viewingSupplierInvoices.name}
                </span>
              </h3>
              <button
                onClick={() => setViewingSupplierInvoices(null)}
                className="text-ink-soft hover:text-coral transition-colors bg-white hover:bg-coral-pale w-8 h-8 flex items-center justify-center rounded-lg border border-[#CBD5E1]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1 bg-white" dir={language === 'en' ? 'ltr' : 'rtl'}>
              {invoices.filter(
                (inv: any) => inv.supplier_id === viewingSupplierInvoices.id,
              ).length === 0 ? (
                <div className="text-center py-12 text-ink-soft bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-[16px] font-bold">
                    {language === 'en' ? 'No invoices registered for this supplier yet.' : "لا يوجد فواتير مسجلة لهذا المورد حتى الآن."}
                  </p>
                </div>
              ) : (
                <div className="border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[28%]" />
                      <col className="w-[24%]" />
                      <col className="w-[16%]" />
                      <col className="w-[16%]" />
                      <col className="w-[16%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[13px] font-bold text-ink-soft">
                        <th className="py-3.5 px-4 text-start">
                          {language === 'en' ? 'Invoice Number' : "رقم الفاتورة"}
                        </th>
                        <th className="py-3.5 px-4 text-start">
                          {language === 'en' ? 'Date' : "التاريخ"}
                        </th>
                        <th className="py-3.5 px-2 text-center">
                          {language === 'en' ? 'Status' : "الحالة"}
                        </th>
                        <th className="py-3.5 px-4 text-end">
                          {language === 'en' ? 'Total' : "الإجمالي"}
                        </th>
                        <th className="py-3.5 px-4 text-end">
                          {language === 'en' ? 'Remaining (Debt)' : "المتبقي (دين)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {invoices
                        .filter(
                          (inv: any) =>
                            inv.supplier_id === viewingSupplierInvoices.id ||
                            (inv.supplier_name &&
                              inv.supplier_name.trim() ===
                                viewingSupplierInvoices.name.trim()),
                        )
                        .map((inv: any) => {
                          const rem = getInvoiceEffectiveRemaining(
                            inv,
                            viewingSupplierInvoices,
                          );
                          return (
                            <tr
                              key={inv.id}
                              onClick={() => setViewingInvoiceDetails(inv)}
                              className="hover:bg-primary/[0.03] transition-colors cursor-pointer group odd:bg-white even:bg-[#FAFCFF]"
                            >
                              <td className="py-3.5 px-4 text-[14px] font-bold text-primary group-hover:underline text-start">
                                <span className="font-mono">
                                  {inv.invoice_number
                                    ? `#${inv.invoice_number}`
                                    : inv.id}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-[13px] text-ink-soft font-mono text-start">
                                {new Date(inv.date).toLocaleDateString(
                                  language === 'en' ? 'en-US' : 'ar-EG',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  },
                                )}
                              </td>
                              <td className="py-3.5 px-2 text-center">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[12px] font-bold ${
                                    inv.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {inv.status === 'completed'
                                    ? language === 'en'
                                      ? 'Actual'
                                      : 'فعلية'
                                    : language === 'en'
                                    ? 'Proforma'
                                    : 'مبدئية'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-[14px] font-black font-mono text-ink text-end">
                                ₪{Number(inv.total_cost || 0).toFixed(2)}
                              </td>
                              <td className="py-3.5 px-4 text-[14px] font-black font-mono text-end">
                                {rem > 0 ? (
                                  <span className="text-coral">
                                    ₪{rem.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 text-[12px] font-bold">
                                    {language === 'en'
                                      ? 'Fully Paid ✓'
                                      : 'مدفوعة بالكامل ✓'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#CBD5E1] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSupplierInvoices(null)}
                className="bg-white hover:bg-bg border border-[#CBD5E1] text-ink px-8 py-2.5 rounded-xl transition-all font-bold text-[14px] shadow-sm hover:shadow"
              >
                {language === 'en' ? 'Close' : "إغلاق"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {viewingInvoiceDetails && (() => {
        const supp = suppliers?.find(
          (s: any) =>
            s.id === viewingInvoiceDetails.supplier_id ||
            s.name === viewingInvoiceDetails.supplier_name
        );
        const totalCost = Number(viewingInvoiceDetails.total_cost || 0);
        const paidAmount = getInvoiceEffectivePaid(viewingInvoiceDetails, supp);
        const remaining = getInvoiceEffectiveRemaining(viewingInvoiceDetails, supp);
        const creditSettled = Number(viewingInvoiceDetails.credit_settled || 0);
        let items: any[] = [];
        try {
          items = typeof viewingInvoiceDetails.items === "string"
            ? JSON.parse(viewingInvoiceDetails.items || "[]")
            : viewingInvoiceDetails.items || [];
        } catch (e) {
          items = [];
        }

        return (
          <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-[60] backdrop-blur-xs">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] border border-[#CBD5E1]">
              {/* Header */}
              <div className="p-5 border-b border-[#CBD5E1] flex justify-between items-center bg-[#F8FAFC]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-[18px] text-ink flex items-center gap-2">
                      <span>{language === 'en' ? 'Invoice Details:' : 'تفاصيل الفاتورة:'}</span>
                      <span className="text-teal font-mono tracking-wide">
                        {viewingInvoiceDetails.invoice_number ? `#${viewingInvoiceDetails.invoice_number}` : viewingInvoiceDetails.id}
                      </span>
                    </h3>
                    <p className="text-[12px] text-ink-soft font-mono">
                      ID: {viewingInvoiceDetails.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingInvoiceDetails(null)}
                  className="text-ink-soft hover:text-coral transition-colors bg-white hover:bg-coral-pale w-9 h-9 flex items-center justify-center rounded-xl border border-[#CBD5E1] shadow-xs"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6" dir={language === 'en' ? 'ltr' : 'rtl'}>
                {/* Metadata Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#CBD5E1]">
                    <span className="text-[12px] text-ink-soft mb-1 font-bold block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {language === 'en' ? 'Supplier' : "المورد"}
                    </span>
                    <p className="text-[14px] font-black text-ink truncate">
                      {viewingInvoiceDetails.supplier_name || supp?.name || (language === 'en' ? 'Unspecified' : 'غير محدد')}
                    </p>
                  </div>

                  <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#CBD5E1]">
                    <span className="text-[12px] text-ink-soft mb-1 font-bold block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {language === 'en' ? 'Invoice Date' : "تاريخ الفاتورة"}
                    </span>
                    <p className="text-[13px] font-bold font-mono text-ink">
                      {new Date(viewingInvoiceDetails.date).toLocaleString(
                        language === 'en' ? "en-US" : "ar-SA",
                      )}
                    </p>
                  </div>

                  <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#CBD5E1]">
                    <span className="text-[12px] text-ink-soft mb-1 font-bold block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {language === 'en' ? 'Status' : "الحالة"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[12px] font-black mt-0.5 ${
                        viewingInvoiceDetails.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {viewingInvoiceDetails.status === "completed"
                        ? (language === 'en' ? 'Actual (Completed)' : "فعلية (مكتملة)")
                        : (language === 'en' ? 'Proforma (Draft)' : "مبدئية")}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#CBD5E1]">
                    <span className="text-[12px] text-ink-soft mb-1 font-bold block flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {language === 'en' ? 'Total Items' : "عدد الأصناف"}
                    </span>
                    <p className="text-[14px] font-black text-ink">
                      {items.length} {language === 'en' ? 'items' : 'أصناف'}
                    </p>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <h4 className="font-black text-[16px] text-ink mb-3 flex items-center gap-2">
                    <span>{language === 'en' ? 'Invoice Items' : 'أصناف الفاتورة'}</span>
                    <span className="text-[12px] font-bold text-ink-soft bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                      {items.length}
                    </span>
                  </h4>

                  <div className="border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[36%]" />
                        <col className="w-[14%]" />
                        <col className="w-[17%]" />
                        <col className="w-[17%]" />
                        <col className="w-[16%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[13px] font-bold text-ink-soft">
                          <th className="py-3 px-4 text-start">
                            {language === 'en' ? 'Item' : "الصنف"}
                          </th>
                          <th className="py-3 px-2 text-center">
                            {language === 'en' ? 'Quantity' : "الكمية (علبة)"}
                          </th>
                          <th className="py-3 px-2 text-center">
                            {language === 'en' ? 'Purchase Price' : "سعر الشراء"}
                          </th>
                          <th className="py-3 px-2 text-center">
                            {language === 'en' ? 'Sell Price' : "سعر البيع"}
                          </th>
                          <th className="py-3 px-4 text-end">
                            {language === 'en' ? 'Total' : "الإجمالي"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-ink-soft">
                              {language === 'en' ? 'No items found' : "لا يوجد أصناف"}
                            </td>
                          </tr>
                        ) : (
                          items.map((item: any, idx: number) => {
                            const buyPrice = Number(item.purchase_price !== undefined ? item.purchase_price : (item.cost || 0));
                            const sellPrice = Number(item.sell_price !== undefined ? item.sell_price : (item.price || 0));
                            const lineTotal = Number(item.qty || 0) * buyPrice;

                            return (
                              <tr key={idx} className="hover:bg-primary/[0.03] transition-colors odd:bg-white even:bg-[#FAFCFF]">
                                <td className="py-3.5 px-4 text-start">
                                  <div className="font-bold text-[14px] text-ink leading-snug">
                                    {item.name}
                                  </div>
                                  {item.has_parts && (
                                    <div className="inline-flex items-center gap-1 text-[11px] text-teal font-medium mt-1 bg-teal/10 px-2 py-0.5 rounded-md">
                                      <span>{language === 'en' ? 'Subdivided:' : 'مجزأ:'}</span>
                                      <span>{item.part1_qty} {item.part1_name} {language === 'en' ? 'in box' : 'في العلبة'}</span>
                                      {item.has_subparts && (
                                        <span>- {item.part2_qty} {item.part2_name} {language === 'en' ? 'in' : 'في'} {item.part1_name}</span>
                                      )}
                                    </div>
                                  )}
                                  {(item.expiry || item.expiry_date) && (
                                    <div className="text-[11px] text-ink-soft font-mono mt-0.5">
                                      {language === 'en' ? 'Exp: ' : 'الصلاحية: '}{item.expiry || item.expiry_date}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-2 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-bold text-[14px] text-ink">
                                    {item.qty}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2 text-center font-mono font-bold text-[14px] text-slate-700">
                                  ₪{buyPrice.toFixed(2)}
                                </td>
                                <td className="py-3.5 px-2 text-center font-mono font-medium text-[14px] text-slate-600">
                                  ₪{sellPrice.toFixed(2)}
                                </td>
                                <td className="py-3.5 px-4 text-end font-mono font-black text-[15px] text-primary">
                                  ₪{lineTotal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 text-center shadow-xs">
                    <span className="text-[12px] font-bold text-ink-soft block mb-1">
                      {language === 'en' ? 'Invoice Total' : 'إجمالي الفاتورة'}
                    </span>
                    <span className="text-[20px] font-black font-mono text-ink">
                      ₪{totalCost.toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center shadow-xs">
                    <span className="text-[12px] font-bold text-emerald-800 block mb-1">
                      {language === 'en' ? 'Amount Paid' : 'المبلغ المدفوع'}
                    </span>
                    <span className="text-[20px] font-black font-mono text-emerald-700">
                      ₪{paidAmount.toFixed(2)}
                    </span>
                    {creditSettled > 0 && (
                      <span className="block text-[11px] font-bold text-teal mt-0.5 font-mono">
                        ({language === 'en' ? 'Credit: ' : 'مخصوم من الرصيد: '}₪{creditSettled.toFixed(2)})
                      </span>
                    )}
                  </div>

                  <div
                    className={`border rounded-2xl p-4 text-center shadow-xs ${
                      remaining > 0
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-emerald-50/70 border-emerald-200'
                    }`}
                  >
                    <span
                      className={`text-[12px] font-bold block mb-1 ${
                        remaining > 0 ? 'text-rose-800' : 'text-emerald-800'
                      }`}
                    >
                      {language === 'en' ? 'Remaining (Debt)' : 'المتبقي (دين)'}
                    </span>
                    {remaining > 0 ? (
                      <span className="text-[20px] font-black font-mono text-rose-700">
                        ₪{remaining.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[15px] font-black text-emerald-700 flex items-center justify-center gap-1 mt-1">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        {language === 'en' ? 'Fully Paid' : 'مدفوعة بالكامل'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#CBD5E1] bg-[#F8FAFC] flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingInvoiceDetails(null)}
                  className="bg-white hover:bg-bg border border-[#CBD5E1] text-ink px-8 py-2.5 rounded-xl transition-all font-bold text-[14px] shadow-sm hover:shadow"
                >
                  {language === 'en' ? 'Close' : "إغلاق"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Supplier Statement / Transactions Modal (Matched with Mobile and Backend) */}
      {statementSupplier && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-[#CBD5E1]">
            {/* Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black">
                  📋
                </div>
                <div>
                  <h3 className="font-extrabold text-[18px] text-[#0F172A] flex items-center gap-2">
                    <span>{language === 'en' ? 'Supplier Statement & Ledger: ' : "كشف حساب وسجل حركات المورد: "}</span>
                    <span className="text-primary font-black">{statementSupplier.name}</span>
                  </h3>
                  <div className="text-xs font-mono text-[#64748B] mt-0.5">
                    {statementSupplier.company || (language === 'en' ? 'No company specified' : 'بدون شركة محددة')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStatementSupplier(null)}
                className="text-[#64748B] hover:text-[#EF4444] transition-colors bg-white hover:bg-[#FEE2E2] w-9 h-9 flex items-center justify-center rounded-xl border border-[#CBD5E1] font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* 3 KPI Cards matching Mobile App */}
            <div className="p-5 bg-[#F8FAFC]/80 border-b border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* KPI 1: Total Paid */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800">
                    {language === 'en' ? 'Total Paid / Settled' : 'إجمالي المسدد والمصروف'}
                  </div>
                  <div className="font-mono text-xl font-black text-emerald-700 mt-1" dir="ltr">
                    ₪{totalPaidInStatement.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black">
                  ✓
                </div>
              </div>

              {/* KPI 2: Current Balance */}
              <div className={`rounded-xl p-3.5 border flex items-center justify-between ${
                Number(statementSupplier.balance || 0) > 0
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : Number(statementSupplier.balance || 0) < 0
                  ? 'bg-teal-50 border-teal-200 text-teal-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div>
                  <div className="text-xs font-bold">
                    {Number(statementSupplier.balance || 0) > 0
                      ? (language === 'en' ? 'Owed to Supplier (Debt)' : 'مطلوب للمورد (دين علينا)')
                      : Number(statementSupplier.balance || 0) < 0
                      ? (language === 'en' ? 'Credit Balance (Our Excess)' : 'رصيد دائن لنا (فائض)')
                      : (language === 'en' ? 'Current Balance' : 'الرصيد الحالي')}
                  </div>
                  <div className={`font-mono text-xl font-black mt-1 ${
                    Number(statementSupplier.balance || 0) > 0
                      ? 'text-rose-700'
                      : Number(statementSupplier.balance || 0) < 0
                      ? 'text-teal-700'
                      : 'text-slate-700'
                  }`} dir="ltr">
                    ₪{Math.abs(Number(statementSupplier.balance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-xl">
                  {Number(statementSupplier.balance || 0) > 0 ? '⚠️' : Number(statementSupplier.balance || 0) < 0 ? '💰' : '✨'}
                </div>
              </div>

              {/* KPI 3: Movements Count */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-indigo-800">
                    {language === 'en' ? 'Total Transactions' : 'عدد الحركات والفواتير'}
                  </div>
                  <div className="font-mono text-xl font-black text-indigo-700 mt-1">
                    {transactions.length} {language === 'en' ? 'ops' : 'حركة'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-black">
                  📑
                </div>
              </div>
            </div>

            {/* Transactions Table Body */}
            <div className="p-5 overflow-auto flex-1 bg-white">
              {transactions.length === 0 ? (
                <div className="text-center py-16 text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-[16px] font-bold text-[#0F172A] mb-1">
                    {language === 'en' ? 'No transactions logged for this supplier yet.' : "لا يوجد حركات مسجلة في كشف حساب هذا المورد حتى الآن."}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {language === 'en'
                      ? 'Purchase invoices and payment vouchers will automatically populate here.'
                      : 'ستظهر فواتير الشراء وسندات الصرف والدفعات هنا تلقائياً مع السجل المالي الكامل.'}
                  </p>
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-start">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[13px] text-[#475569] font-bold">
                        <th className="p-3 text-start">{language === 'en' ? 'Date & Time' : 'التاريخ'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Type' : 'نوع الحركة'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Invoice / Ref' : 'رقم الفاتورة / المرجع'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Total (₪)' : 'الإجمالي (₪)'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Paid (₪)' : 'المسدد (₪)'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Remaining (₪)' : 'المتبقي (₪)'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Branch / Method' : 'الفرع / طريقة الدفع'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Details' : 'تفاصيل وملاحظات'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/70 text-[13px]">
                      {formattedTransactions.map((tx: any) => {
                        const isCreditOffset = tx.type === 'credit_settlement';
                        const isPayment = tx.type === 'payment';
                        const isPartial = tx.type === 'partial_payment';
                        const isVoucher = tx.type === 'voucher';
                        const isReversal = tx.type === 'reversal';

                        const totalAmt = Number(tx.amount || 0);
                        const paidAmt = Number(tx.paid_amount != null ? tx.paid_amount : (isPayment || isVoucher ? totalAmt : 0));
                        const remAmt = Number(tx.remaining != null ? tx.remaining : Math.max(0, totalAmt - paidAmt));

                        return (
                          <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="p-3 font-mono text-[#64748B] text-xs whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                isCreditOffset
                                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                                  : isPayment
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPartial
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : isVoucher
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : isReversal
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}>
                                {isCreditOffset
                                  ? (language === 'en' ? 'Credit Offset' : 'خصم من الرصيد')
                                  : isPayment
                                  ? (language === 'en' ? 'Paid / Settled' : 'سداد / فاتورة مسددة')
                                  : isPartial
                                  ? (language === 'en' ? 'Partially Paid' : 'سداد جزئي')
                                  : isVoucher
                                  ? (language === 'en' ? 'Payment Voucher' : 'سند صرف وسداد')
                                  : isReversal
                                  ? (language === 'en' ? 'Reversal / Cancel' : 'إلغاء / استرجاع')
                                  : (language === 'en' ? 'Purchase Invoice' : 'فاتورة مشتريات')}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold whitespace-nowrap">
                              {tx.isVoucherSerial ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs cursor-help transition-all hover:bg-indigo-100"
                                  title={`${language === 'en' ? 'Full System Reference ID' : 'معرف العملية الأصلي'}: ${tx.rawRef}`}
                                >
                                  <span>🧾</span>
                                  <span>{tx.displayRef}</span>
                                </span>
                              ) : (
                                <span
                                  className="text-primary font-black hover:underline cursor-pointer"
                                  title={`${language === 'en' ? 'Invoice Number' : 'رقم الفاتورة'}: ${tx.rawRef}`}
                                >
                                  {tx.displayRef}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-[#0F172A]" dir="ltr">
                              ₪{totalAmt.toFixed(2)}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700" dir="ltr">
                              ₪{paidAmt.toFixed(2)}
                            </td>
                            <td className="p-3 font-mono font-bold" dir="ltr">
                              <span className={remAmt > 0 ? 'text-rose-600' : 'text-[#64748B]'}>
                                ₪{remAmt.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-xs text-[#475569] whitespace-nowrap">
                              <div className="font-semibold text-[#0F172A]">{tx.branch || (language === 'en' ? 'Main' : 'الفرع الرئيسي')}</div>
                              <div className="text-[11px] text-[#64748B]">{tx.method || 'كاش'}</div>
                            </td>
                            <td className="p-3 text-[#64748B] text-xs max-w-[280px] truncate" title={tx.notes || ''}>
                              {tx.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer with Quick Action (New Payment) matching Mobile */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const s = statementSupplier;
                  setStatementSupplier(null);
                  setPayingSupplier(s);
                  setPaymentAmount("");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>💳</span>
                <span>{language === 'en' ? 'New Payment for this Supplier' : 'سداد دفعة جديدة للمورد'}</span>
              </button>

              <button
                type="button"
                onClick={() => setStatementSupplier(null)}
                className="bg-white hover:bg-bg border border-[#CBD5E1] text-[#0F172A] px-8 py-2.5 rounded-xl transition-all font-bold text-sm shadow-sm hover:shadow"
              >
                {language === 'en' ? 'Close' : 'إغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
