"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import ConfirmModal from "@/components/ConfirmModal";
import PurchaseStatsHeader from "@/components/purchases/PurchaseStatsHeader";
import PurchaseFiltersBar from "@/components/purchases/PurchaseFiltersBar";
import PurchaseInvoiceCard from "@/components/purchases/PurchaseInvoiceCard";
import PurchaseEditorModal from "@/components/purchases/PurchaseEditorModal";
import QuickPayInvoiceModal from "@/components/purchases/QuickPayInvoiceModal";
import InvoicePreviewPdfModal from "@/components/purchases/InvoicePreviewPdfModal";
import { useStore } from "@/store";
import {
  formatInvoiceStatus,
  isDraftStatus,
  normalizeInvoiceStatus,
  resolveBranchId,
  resolveBranchName,
  safeJson,
} from "@/lib/purchases/domain";
import {
  deletePurchaseAction,
  jsonFetcher,
  loadDomainSnapshot,
  revalidatePurchaseDomain,
  saveDomainSnapshot,
  swrPurchaseKeys,
} from "@/lib/purchases/api";
import { normalizeSearchText } from "@/utils/textUtils";

export default function PurchasesPage() {
  const user = useStore((s: any) => s.user);
  const language = (useStore((s: any) => s.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const pharmacyId = user?.pharmacy_id ? String(user.pharmacy_id) : "";
  const canSwitchBranch = ["manager", "owner", "superadmin"].includes(user?.role || "");
  const keys = swrPurchaseKeys(pharmacyId);

  const { data: purchasesData, isLoading: purchasesLoading } = useSWR(
    keys ? keys.purchases : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "purchases") }
  );
  const { data: suppliersData } = useSWR(
    keys ? keys.suppliers : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "suppliers") }
  );
  const { data: inventoryData } = useSWR(
    keys ? keys.inventory : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "inventory") }
  );
  const { data: branchesData } = useSWR(
    keys && (canSwitchBranch || user?.role === "branchManager") ? keys.branches : null,
    jsonFetcher,
    { fallbackData: loadDomainSnapshot(pharmacyId, "branches") }
  );

  useEffect(() => {
    if (purchasesData?.purchases) saveDomainSnapshot(pharmacyId, "purchases", purchasesData);
  }, [pharmacyId, purchasesData]);
  useEffect(() => {
    if (suppliersData?.suppliers) saveDomainSnapshot(pharmacyId, "suppliers", suppliersData);
  }, [pharmacyId, suppliersData]);
  useEffect(() => {
    if (inventoryData?.inventory) saveDomainSnapshot(pharmacyId, "inventory", inventoryData);
  }, [pharmacyId, inventoryData]);
  useEffect(() => {
    if (branchesData?.branches) saveDomainSnapshot(pharmacyId, "branches", branchesData);
  }, [pharmacyId, branchesData]);

  const branches = branchesData?.branches || [];
  const suppliers = suppliersData?.suppliers || [];
  const inventory = inventoryData?.inventory || [];
  const purchases = purchasesData?.purchases || purchasesData?.invoices || [];

  const defaultBranchId = useMemo(
    () => resolveBranchId(user?.branch_id || user?.branch, branches),
    [user, branches]
  );

  const [branchFilter, setBranchFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "draft">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!canSwitchBranch && user?.branch) {
      setBranchFilter(resolveBranchId(user.branch_id || user.branch, branches));
    }
  }, [canSwitchBranch, user, branches]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [pdfInvoice, setPdfInvoice] = useState<any | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const filteredPurchases = useMemo(() => {
    const q = normalizeSearchText(search);
    const rawQ = search.trim().toLowerCase();
    return purchases.filter((inv: any) => {
      const invStatus = normalizeInvoiceStatus(inv.status, "completed");
      if (statusFilter !== "all" && invStatus !== statusFilter) return false;
      if (branchFilter !== "all" && resolveBranchId(inv.branch_id || inv.branch, branches) !== branchFilter) return false;
      if (supplierFilter !== "all" && String(inv.supplier_id || "") !== String(supplierFilter)) return false;
      if (!q) return true;
      const numMatch = String(inv.invoice_number || inv.id || "").toLowerCase().includes(rawQ);
      const suppMatch = normalizeSearchText(inv.supplier_name).includes(q);
      const items = safeJson<any[]>(inv.items, []);
      const itemMatch = items.some((it) => normalizeSearchText(it.name).includes(q) || String(it.barcode || "").toLowerCase().includes(rawQ));
      return numMatch || suppMatch || itemMatch;
    });
  }, [purchases, statusFilter, branchFilter, supplierFilter, search, branches]);

  const handleDirectDownloadPdf = async (inv: any) => {
    setDownloadingPdfId(inv.id);
    setPdfInvoice(inv);
    setTimeout(async () => {
      try {
        if (pdfRef.current) {
          // @ts-ignore
          const html2pdf = (await import("html2pdf.js")).default;
          await html2pdf()
            .from(pdfRef.current)
            .set({
              margin: 8,
              filename: `purchase-${inv.invoice_number || inv.id}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .save();
        }
      } catch {
        toast.error(isEn ? "Failed to export PDF" : "تعذر إنشاء ملف PDF");
      } finally {
        setDownloadingPdfId(null);
        setPdfInvoice(null);
      }
    }, 120);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !pharmacyId) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deletePurchaseAction(pharmacyId, target.id, target.supplier_id, language);
      toast.success(
        isDraftStatus(target.status)
          ? isEn
            ? "Draft deleted"
            : "تم حذف الطلبية المبدئية"
          : isEn
          ? "Invoice reversed cleanly"
          : "تم إلغاء الفاتورة وعكس المخزون والرصيد بنجاح"
      );
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Cannot delete invoice" : "تعذر حذف الفاتورة"));
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink pb-20">
      <AppBar title={isEn ? "Purchase Invoices" : "فواتير المشتريات"} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5">
        <p className="text-xs sm:text-sm font-bold text-ink-soft mb-4">
          {isEn
            ? "Manage supplier bills, inventory receipts, batches & credit offsets"
            : "إدارة فواتير الشراء، الاعتماد المخزني، وتحديث الأسعار"}
        </p>
        <PurchaseStatsHeader purchases={purchases} lang={language} />

        <PurchaseFiltersBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          supplierFilter={supplierFilter}
          onSupplierFilterChange={setSupplierFilter}
          branchFilter={branchFilter}
          onBranchFilterChange={setBranchFilter}
          canSwitchBranch={canSwitchBranch}
          branches={branches}
          suppliers={suppliers}
          onNewInvoice={() => {
            setEditingInvoice(null);
            setEditorOpen(true);
          }}
          lang={language}
        />

        {purchasesLoading && purchases.length === 0 ? (
          <div className="bg-card border border-mint-line rounded-2xl p-12 text-center font-bold text-ink-soft">
            {isEn ? "Loading purchase invoices..." : "جارٍ تحميل فواتير المشتريات..."}
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-card border border-mint-line rounded-2xl p-12 text-center space-y-2">
            <div className="text-lg font-black text-ink">
              {isEn ? "No matching purchase invoices" : "لا توجد فواتير مشتريات مطابقة"}
            </div>
            <p className="text-xs font-bold text-ink-soft">
              {isEn ? "Create a new purchase invoice or clear active filters." : "أنشئ فاتورة شراء جديدة أو عدّل خيارات البحث أعلاه."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPurchases.map((inv: any) => (
              <PurchaseInvoiceCard
                key={inv.id}
                invoice={inv}
                branches={branches}
                lang={language}
                isDownloadingPdf={downloadingPdfId === inv.id}
                onPreview={(target) => setPreviewInvoice(target)}
                onDownloadPdf={handleDirectDownloadPdf}
                onPay={(target) => setPayingInvoice(target)}
                onEdit={(target) => {
                  setEditingInvoice(target);
                  setEditorOpen(true);
                }}
                onDelete={(target) => setDeleteTarget(target)}
              />
            ))}
          </div>
        )}
      </main>

      <PurchaseEditorModal
        isOpen={editorOpen}
        editingInvoice={editingInvoice}
        pharmacyId={pharmacyId}
        suppliers={suppliers}
        inventory={inventory}
        branches={branches}
        defaultBranchId={defaultBranchId}
        canSwitchBranch={canSwitchBranch}
        lang={language}
        onClose={() => {
          setEditorOpen(false);
          setEditingInvoice(null);
        }}
        onSaved={() => revalidatePurchaseDomain(pharmacyId)}
      />

      <QuickPayInvoiceModal
        invoice={payingInvoice}
        pharmacyId={pharmacyId}
        lang={language}
        onClose={() => setPayingInvoice(null)}
        onSuccess={() => revalidatePurchaseDomain(pharmacyId, payingInvoice?.supplier_id)}
      />

      <InvoicePreviewPdfModal
        invoice={previewInvoice}
        branches={branches}
        pharmacyName={user?.pharmacyName}
        lang={language}
        onClose={() => setPreviewInvoice(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={
          deleteTarget && isDraftStatus(deleteTarget.status)
            ? isEn
              ? "Delete Draft Order?"
              : "حذف الطلبية المبدئية؟"
            : isEn
            ? "Reverse & Delete Invoice?"
            : "إلغاء وعكس فاتورة الشراء؟"
        }
        message={
          deleteTarget && isDraftStatus(deleteTarget.status)
            ? isEn
              ? "This draft purchase order has not entered inventory and will be permanently deleted."
              : "لم تدخل هذه الطلبية للمخزون بعد وسيتم حذفها نهائياً."
            : isEn
            ? "Deleting a completed invoice reverses untouched stock batches and restores supplier debt balance (preserving separate vouchers as credit). If any item has already been sold, deletion is blocked."
            : "سيتم عكس الكميات من المخزون وتعديل رصيد المورد مع الحفاظ على أي سندات صرف منفصلة كرصيد دائن لنا. إذا تم بيع جزء من البضاعة سيتم رفض الإلغاء تلقائياً."
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={isEn ? "Yes, Confirm" : "نعم، تأكيد"}
        cancelText={isEn ? "Cancel" : "تراجع"}
        isDestructive={true}
      />

      {/* Offscreen A4 PDF Render Target for Quick One-Click PDF */}
      {pdfInvoice && (
        <div className="fixed -left-[9999px] top-0 w-[794px] bg-white text-slate-900 p-8" ref={pdfRef} dir={isEn ? "ltr" : "rtl"}>
          <div className="text-center pb-4 mb-4 border-b-2 border-slate-200">
            <h2 className="text-2xl font-black">{pdfInvoice.supplier_name || (isEn ? "No Supplier" : "بدون مورد")}</h2>
            <p className="text-sm font-mono text-slate-600 mt-1">
              #{pdfInvoice.invoice_number || pdfInvoice.id} • {resolveBranchName(pdfInvoice.branch_id, branches, language)} •{" "}
              {formatInvoiceStatus(pdfInvoice.status, language).label}
            </p>
          </div>
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs font-black">
                <th className="py-2 text-start">{isEn ? "Item" : "الصنف"}</th>
                <th className="py-2 text-center">{isEn ? "Qty" : "الكمية"}</th>
                <th className="py-2 text-center">{isEn ? "Cost" : "التكلفة"}</th>
                <th className="py-2 text-end">{isEn ? "Total" : "الإجمالي"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeJson<any[]>(pdfInvoice.items, []).map((it, i) => (
                <tr key={i}>
                  <td className="py-2 text-sm font-bold">{it.name}</td>
                  <td className="py-2 text-sm font-mono text-center">{it.qty}</td>
                  <td className="py-2 text-sm font-mono text-center">₪{Number(it.cost ?? it.purchase_price ?? 0).toFixed(2)}</td>
                  <td className="py-2 text-sm font-mono font-bold text-end">
                    ₪{(Number(it.qty || 0) * Number(it.cost ?? it.purchase_price ?? 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 pt-3 border-t-2 border-slate-200 flex justify-between font-black text-base">
            <span>{isEn ? "Grand Total" : "الإجمالي الكلي"}</span>
            <span className="font-mono">₪{Number(pdfInvoice.total_cost ?? pdfInvoice.total ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
