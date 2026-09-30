"use client";

import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import toast from "react-hot-toast";
import { AdminIcon } from "@/components/icons";

export default function AdminSettings() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi("/admin/pharmacies");
      setPharmacies(data.pharmacies || []);
    } catch (error) {
      toast.error("فشل في جلب البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (id: string, currentStatus: number) => {
    try {
      const endpoint = currentStatus !== 0 ? "suspend" : "activate";
      await fetchApi(`/admin/pharmacies/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ action: endpoint }),
      });
      toast.success(
        currentStatus !== 0
          ? "تم تعليق الصيدلية بنجاح"
          : "تم تنشيط الصيدلية بنجاح",
      );
      loadData();
    } catch (error) {
      toast.error("فشل تغيير حالة الصيدلية");
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fetchApi(`/admin/pharmacies/${deleteModal.id}`, {
        method: "DELETE",
      });
      toast.success("تم حذف الصيدلية نهائياً");
      setDeleteModal({ isOpen: false, id: null });
      loadData();
    } catch (error) {
      toast.error("فشل في حذف الصيدلية");
    }
  };

  return (
    <>
      <AppBar />

      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg bg-card border border-mint-line hover:bg-bg transition-all"
          >
            <AdminIcon className="w-5 h-5 text-ink-soft" />
          </Link>
          <div>
            <h1 className="text-[22px] font-bold text-primary">
              إدارة الصيدليات
            </h1>
            <p className="text-[15px] text-ink-soft mt-1">
              التحكم في اشتراكات وصلاحيات الحسابات
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden">
        <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
          <h2 className="text-[16px] font-bold text-ink">
            سجل الصيدليات المسجلة
          </h2>
          <button className="text-[14px] font-bold text-primary bg-primary-pale px-4 py-2 rounded-lg hover:bg-teal-pale transition-all">
            + إضافة صيدلية جديدة
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-ink-soft">جاري التحميل...</div>
        ) : (
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[14px]">
                <th className="py-3 px-5 font-semibold">اسم الصيدلية</th>
                <th className="py-3 px-5 font-semibold">تاريخ الانتهاء</th>
                <th className="py-3 px-5 font-semibold">الحالة</th>
                <th className="py-3 px-5 font-semibold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pharmacies.map((pharm) => (
                <tr
                  key={pharm.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-5">
                    <div className="font-bold text-[15px] text-ink">
                      {pharm.name}
                    </div>
                    <div className="text-[13px] text-ink-soft mt-1">
                      مدير: {pharm.manager || "-"}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-[14px] font-mono text-ink-soft">
                    {pharm.expire || "غير محدد"}
                  </td>
                  <td className="py-4 px-5">
                    <button
                      onClick={() => toggleStatus(pharm.id, pharm.isActive)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                        pharm.isActive !== 0
                          ? "bg-teal-pale text-teal hover:bg-teal hover:text-white"
                          : "bg-amber-pale text-amber hover:bg-amber hover:text-white"
                      }`}
                    >
                      {pharm.isActive !== 0 ? "نشط" : "معلق"}
                    </button>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-center gap-2">
                      <button className="px-3 py-1.5 text-[13px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary hover:text-white transition-all">
                        تجديد
                      </button>
                      <button
                        onClick={() => confirmDelete(pharm.id)}
                        className="px-3 py-1.5 text-[13px] font-bold text-coral border border-coral-pale rounded-lg hover:bg-coral hover:text-white transition-all"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pharmacies.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-ink-soft text-[15px]"
                  >
                    لا يوجد بيانات متاحة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-coral-pale flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-coral"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-center text-[20px] font-bold text-ink mb-2">
              تأكيد الحذف
            </h3>
            <p className="text-center text-[15px] text-ink-soft mb-6 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذه الصيدلية بشكل نهائي؟ لا يمكن
              التراجع عن هذا الإجراء وسيتم مسح جميع بياناتها.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null })}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all"
              >
                تراجع
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-3 bg-coral text-white font-bold rounded-xl hover:bg-[#e11d48] transition-all"
              >
                نعم، احذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
