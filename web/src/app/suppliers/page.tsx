"use client";
import { API_BASE_URL } from "@/lib/config";
import { useState } from "react";
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

  const { data: invoicesData } = useSWR(
    pharmacyId
      ? `${API_BASE}/api/pharmacies/${pharmacyId}/purchase-invoices`
      : null,
    fetcher,
  );
  const invoices = invoicesData?.invoices || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("كاش");
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
  const transactions = statementData?.transactions || [];

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
                  <option value="كاش">{language === 'en' ? 'Cash (from drawer)' : "كاش (نقداً من الدرج)"}</option>
                  <option value="حوالة بنكية">{language === 'en' ? 'Bank Transfer' : "حوالة بنكية"}</option>
                  <option value="جوال باي">{language === 'en' ? 'Jawwal Pay' : "جوال باي"}</option>
                  <option value="بال باي">{language === 'en' ? 'PalPay' : "بال باي"}</option>
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
                <div className="border border-[#CBD5E1] rounded-2xl overflow-hidden">
                  <table className={`w-full text-start`}>
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-start">
                          {language === 'en' ? 'Invoice Number' : "رقم الفاتورة"}
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-start">
                          {language === 'en' ? 'Date' : "التاريخ"}
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-center">
                          {language === 'en' ? 'Status' : "الحالة"}
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-start">
                          {language === 'en' ? 'Total' : "الإجمالي"}
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-start">
                          {language === 'en' ? 'Remaining (Debt)' : "المتبقي (دين)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {invoices
                        .filter(
                          (inv: any) =>
                            inv.supplier_id === viewingSupplierInvoices.id,
                        )
                        .map((inv: any) => (
                          <tr
                            key={inv.id}
                            onClick={() => setViewingInvoiceDetails(inv)}
                            className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                          >
                            <td className="p-4 text-[14px] font-bold text-primary group-hover:underline">
                              {inv.id}
                            </td>
                            <td className="p-4 text-[14px] text-ink-soft font-mono text-sm">
                              {new Date(inv.date).toLocaleString(language === 'en' ? 'en-US' : "ar-SA")}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-bold ${inv.status === "completed" ? "bg-mint-pale text-teal border border-teal/20" : "bg-bg text-ink-soft border border-ink-soft/20"}`}
                              >
                                {inv.status === "completed"
                                  ? (language === 'en' ? 'Actual' : "فعلية")
                                  : (language === 'en' ? 'Proforma' : "مبدئية")}
                              </span>
                            </td>
                            <td
                              className="p-4 text-[15px] font-bold text-ink"
                              dir="ltr"
                            >
                              ₪{(inv.total_cost || 0).toFixed(2)}
                            </td>
                            <td
                              className="p-4 text-[15px] font-bold text-coral"
                              dir="ltr"
                            >
                              ₪{(inv.remaining || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
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
      {viewingInvoiceDetails && (
        <div className="fixed inset-0 bg-ink/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-[#CBD5E1] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-[18px] text-primary">
                {language === 'en' ? 'Invoice Details: ' : "تفاصيل الفاتورة: "}
                <span className="text-teal font-mono">
                  {viewingInvoiceDetails.id}
                </span>
              </h3>
              <button
                onClick={() => setViewingInvoiceDetails(null)}
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                  <p className="text-[12px] text-ink-soft mb-1 font-bold">
                    {language === 'en' ? 'Invoice Date' : "تاريخ الفاتورة"}
                  </p>
                  <p className="text-[14px] font-bold text-ink">
                    {new Date(viewingInvoiceDetails.date).toLocaleString(
                      language === 'en' ? "en-US" : "ar-SA",
                    )}
                  </p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                  <p className="text-[12px] text-ink-soft mb-1 font-bold">
                    {language === 'en' ? 'Status' : "الحالة"}
                  </p>
                  <p className="text-[14px] font-bold text-ink">
                    {viewingInvoiceDetails.status === "completed"
                      ? (language === 'en' ? 'Actual (Completed)' : "فعلية (مكتملة)")
                      : (language === 'en' ? 'Proforma' : "مبدئية")}
                  </p>
                </div>
              </div>

              <h4 className="font-bold text-[16px] text-ink mb-4 border-b border-mint-line pb-2">
                {language === 'en' ? 'Items (' : "الأصناف ("}
                {(() => {
                  try {
                    const it =
                      typeof viewingInvoiceDetails.items === "string"
                        ? JSON.parse(viewingInvoiceDetails.items || "[]")
                        : viewingInvoiceDetails.items || [];
                    return it.length;
                  } catch (e) {
                    return 0;
                  }
                })()}
                )
              </h4>

              <div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
                <table className={`w-full text-start`}>
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                      <th className="p-3 text-[12px] text-ink-soft font-bold text-start">
                        {language === 'en' ? 'Item' : "الصنف"}
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold text-start">
                        {language === 'en' ? 'Quantity (Box)' : "الكمية (علبة)"}
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold text-start">
                        {language === 'en' ? 'Purchase Price' : "سعر الشراء"}
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold text-start">
                        {language === 'en' ? 'Sell Price' : "سعر البيع"}
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold text-start">
                        {language === 'en' ? 'Total' : "الإجمالي"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {(() => {
                      try {
                        const items =
                          typeof viewingInvoiceDetails.items === "string"
                            ? JSON.parse(viewingInvoiceDetails.items || "[]")
                            : viewingInvoiceDetails.items || [];
                        if (items.length === 0)
                          return (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-4 text-center text-ink-soft"
                              >
                                {language === 'en' ? 'No items found' : "لا يوجد أصناف"}
                              </td>
                            </tr>
                          );
                        return items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="p-3 text-[13px] font-bold text-ink">
                              {item.name}
                              {item.has_parts && (
                                <div className="text-[11px] text-teal mt-1">
                                  {language === 'en' ? 'Subdivided:' : 'مجزأ:'} {item.part1_qty} {item.part1_name} {language === 'en' ? 'in box' : 'في العلبة'}
                                  {item.has_subparts &&
                                    (language === 'en' ? ` - and ${item.part2_qty} ${item.part2_name} in the ${item.part1_name}` : ` - و ${item.part2_qty} ${item.part2_name} في الـ ${item.part1_name}`)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-[14px] font-bold">
                              {item.qty}
                            </td>
                            <td className="p-3 text-[13px]" dir="ltr">
                              ₪
                              {Number(
                                item.purchase_price || item.cost || 0,
                              ).toFixed(2)}
                            </td>
                            <td className="p-3 text-[13px]" dir="ltr">
                              ₪
                              {Number(
                                item.sell_price || item.price || 0,
                              ).toFixed(2)}
                            </td>
                            <td
                              className="p-3 text-[14px] font-bold text-primary"
                              dir="ltr"
                            >
                              ₪
                              {(
                                item.qty *
                                (item.purchase_price || item.cost || 0)
                              ).toFixed(2)}
                            </td>
                          </tr>
                        ));
                      } catch (e) {
                        return (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-4 text-center text-coral"
                            >
                              {language === 'en' ? 'Error reading items' : "خطأ في قراءة الأصناف"}
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>

              <div className={`mt-6 flex justify-end gap-6 border-t border-mint-line pt-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1] ${language === 'en' ? 'flex-row-reverse' : ''}`}>
                <div className="text-center">
                  <p className="text-[12px] text-ink-soft font-bold">
                    {language === 'en' ? 'Invoice Total' : "إجمالي الفاتورة"}
                  </p>
                  <p className="text-[18px] font-bold text-ink" dir="ltr">
                    ₪{(viewingInvoiceDetails.total_cost || 0).toFixed(2)}
                  </p>
                </div>
                <div className={`text-center ${language === 'en' ? 'border-l pl-6' : 'border-r pr-6'} border-[#CBD5E1]`}>
                  <p className="text-[12px] text-ink-soft font-bold">
                    {language === 'en' ? 'Amount Paid' : "المبلغ المدفوع"}
                  </p>
                  <p className="text-[18px] font-bold text-teal" dir="ltr">
                    ₪{(viewingInvoiceDetails.paid_amount || 0).toFixed(2)}
                  </p>
                </div>
                {(viewingInvoiceDetails.credit_settled || 0) > 0 && (
                  <div className={`text-center ${language === 'en' ? 'border-l pl-6' : 'border-r pr-6'} border-[#CBD5E1]`}>
                    <p className="text-[12px] text-teal font-bold">
                      {language === 'en' ? 'Credit Settled' : "مخصوم من الرصيد"}
                    </p>
                    <p className="text-[18px] font-bold text-teal" dir="ltr">
                      - ₪{(viewingInvoiceDetails.credit_settled || 0).toFixed(2)} ✓
                    </p>
                  </div>
                )}
                <div className={`text-center ${language === 'en' ? 'border-l pl-6' : 'border-r pr-6'} border-[#CBD5E1]`}>
                  <p className="text-[12px] text-ink-soft font-bold">
                    {language === 'en' ? 'Remaining (Debt)' : "المتبقي (دين)"}
                  </p>
                  {(viewingInvoiceDetails.remaining || 0) > 0 ? (
                    <p className="text-[18px] font-bold text-coral" dir="ltr">
                      ₪{(viewingInvoiceDetails.remaining || 0).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-[15px] font-black text-teal mt-0.5">
                      {language === 'en' ? 'Fully Paid ✓' : "مدفوعة بالكامل ✓"}
                    </p>
                  )}
                </div>
              </div>
            </div>

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
      )}

      {/* Supplier Statement / Transactions Modal */}
      {statementSupplier && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] border border-mint-line">
            <div className="p-5 border-b border-mint-line flex justify-between items-center bg-bg/60">
              <div>
                <h3 className="font-bold text-[18px] text-primary flex items-center gap-2">
                  <span>{language === 'en' ? 'Supplier Statement & Ledger: ' : "كشف حساب وسجل حركات المورد: "}</span>
                  <span className="text-teal font-extrabold">{statementSupplier.name}</span>
                </h3>
                <div className="text-xs font-mono text-ink-soft mt-1 flex items-center gap-3">
                  <span>{statementSupplier.company || ""}</span>
                  {Number(statementSupplier.balance || 0) > 0 ? (
                    <span className="text-coral font-bold">
                      {language === 'en' ? 'Owed: ' : 'مطلوب للمورد: '}
                      ₪{Number(statementSupplier.balance || 0).toFixed(2)}
                    </span>
                  ) : Number(statementSupplier.balance || 0) < 0 ? (
                    <span className="text-teal font-bold">
                      {language === 'en' ? 'Credit: ' : 'رصيد دائن لنا: '}
                      ₪{Math.abs(Number(statementSupplier.balance || 0)).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-ink-soft font-bold">
                      {language === 'en' ? 'Settled (0.00 ₪)' : 'الرصيد خالص (0.00 ₪)'}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setStatementSupplier(null)}
                className="text-ink-soft hover:text-coral transition-colors bg-white hover:bg-coral-pale/30 w-8 h-8 flex items-center justify-center rounded-lg border border-mint-line font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1 bg-white">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-ink-soft bg-bg/50 rounded-2xl border border-dashed border-mint-line">
                  <p className="text-[15px] font-bold">
                    {language === 'en' ? 'No transactions logged for this supplier yet.' : "لا يوجد حركات مسجلة في كشف حساب هذا المورد حتى الآن."}
                  </p>
                </div>
              ) : (
                <div className="border border-mint-line rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-start">
                    <thead>
                      <tr className="bg-bg border-b border-mint-line text-[13px] text-ink-soft font-bold">
                        <th className="p-3 text-start">{language === 'en' ? 'Date & Time' : 'التاريخ والوقت'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Type' : 'نوع الحركة'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Invoice / Ref' : 'رقم المرجع / الفاتورة'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Amount' : 'المبلغ'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Balance Before' : 'الرصيد قبل'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Balance After' : 'الرصيد بعد'}</th>
                        <th className="p-3 text-start">{language === 'en' ? 'Notes' : 'ملاحظات'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mint-line/40 text-[13px]">
                      {transactions.map((tx: any) => {
                        const isCreditOffset = tx.type === 'credit_settlement';
                        const isPayment = tx.type === 'payment';
                        const isReversal = tx.type === 'reversal';

                        return (
                          <tr key={tx.id} className="hover:bg-bg/40 transition-colors">
                            <td className="p-3 font-mono text-ink-soft text-xs">
                              {new Date(tx.date).toLocaleString(language === 'en' ? 'en-US' : 'ar-SA')}
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                isCreditOffset
                                  ? 'bg-teal-pale/40 text-teal border border-teal/20'
                                  : isPayment
                                  ? 'bg-primary-pale text-primary border border-primary/20'
                                  : isReversal
                                  ? 'bg-coral-pale/40 text-coral border border-coral/20'
                                  : 'bg-bg text-ink border border-mint-line'
                              }`}>
                                {isCreditOffset
                                  ? (language === 'en' ? 'Credit Offset' : 'خصم من الرصيد')
                                  : isPayment
                                  ? (language === 'en' ? 'Payment' : 'سداد دفعة')
                                  : isReversal
                                  ? (language === 'en' ? 'Reversal / Cancel' : 'إلغاء / استرجاع')
                                  : (language === 'en' ? 'Purchase Invoice' : 'فاتورة شراء')}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-primary">
                              {tx.invoice_number || tx.reference_id || '—'}
                            </td>
                            <td className="p-3 font-mono font-bold text-ink" dir="ltr">
                              ₪{Number(tx.amount || 0).toFixed(2)}
                            </td>
                            <td className="p-3 font-mono text-ink-soft" dir="ltr">
                              ₪{Number(tx.balance_before || 0).toFixed(2)}
                            </td>
                            <td className="p-3 font-mono font-bold text-ink" dir="ltr">
                              <span className={Number(tx.balance_after || 0) > 0 ? 'text-coral' : Number(tx.balance_after || 0) < 0 ? 'text-teal' : 'text-ink'}>
                                ₪{Number(tx.balance_after || 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-ink-soft text-xs max-w-[200px] truncate" title={tx.notes || ''}>
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

            <div className="p-4 border-t border-mint-line bg-bg/50 flex justify-end">
              <button
                type="button"
                onClick={() => setStatementSupplier(null)}
                className="bg-white hover:bg-bg border border-mint-line text-ink px-8 py-2 rounded-xl transition-all font-bold text-sm shadow-sm"
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
