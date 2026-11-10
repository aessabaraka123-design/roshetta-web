"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import ConfirmModal from "@/components/ConfirmModal";
import SupplierStatsHeader from "@/components/suppliers/SupplierStatsHeader";
import SupplierFormModal from "@/components/suppliers/SupplierFormModal";
import SupplierPaymentModal from "@/components/suppliers/SupplierPaymentModal";
import SupplierInvoicesModal from "@/components/suppliers/SupplierInvoicesModal";
import SupplierStatementModal from "@/components/suppliers/SupplierStatementModal";
import InvoicePreviewPdfModal from "@/components/purchases/InvoicePreviewPdfModal";
import QuickPayInvoiceModal from "@/components/purchases/QuickPayInvoiceModal";
import { useStore } from "@/store";
import { resolveBranchId, resolveBranchName } from "@/lib/purchases/domain";
import {
  deleteSupplierAction,
  jsonFetcher,
  loadDomainSnapshot,
  revalidatePurchaseDomain,
  saveDomainSnapshot,
  swrPurchaseKeys,
} from "@/lib/purchases/api";
import { normalizeSearchText } from "@/utils/textUtils";

export default function SuppliersPage() {
  const user = useStore((s: any) => s.user);
  const language = (useStore((s: any) => s.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const pharmacyId = user?.pharmacy_id ? String(user.pharmacy_id) : "";
  const canSwitchBranch = ["manager", "owner", "superadmin"].includes(user?.role || "");
  const actorName = user?.managerName || user?.name || "الإدارة";
  const keys = swrPurchaseKeys(pharmacyId);

  const { data: suppliersData, isLoading } = useSWR(
    keys ? keys.suppliers : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "suppliers") }
  );
  const { data: purchasesData } = useSWR(
    keys ? keys.purchases : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "purchases") }
  );
  const { data: branchesData } = useSWR(
    keys && (canSwitchBranch || user?.role === "branchManager") ? keys.branches : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "branches") }
  );

  useEffect(() => {
    if (suppliersData?.suppliers) saveDomainSnapshot(pharmacyId, "suppliers", suppliersData);
  }, [pharmacyId, suppliersData]);
  useEffect(() => {
    if (purchasesData?.purchases) saveDomainSnapshot(pharmacyId, "purchases", purchasesData);
  }, [pharmacyId, purchasesData]);
  useEffect(() => {
    if (branchesData?.branches) saveDomainSnapshot(pharmacyId, "branches", branchesData);
  }, [pharmacyId, branchesData]);

  const suppliers = suppliersData?.suppliers || [];
  const purchases = purchasesData?.purchases || purchasesData?.invoices || [];
  const branches = branchesData?.branches || [];
  const defaultBranchId = useMemo(
    () => resolveBranchId(user?.branch_id || user?.branch, branches),
    [user, branches]
  );

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  useEffect(() => {
    if (!canSwitchBranch && user?.branch) {
      setBranchFilter(resolveBranchId(user.branch_id || user.branch, branches));
    }
  }, [canSwitchBranch, user, branches]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [payingSupplier, setPayingSupplier] = useState<any | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<any | null>(null);
  const [invoicesSupplier, setInvoicesSupplier] = useState<any | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const filteredSuppliers = useMemo(() => {
    const q = normalizeSearchText(search);
    const rawQ = search.trim().toLowerCase();
    return suppliers.filter((s: any) => {
      if (branchFilter !== "all" && s.branch_id && resolveBranchId(s.branch_id, branches) !== branchFilter) return false;
      if (!q) return true;
      return (
        normalizeSearchText(s.name).includes(q) ||
        normalizeSearchText(s.company).includes(q) ||
        String(s.phone || "").toLowerCase().includes(rawQ)
      );
    });
  }, [suppliers, branchFilter, search, branches]);

  const confirmDelete = async () => {
    if (!deleteTarget || !pharmacyId) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteSupplierAction(pharmacyId, target.id, language);
      toast.success(isEn ? "Supplier deleted" : "تم حذف المورد بنجاح");
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to delete supplier" : "تعذر حذف المورد"));
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-20">
      <AppBar title={isEn ? "Suppliers & Accounts" : "الموردين وكشوف الحساب"} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <p className="text-xs sm:text-sm font-bold text-ink-soft mb-4">
          {isEn
            ? "Manage suppliers, payables, advance credits & authoritative account statements"
            : "إدارة حسابات الموردين، الديون، الأرصدة الدائنة، وسندات الصرف"}
        </p>
        <SupplierStatsHeader suppliers={suppliers} purchases={purchases} lang={language} />

        {/* Filter Bar */}
        <div className="bg-card border border-mint-line rounded-2xl p-4 mb-5 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? "Search by supplier name, company or phone..." : "ابحث باسم المورد، الشركة، أو رقم الهاتف..."}
            className="flex-1 h-11 px-4 rounded-xl bg-bg border border-mint-line text-sm font-medium text-ink"
          />

          {branches.length > 0 && (
            <select
              value={branchFilter}
              disabled={!canSwitchBranch}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink disabled:opacity-70"
            >
              {canSwitchBranch && <option value="all">{isEn ? "All Branches" : "كل الفروع"}</option>}
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingSupplier(null);
              setFormOpen(true);
            }}
            className="h-11 px-5 rounded-xl bg-primary text-white font-black text-sm hover:bg-teal transition-all shadow-md shrink-0"
          >
            + {isEn ? "Add Supplier" : "إضافة مورد جديد"}
          </button>
        </div>

        {/* Suppliers List */}
        {isLoading && suppliers.length === 0 ? (
          <div className="bg-card border border-mint-line rounded-2xl p-12 text-center font-bold text-ink-soft">
            {isEn ? "Loading suppliers..." : "جارٍ تحميل قائمة الموردين..."}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="bg-card border border-mint-line rounded-2xl p-12 text-center font-bold text-ink-soft">
            {isEn ? "No matching suppliers found" : "لا يوجد موردون مطابقون"}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSuppliers.map((sup: any) => {
              const bal = Number(sup.balance) || 0;
              const suppInvoicesCount = purchases.filter(
                (p: any) =>
                  String(p.supplier_id || "") === String(sup.id) ||
                  (sup.name && String(p.supplier_name || "").trim().toLowerCase() === String(sup.name).trim().toLowerCase())
              ).length;

              return (
                <div key={sup.id} className="bg-card border border-mint-line rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/40 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-ink truncate">{sup.name}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-bg border border-mint-line text-ink-soft">
                          {sup.branch_id ? resolveBranchName(sup.branch_id, branches, language) : isEn ? "All Branches" : "كل الفروع"}
                        </span>
                      </div>
                      {sup.company && <div className="text-xs font-bold text-ink-soft mt-0.5">{sup.company}</div>}
                      <div className="text-xs font-mono text-ink-soft mt-1 space-x-3 space-x-reverse">
                        {sup.phone && <span>{sup.phone}</span>}
                        {sup.email && <span>{sup.email}</span>}
                      </div>
                    </div>

                    <div className={`text-end px-3 py-2 rounded-xl border shrink-0 ${bal > 0 ? "bg-coral-pale border-coral/25" : bal < 0 ? "bg-teal/10 border-teal/25" : "bg-bg border-mint-line"}`}>
                      <div className="text-[10px] font-bold text-ink-soft">
                        {bal > 0 ? (isEn ? "Payable" : "مستحق للمورد") : bal < 0 ? (isEn ? "Our Credit" : "رصيد دائن لنا") : isEn ? "Settled" : "متوازن"}
                      </div>
                      <div className={`text-base font-black font-mono ${bal > 0 ? "text-coral" : bal < 0 ? "text-teal" : "text-ink"}`}>
                        ₪{Math.abs(bal).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-mint-line">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setStatementSupplier(sup)}
                        className="px-3.5 py-2 rounded-xl bg-primary-pale text-primary text-xs font-black hover:bg-primary hover:text-white transition-all"
                      >
                        {isEn ? "Statement" : "كشف الحساب"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayingSupplier(sup)}
                        className="px-3.5 py-2 rounded-xl bg-teal text-white text-xs font-black hover:opacity-90 transition-all"
                      >
                        {isEn ? "Pay Voucher" : "سداد دفعة"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoicesSupplier(sup)}
                        className="px-3 py-2 rounded-xl bg-bg border border-mint-line text-ink text-xs font-bold hover:border-primary"
                      >
                        {isEn ? `Invoices (${suppInvoicesCount})` : `الفواتير (${suppInvoicesCount})`}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSupplier(sup);
                          setFormOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-bg border border-mint-line text-xs font-bold text-ink hover:border-primary"
                      >
                        {isEn ? "Edit" : "تعديل"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(sup)}
                        className="px-2.5 py-1.5 rounded-lg bg-coral-pale text-coral text-xs font-black hover:bg-coral hover:text-white transition-all"
                      >
                        {isEn ? "Delete" : "حذف"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SupplierFormModal
        isOpen={formOpen}
        editingSupplier={editingSupplier}
        pharmacyId={pharmacyId}
        branches={branches}
        defaultBranchId={defaultBranchId}
        canSwitchBranch={canSwitchBranch}
        lang={language}
        onClose={() => {
          setFormOpen(false);
          setEditingSupplier(null);
        }}
        onSaved={() => revalidatePurchaseDomain(pharmacyId)}
      />

      <SupplierPaymentModal
        supplier={payingSupplier}
        pharmacyId={pharmacyId}
        branches={branches}
        defaultBranchId={defaultBranchId}
        canSwitchBranch={canSwitchBranch}
        actorName={actorName}
        lang={language}
        onClose={() => setPayingSupplier(null)}
        onSuccess={() => revalidatePurchaseDomain(pharmacyId, payingSupplier?.id)}
      />

      <SupplierStatementModal
        supplier={statementSupplier}
        pharmacyId={pharmacyId}
        purchases={purchases}
        branches={branches}
        lang={language}
        onClose={() => setStatementSupplier(null)}
        onRecordPayment={(sup) => {
          setStatementSupplier(null);
          setPayingSupplier(sup);
        }}
        onOpenInvoice={(invId) => {
          const found = purchases.find((p: any) => String(p.id) === String(invId));
          if (found) setPreviewInvoice(found);
          else toast(isEn ? "Invoice no longer exists" : "الفاتورة غير متوفرة أو ملغاة");
        }}
      />

      <SupplierInvoicesModal
        supplier={invoicesSupplier}
        purchases={purchases}
        branches={branches}
        lang={language}
        onClose={() => setInvoicesSupplier(null)}
        onPreviewInvoice={(inv) => setPreviewInvoice(inv)}
        onPayInvoice={(inv) => setPayingInvoice(inv)}
      />

      <InvoicePreviewPdfModal
        invoice={previewInvoice}
        branches={branches}
        pharmacyName={user?.pharmacyName}
        lang={language}
        onClose={() => setPreviewInvoice(null)}
      />

      <QuickPayInvoiceModal
        invoice={payingInvoice}
        pharmacyId={pharmacyId}
        lang={language}
        onClose={() => setPayingInvoice(null)}
        onSuccess={() => revalidatePurchaseDomain(pharmacyId, payingInvoice?.supplier_id)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={isEn ? "Delete Supplier?" : "حذف المورد؟"}
        message={
          deleteTarget
            ? isEn
              ? `Are you sure you want to delete "${deleteTarget.name}"? Deletion is blocked if the supplier has an unsettled balance or purchase history.`
              : `هل تريد حذف المورد "${deleteTarget.name}"؟ يمنع النظام الحذف تلقائياً إذا كان له رصيد غير مسوّى أو فواتير سابقة.`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={isEn ? "Yes, Delete" : "نعم، حذف"}
        cancelText={isEn ? "Cancel" : "إلغاء"}
        isDestructive={true}
      />
    </div>
  );
}
