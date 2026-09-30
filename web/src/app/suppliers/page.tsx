"use client";
import { useState } from "react";
import useSWR from "swr";
import { useStore } from "@/store";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SuppliersPage() {
  const user = useStore((state: any) => state.user);
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

  const totalSuppliers = suppliers?.length || 0;
  const totalBalance =
    suppliers?.reduce(
      (sum: number, s: any) => sum + (Number(s.balance) || 0),
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
        editingSupplier ? "تم تعديل المورد بنجاح" : "تم إضافة المورد بنجاح",
      );
      mutate();
      handleCloseModal();
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!pharmacyId) return;
    if (!confirm("هل أنت متأكد من حذف هذا المورد؟")) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/pharmacies/${pharmacyId}/suppliers/${id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to delete supplier");

      toast.success("تم حذف المورد بنجاح");
      mutate();
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans" dir="rtl">
      <AppBar title="إدارة الموردين" />

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl border border-mint-line shadow-sm">
            <h3 className="text-ink-soft text-sm">عدد الموردين</h3>
            <p className="text-2xl font-bold text-teal mt-1">
              {totalSuppliers}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-mint-line shadow-sm">
            <h3 className="text-ink-soft text-sm">إجمالي الرصيد</h3>
            <p className="text-2xl font-bold text-coral mt-1">
              {totalBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary">قائمة الموردين</h2>
          <button
            onClick={() => handleOpenModal()}
            className="bg-primary hover:bg-teal text-white px-4 py-2 rounded-lg transition-colors"
          >
            + إضافة مورد
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded-xl border border-mint-line shadow-sm">
          <table className="w-full text-right">
            <thead className="bg-bg border-b border-mint-line">
              <tr>
                <th className="p-4 text-ink-soft font-medium">الاسم</th>
                <th className="p-4 text-ink-soft font-medium">الشركة</th>
                <th className="p-4 text-ink-soft font-medium">الجوال</th>
                <th className="p-4 text-ink-soft font-medium">
                  الرصيد المتبقي
                </th>
                <th className="p-4 text-ink-soft font-medium">تاريخ الإضافة</th>
                <th className="p-4 text-ink-soft font-medium text-center">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {!suppliers ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-ink-soft">
                    جاري التحميل...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-coral">
                    حدث خطأ أثناء تحميل البيانات
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-ink-soft">
                    لا يوجد موردين
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier: any) => (
                  <tr
                    key={supplier.id}
                    onClick={() => setViewingSupplierInvoices(supplier)}
                    className="border-b border-mint-line hover:bg-bg/50 cursor-pointer group"
                  >
                    <td className="p-4 font-bold text-primary group-hover:underline">
                      {supplier.name}
                    </td>
                    <td className="p-4">{supplier.company || "-"}</td>
                    <td className="p-4">{supplier.phone || "-"}</td>
                    <td className="p-4 font-semibold text-coral" dir="ltr">
                      {Number(supplier.balance || 0).toFixed(2)}
                    </td>
                    <td className="p-4">
                      {supplier.date_added
                        ? new Date(supplier.date_added).toLocaleDateString(
                            "ar-SA",
                          )
                        : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(supplier);
                          }}
                          className="text-teal hover:bg-teal/10 px-3 py-1 rounded transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(supplier.id);
                          }}
                          className="text-coral hover:bg-coral/10 px-3 py-1 rounded transition-colors"
                        >
                          حذف
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-mint-line flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary">
                {editingSupplier ? "تعديل مورد" : "إضافة مورد جديد"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-ink-soft hover:text-ink text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  الاسم *
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  الشركة
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  الجوال
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-right"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal text-right"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-soft mb-1">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full p-2 border border-mint-line rounded-lg focus:outline-none focus:border-teal h-24 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-teal text-white py-2 rounded-lg transition-colors font-medium"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-bg hover:bg-mint-line text-ink py-2 rounded-lg transition-colors font-medium border border-mint-line"
                >
                  إلغاء
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
                فواتير المورد:{" "}
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

            <div className="p-6 overflow-auto flex-1 bg-white" dir="rtl">
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
                    لا يوجد فواتير مسجلة لهذا المورد حتى الآن.
                  </p>
                </div>
              ) : (
                <div className="border border-[#CBD5E1] rounded-2xl overflow-hidden">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                        <th className="p-4 text-[13px] text-ink-soft font-bold">
                          رقم الفاتورة
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold">
                          التاريخ
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold text-center">
                          الحالة
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold">
                          الإجمالي
                        </th>
                        <th className="p-4 text-[13px] text-ink-soft font-bold">
                          المتبقي (دين)
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
                              {new Date(inv.date).toLocaleString("ar-SA")}
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-[12px] font-bold ${inv.status === "completed" ? "bg-mint-pale text-teal border border-teal/20" : "bg-bg text-ink-soft border border-ink-soft/20"}`}
                              >
                                {inv.status === "completed"
                                  ? "فعلية"
                                  : "مبدئية"}
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
                إغلاق
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
                تفاصيل الفاتورة:{" "}
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

            <div className="p-6 overflow-auto flex-1 bg-white" dir="rtl">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                  <p className="text-[12px] text-ink-soft mb-1 font-bold">
                    تاريخ الفاتورة
                  </p>
                  <p className="text-[14px] font-bold text-ink">
                    {new Date(viewingInvoiceDetails.date).toLocaleString(
                      "ar-SA",
                    )}
                  </p>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                  <p className="text-[12px] text-ink-soft mb-1 font-bold">
                    الحالة
                  </p>
                  <p className="text-[14px] font-bold text-ink">
                    {viewingInvoiceDetails.status === "completed"
                      ? "فعلية (مكتملة)"
                      : "مبدئية"}
                  </p>
                </div>
              </div>

              <h4 className="font-bold text-[16px] text-ink mb-4 border-b border-mint-line pb-2">
                الأصناف (
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
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1]">
                      <th className="p-3 text-[12px] text-ink-soft font-bold">
                        الصنف
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold">
                        الكمية (علبة)
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold">
                        سعر الشراء
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold">
                        سعر البيع
                      </th>
                      <th className="p-3 text-[12px] text-ink-soft font-bold">
                        الإجمالي
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
                                لا يوجد أصناف
                              </td>
                            </tr>
                          );
                        return items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="p-3 text-[13px] font-bold text-ink">
                              {item.name}
                              {item.has_parts && (
                                <div className="text-[11px] text-teal mt-1">
                                  مجزأ: {item.part1_qty} {item.part1_name} في
                                  العلبة
                                  {item.has_subparts &&
                                    ` - و ${item.part2_qty} ${item.part2_name} في الـ ${item.part1_name}`}
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
                              خطأ في قراءة الأصناف
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-6 border-t border-mint-line pt-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#CBD5E1]">
                <div className="text-center">
                  <p className="text-[12px] text-ink-soft font-bold">
                    إجمالي الفاتورة
                  </p>
                  <p className="text-[18px] font-bold text-ink" dir="ltr">
                    ₪{(viewingInvoiceDetails.total_cost || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center border-r border-[#CBD5E1] pr-6">
                  <p className="text-[12px] text-ink-soft font-bold">
                    المبلغ المدفوع
                  </p>
                  <p className="text-[18px] font-bold text-teal" dir="ltr">
                    ₪{(viewingInvoiceDetails.paid_amount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center border-r border-[#CBD5E1] pr-6">
                  <p className="text-[12px] text-ink-soft font-bold">
                    المتبقي (دين)
                  </p>
                  <p className="text-[18px] font-bold text-coral" dir="ltr">
                    ₪{(viewingInvoiceDetails.remaining || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#CBD5E1] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setViewingInvoiceDetails(null)}
                className="bg-white hover:bg-bg border border-[#CBD5E1] text-ink px-8 py-2.5 rounded-xl transition-all font-bold text-[14px] shadow-sm hover:shadow"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
