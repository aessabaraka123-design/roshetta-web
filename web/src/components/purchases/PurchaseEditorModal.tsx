"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import MasterCatalogModal, { MasterDrug } from "@/components/MasterCatalogModal";
import QuickAddItemModal from "@/components/purchases/QuickAddItemModal";
import {
  BatchActionCode,
  computeInvoiceSummary,
  generateClientId,
  isCompletedStatus,
  normalizeUnitsInput,
  parseUnitsArray,
  PAYMENT_METHODS,
  PaymentMethodCode,
  resolveBranchId,
  round2,
  safeJson,
  validatePurchaseInput,
} from "@/lib/purchases/domain";
import { createPurchaseAction, updateOrApprovePurchaseAction } from "@/lib/purchases/api";
import { normalizeSearchText } from "@/utils/textUtils";

interface Props {
  isOpen: boolean;
  editingInvoice: any | null;
  pharmacyId: string;
  suppliers: any[];
  inventory: any[];
  branches: any[];
  defaultBranchId: string;
  canSwitchBranch: boolean;
  lang: "ar" | "en";
  onClose: () => void;
  onSaved: () => void;
}

interface EditorLine {
  id: string;
  name: string;
  barcode: string;
  scientificName?: string;
  category?: string;
  qty: number;
  cost: number;
  price: number;
  expiry_date: string;
  units: any[] | null;
  unit_size: number;
  batchAction: BatchActionCode;
  existingQty?: number;
  existingCost?: number;
  existingPrice?: number;
  existingExpiry?: string;
  receivedInventoryId?: string;
  receiptEventId?: string;
  receiptLine?: number;
  receivedPhysicalQty?: number;
  isUnitOpen?: boolean;
}

function buildLineFromInventory(item: any): EditorLine {
  const unitsArr = parseUnitsArray(item.units, Number(item.price) || 0);
  const unitSize = unitsArr.length > 0 ? Number(unitsArr[0].count) || 1 : 1;
  return {
    id: String(item.id),
    name: String(item.name || ""),
    barcode: String(item.barcode || ""),
    scientificName: item.scientificName || "",
    category: item.category || "",
    qty: 1,
    cost: Number(item.cost ?? 0),
    price: Number(item.price ?? 0),
    expiry_date: String(item.expiry || "").trim(),
    units: unitsArr.length > 0 ? unitsArr : null,
    unit_size: unitSize,
    batchAction: "split",
    existingQty: Number(item.qty) || 0,
    existingCost: Number(item.cost) || 0,
    existingPrice: Number(item.price) || 0,
    existingExpiry: String(item.expiry || "").trim(),
  };
}

export default function PurchaseEditorModal({
  isOpen,
  editingInvoice,
  pharmacyId,
  suppliers,
  inventory,
  branches,
  defaultBranchId,
  canSwitchBranch,
  lang,
  onClose,
  onSaved,
}: Props) {
  const isEn = lang === "en";
  const isEditing = Boolean(editingInvoice);
  const wasCompleted = Boolean(editingInvoice && isCompletedStatus(editingInvoice.status));

  const [status, setStatus] = useState<"completed" | "draft">("completed");
  const [branchId, setBranchId] = useState(defaultBranchId || "Main");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [lines, setLines] = useState<EditorLine[]>([]);

  const [itemSearch, setItemSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingInvoice) {
      const normStatus = isCompletedStatus(editingInvoice.status) ? "completed" : "draft";
      setStatus(normStatus);
      setBranchId(resolveBranchId(editingInvoice.branch_id || defaultBranchId, branches));
      setSupplierId(String(editingInvoice.supplier_id || ""));
      setInvoiceNumber(String(editingInvoice.invoice_number || editingInvoice.invoiceNumber || ""));
      setNotes(String(editingInvoice.notes || ""));
      setPaidAmount(String(Number(editingInvoice.paid_amount ?? editingInvoice.paid ?? 0)));
      setPaymentMethod((editingInvoice.payment_method as PaymentMethodCode) || "cash");
      setPaymentRef(String(editingInvoice.payment_ref || ""));
      const parsed = safeJson<any[]>(editingInvoice.items, []);
      setLines(
        parsed.map((raw) => {
          const unitsArr = parseUnitsArray(raw.units, Number(raw.price ?? raw.sell_price ?? 0));
          const invMatch = inventory.find((x) => String(x.id) === String(raw.id));
          return {
            id: String(raw.id),
            name: String(raw.name || ""),
            barcode: String(raw.barcode || ""),
            scientificName: raw.scientificName || "",
            category: raw.category || "",
            qty: Number(raw.qty) || 1,
            cost: Number(raw.cost ?? raw.purchase_price ?? 0),
            price: Number(raw.price ?? raw.sell_price ?? 0),
            expiry_date: String(raw.expiry_date || raw.expiry || "").trim(),
            units: unitsArr.length > 0 ? unitsArr : null,
            unit_size: Number(raw.unit_size) || (unitsArr[0]?.count || 1),
            batchAction: raw.batchAction || "split",
            existingQty: Number(invMatch?.qty || 0),
            existingCost: Number(invMatch?.cost || 0),
            existingPrice: Number(invMatch?.price || 0),
            existingExpiry: String(invMatch?.expiry || "").trim(),
            receivedInventoryId: raw.receivedInventoryId,
            receiptEventId: raw.receiptEventId,
            receiptLine: raw.receiptLine,
            receivedPhysicalQty: raw.receivedPhysicalQty,
          };
        })
      );
    } else {
      setStatus("completed");
      setBranchId(resolveBranchId(defaultBranchId, branches));
      setSupplierId("");
      setInvoiceNumber("");
      setNotes("");
      setPaidAmount("0");
      setPaymentMethod("cash");
      setPaymentRef("");
      setLines([]);
    }
    setItemSearch("");
  }, [isOpen, editingInvoice, defaultBranchId, branches]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === String(supplierId)) || null,
    [suppliers, supplierId]
  );

  const availableCredit = useMemo(() => {
    const bal = Number(selectedSupplier?.balance) || 0;
    return bal < 0 ? Math.abs(bal) : 0;
  }, [selectedSupplier]);

  const summary = useMemo(
    () =>
      computeInvoiceSummary({
        items: lines,
        paidAmount: Number(paidAmount) || 0,
        availableCredit: wasCompleted ? 0 : availableCredit,
        creditSettledOverride: wasCompleted ? Number(editingInvoice?.credit_settled || 0) : undefined,
        status,
      }),
    [lines, paidAmount, availableCredit, status, wasCompleted, editingInvoice]
  );

  const branchInventory = useMemo(() => {
    const target = resolveBranchId(branchId, branches);
    return inventory.filter((item) => !item.branch_id || resolveBranchId(item.branch_id, branches) === target);
  }, [inventory, branchId, branches]);

  const searchResults = useMemo(() => {
    const q = normalizeSearchText(itemSearch);
    if (!q) return [];
    return branchInventory
      .filter((item) => {
        const n = normalizeSearchText(item.name);
        const s = normalizeSearchText(item.scientificName);
        const b = String(item.barcode || "").toLowerCase();
        return n.includes(q) || s.includes(q) || b.includes(itemSearch.trim().toLowerCase());
      })
      .slice(0, 12);
  }, [branchInventory, itemSearch]);

  if (!isOpen) return null;

  const addLine = (newLine: EditorLine) => {
    setLines((prev) => {
      const idx = prev.findIndex((p) => String(p.id) === String(newLine.id));
      if (idx >= 0 && !wasCompleted) {
        return prev.map((p, i) => (i === idx ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, newLine];
    });
    setItemSearch("");
  };

  const handlePullLowStock = () => {
    const shortages = branchInventory.filter((item) => Number(item.qty || 0) <= Number(item.minQty ?? 5));
    if (shortages.length === 0) {
      toast(isEn ? "No low-stock items found for this branch" : "لا توجد نواقص في هذا الفرع حالياً");
      return;
    }
    let added = 0;
    setLines((prev) => {
      const next = [...prev];
      for (const item of shortages) {
        if (!next.some((l) => String(l.id) === String(item.id))) {
          next.push(buildLineFromInventory(item));
          added++;
        }
      }
      return next;
    });
    toast.success(isEn ? `Added ${added} low-stock items` : `تم جلب ${added} صنف من النواقص`);
  };

  const handleSelectCatalogDrug = (drug: MasterDrug) => {
    const existingMatch = branchInventory.find(
      (i) => (drug.barcode && i.barcode === drug.barcode) || normalizeSearchText(i.name) === normalizeSearchText(drug.name)
    );
    if (existingMatch) {
      addLine(buildLineFromInventory(existingMatch));
      return;
    }
    const unitMode = drug.hasSubUnit ? (drug.hasSubUnit2 ? 3 : 2) : 1;
    const unitsArr = normalizeUnitsInput({
      unitMode,
      boxName: drug.defaultUnit || "علبة",
      boxPrice: 0,
      part1Name: drug.sub1Name || "شريط",
      part1Qty: drug.sub1Count || 1,
      part2Name: drug.sub2Name || "حبة",
      part2Qty: drug.sub2Count || 1,
    });
    addLine({
      id: generateClientId("INV"),
      name: drug.name,
      barcode: drug.barcode || "",
      scientificName: drug.scientificName || "",
      category: drug.category || "",
      qty: 1,
      cost: 0,
      price: 0,
      expiry_date: "",
      units: unitsArr,
      unit_size: unitsArr?.[0]?.count || 1,
      batchAction: "split",
    });
  };

  const updateLine = (idx: number, patch: Partial<EditorLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const setLineUnitsMode = (idx: number, mode: 1 | 2 | 3) => {
    const line = lines[idx];
    if (!line) return;
    const unitsArr = normalizeUnitsInput({
      unitMode: mode,
      boxName: "علبة",
      boxPrice: line.price,
      part1Name: line.units?.[1]?.name || "شريط",
      part1Qty: mode >= 2 ? 2 : 1,
      part2Name: line.units?.[2]?.name || "حبة",
      part2Qty: mode === 3 ? 10 : 1,
    });
    updateLine(idx, {
      units: unitsArr,
      unit_size: unitsArr?.[0]?.count || 1,
    });
  };

  const lineHasConflict = (line: EditorLine) => {
    if (!line.existingQty || line.existingQty <= 0 || wasCompleted) return false;
    const expDiff = Boolean(line.expiry_date && line.existingExpiry && line.expiry_date !== line.existingExpiry);
    const priceDiff =
      (line.price > 0 && (line.existingPrice || 0) > 0 && Math.abs(line.price - (line.existingPrice || 0)) >= 0.01) ||
      (line.cost > 0 && (line.existingCost || 0) > 0 && Math.abs(line.cost - (line.existingCost || 0)) >= 0.01);
    return expDiff || priceDiff;
  };

  const handleSave = async (targetStatus: "completed" | "draft") => {
    if (submitting) return;
    const payload = {
      supplier_id: supplierId,
      supplier_name: selectedSupplier?.name || "",
      branch_id: branchId,
      invoice_number: invoiceNumber.trim(),
      notes: notes.trim(),
      status: targetStatus,
      paid_amount: targetStatus === "completed" ? Number(paidAmount) || 0 : 0,
      paidAmount: targetStatus === "completed" ? Number(paidAmount) || 0 : 0,
      paymentMethod,
      paymentRef: paymentRef.trim(),
      items: lines.map((l) => ({
        id: l.id,
        name: l.name,
        barcode: l.barcode,
        scientificName: l.scientificName || "",
        category: l.category || "",
        qty: Number(l.qty),
        cost: Number(l.cost),
        purchase_price: Number(l.cost),
        price: Number(l.price),
        sell_price: Number(l.price),
        expiry: l.expiry_date,
        expiry_date: l.expiry_date,
        unit_size: l.unit_size || 1,
        units: l.units,
        batchAction: l.batchAction,
        receivedInventoryId: l.receivedInventoryId,
        receiptEventId: l.receiptEventId,
        receiptLine: l.receiptLine,
        receivedPhysicalQty: l.receivedPhysicalQty,
      })),
    };

    const validation = validatePurchaseInput(payload, lang);
    if (!validation.valid) {
      toast.error(validation.firstError);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateOrApprovePurchaseAction(pharmacyId, editingInvoice.id, payload, lang);
      } else {
        await createPurchaseAction(pharmacyId, payload, lang);
      }
      toast.success(
        targetStatus === "draft"
          ? isEn
            ? "Draft order saved"
            : "تم حفظ الطلبية بانتظار الاستلام"
          : isEn
          ? "Purchase invoice saved and inventory updated"
          : "تم اعتماد فاتورة الشراء وتحديث المخزون بنجاح"
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to save invoice" : "تعذر حفظ فاتورة الشراء"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-card border border-mint-line rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-mint-line flex items-center justify-between bg-bg/50">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-ink">
              {isEditing
                ? isEn
                  ? `Edit Purchase Invoice #${editingInvoice.invoice_number || editingInvoice.id}`
                  : `تعديل فاتورة شراء #${editingInvoice.invoice_number || editingInvoice.id}`
                : isEn
                ? "New Purchase Invoice"
                : "إنشاء فاتورة مشتريات جديدة"}
            </h2>
            {wasCompleted && (
              <p className="text-xs font-bold text-amber mt-0.5">
                {isEn
                  ? "Completed invoice: stock quantities are locked for audit safety; you may update prices, expiry, units & notes."
                  : "فاتورة معتمدة: الكميات مقفلة لحماية جرد المخزون؛ يمكنك تعديل الأسعار، الصلاحية، الوحدات، والملاحظات."}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-bg text-ink-soft hover:text-ink font-bold">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Header Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Supplier" : "المورد"}</label>
              <select
                value={supplierId}
                disabled={wasCompleted}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink disabled:opacity-60"
              >
                <option value="">{isEn ? "-- No Supplier (Cash) --" : "-- بدون مورد (شراء مباشر) --"}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {Number(s.balance) !== 0 ? `(${Number(s.balance) < 0 ? "رصيد لنا" : "دين"}: ₪${Math.abs(Number(s.balance)).toFixed(2)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Branch" : "الفرع المستلم"}</label>
              <select
                value={branchId}
                disabled={!canSwitchBranch || wasCompleted}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-bold text-ink disabled:opacity-60"
              >
                {branches.length === 0 && <option value="Main">{isEn ? "Main Branch" : "الفرع الرئيسي"}</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Supplier Invoice #" : "رقم فاتورة المورد"}</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-..."
                className="w-full h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-mono text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Creation Type" : "حالة الحفظ"}</label>
              <select
                value={status}
                disabled={wasCompleted}
                onChange={(e) => setStatus(e.target.value as "completed" | "draft")}
                className="w-full h-11 px-3 rounded-xl bg-bg border border-mint-line text-sm font-black text-ink disabled:opacity-60"
              >
                <option value="completed">{isEn ? "Actual & Approved (Add to Stock)" : "فاتورة فعلية (اعتماد ودخول للمخزون)"}</option>
                <option value="draft">{isEn ? "Draft Order (Pending Receipt)" : "طلبية مبدئية (بانتظار الاستلام)"}</option>
              </select>
            </div>
          </div>

          {availableCredit > 0 && status === "completed" && !wasCompleted && (
            <div className="p-3.5 rounded-2xl bg-teal/10 border border-teal/30 flex items-center justify-between text-xs sm:text-sm font-bold text-teal">
              <span>
                {isEn
                  ? `Available supplier advance credit: ₪${availableCredit.toFixed(2)} — auto-offset ₪${summary.creditSettled.toFixed(2)} on this bill.`
                  : `يوجد رصيد دائن لنا عند المورد بقيمة ₪${availableCredit.toFixed(2)} — سيتم خصم ₪${summary.creditSettled.toFixed(2)} تلقائياً عند الاعتماد.`}
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Invoice Notes" : "ملاحظات الفاتورة"}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "Optional notes about delivery, bonus items..." : "ملاحظات اختيارية حول التوريد أو البونص..."}
              className="w-full h-10 px-3 rounded-xl bg-bg border border-mint-line text-sm text-ink"
            />
          </div>

          {/* Item Pickers */}
          {!wasCompleted && (
            <div className="bg-bg border border-mint-line rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder={isEn ? "Search inventory by name or barcode to add..." : "ابحث في مخزون الفرع بالاسم أو الباركود لإضافة صنف..."}
                    className="w-full h-10 px-4 rounded-xl bg-card border border-mint-line text-sm font-medium text-ink"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-11 z-30 bg-card border border-mint-line rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-mint-line">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addLine(buildLineFromInventory(item))}
                          className="w-full px-4 py-2.5 text-start hover:bg-primary-pale/50 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-sm font-black text-ink">{item.name}</div>
                            <div className="text-xs text-ink-soft font-mono">
                              {item.barcode} • {isEn ? "Stock:" : "المتوفر:"} {item.qty}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-primary">
                            ₪{Number(item.cost || 0).toFixed(2)} / ₪{Number(item.price || 0).toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePullLowStock}
                  className="h-10 px-3.5 rounded-xl bg-amber-pale text-amber border border-amber/30 text-xs font-black hover:opacity-90"
                >
                  {isEn ? "Pull Shortages" : "جلب النواقص"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(true)}
                  className="h-10 px-3.5 rounded-xl bg-primary-pale text-primary border border-primary/20 text-xs font-black hover:bg-primary hover:text-white transition-all"
                >
                  {isEn ? "+ Quick New Item" : "+ صنف جديد سريع"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalog(true)}
                  className="h-10 px-3.5 rounded-xl bg-teal text-white text-xs font-black hover:opacity-90"
                >
                  {isEn ? "National Drug Catalog" : "دليل الأدوية الوطني"}
                </button>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-3">
            {lines.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-mint-line rounded-2xl text-sm font-bold text-ink-soft">
                {isEn ? "Add items using search, shortage pull, quick add, or catalog above" : "أضف الأصناف عبر البحث، جلب النواقص، الإضافة السريعة، أو دليل الأدوية أعلاه"}
              </div>
            ) : (
              lines.map((line, idx) => {
                const hasConflict = lineHasConflict(line);
                const subTotal = round2(line.qty * line.cost);
                return (
                  <div key={`${line.id}-${idx}`} className="bg-bg border border-mint-line rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-black text-ink">{line.name}</span>
                        {line.barcode && <span className="ms-2 text-xs font-mono text-ink-soft">#{line.barcode}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black font-mono text-primary">₪{subTotal.toFixed(2)}</span>
                        {!wasCompleted && (
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-xs font-black text-coral hover:underline px-2"
                          >
                            {isEn ? "Remove" : "حذف"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft mb-0.5">{isEn ? "Qty (Boxes)" : "الكمية (علب)"}</label>
                        <input
                          type="number"
                          min="1"
                          disabled={wasCompleted}
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })}
                          className="w-full h-9 px-2.5 rounded-xl bg-card border border-mint-line font-mono text-sm font-bold disabled:opacity-60"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft mb-0.5">{isEn ? "Cost Price" : "سعر الشراء"}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.cost}
                          onChange={(e) => updateLine(idx, { cost: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-9 px-2.5 rounded-xl bg-card border border-mint-line font-mono text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft mb-0.5">{isEn ? "Sell Price" : "سعر البيع"}</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.price}
                          onChange={(e) => updateLine(idx, { price: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full h-9 px-2.5 rounded-xl bg-card border border-mint-line font-mono text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft mb-0.5">{isEn ? "Expiry Date" : "تاريخ الصلاحية"}</label>
                        <input
                          type="date"
                          value={line.expiry_date}
                          onChange={(e) => updateLine(idx, { expiry_date: e.target.value })}
                          className="w-full h-9 px-2 rounded-xl bg-card border border-mint-line font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-soft mb-0.5">{isEn ? "Packaging" : "وحدات التجزئة"}</label>
                        <select
                          disabled={wasCompleted && Boolean(line.units)}
                          value={line.units ? line.units.length : 1}
                          onChange={(e) => setLineUnitsMode(idx, Number(e.target.value) as 1 | 2 | 3)}
                          className="w-full h-9 px-2 rounded-xl bg-card border border-mint-line text-xs font-bold"
                        >
                          <option value={1}>{isEn ? "1 Level (Box)" : "مستوى 1 (علبة)"}</option>
                          <option value={2}>{isEn ? "2 Levels (Box+Strip)" : "مستويان (شريط)"}</option>
                          <option value={3}>{isEn ? "3 Levels (Box+Strip+Pill)" : "3 مستويات (حبة)"}</option>
                        </select>
                      </div>
                    </div>

                    {line.units && line.units.length >= 2 && (
                      <div className="p-2.5 rounded-xl bg-card border border-mint-line/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-ink-soft">
                          <span>{isEn ? "Sub-Unit Configuration" : "تفاصيل التجزئة والأسعار"}</span>
                          <span className="font-mono text-primary">
                            1 {line.units[0]?.name || "علبة"} = {line.units[0]?.count || 1}{" "}
                            {line.units[line.units.length - 1]?.name || "وحدة"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          <input
                            type="text"
                            placeholder="اسم المستوى 1"
                            value={line.units[1]?.name || "شريط"}
                            onChange={(e) => {
                              const next = [...(line.units || [])];
                              next[1] = { ...next[1], name: e.target.value };
                              updateLine(idx, { units: next });
                            }}
                            className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-bold"
                          />
                          <input
                            type="number"
                            min="1"
                            disabled={wasCompleted}
                            placeholder="العدد/علبة"
                            value={
                              line.units.length === 3
                                ? Math.max(1, Math.round((line.units[0]?.count || 1) / Math.max(1, line.units[1]?.count || 1)))
                                : line.units[0]?.count || 1
                            }
                            onChange={(e) => {
                              const p1Qty = Math.max(1, Number(e.target.value) || 1);
                              const p2Qty = line.units!.length === 3 ? Math.max(1, Number(line.units![1]?.count) || 1) : 1;
                              const nextUnits = normalizeUnitsInput({
                                unitMode: line.units!.length as 2 | 3,
                                boxName: line.units![0]?.name || "علبة",
                                boxPrice: line.price,
                                part1Name: line.units![1]?.name || "شريط",
                                part1Qty: p1Qty,
                                part2Name: line.units![2]?.name || "حبة",
                                part2Qty: p2Qty,
                              });
                              updateLine(idx, { units: nextUnits, unit_size: nextUnits?.[0]?.count || 1 });
                            }}
                            className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-mono"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="سعر الشريط"
                            value={line.units[1]?.price ?? ""}
                            onChange={(e) => {
                              const next = [...(line.units || [])];
                              next[1] = { ...next[1], price: Math.max(0, Number(e.target.value) || 0) };
                              updateLine(idx, { units: next });
                            }}
                            className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-mono"
                          />
                          {line.units.length === 3 && (
                            <>
                              <input
                                type="text"
                                placeholder="اسم المستوى 2"
                                value={line.units[2]?.name || "حبة"}
                                onChange={(e) => {
                                  const next = [...(line.units || [])];
                                  next[2] = { ...next[2], name: e.target.value };
                                  updateLine(idx, { units: next });
                                }}
                                className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-bold"
                              />
                              <input
                                type="number"
                                min="1"
                                disabled={wasCompleted}
                                placeholder="حبات/شريط"
                                value={line.units[1]?.count || 1}
                                onChange={(e) => {
                                  const p2Qty = Math.max(1, Number(e.target.value) || 1);
                                  const oldP2 = Math.max(1, Number(line.units![1]?.count) || 1);
                                  const p1Qty = Math.max(1, Math.round((Number(line.units![0]?.count) || p2Qty) / oldP2));
                                  const nextUnits = normalizeUnitsInput({
                                    unitMode: 3,
                                    boxName: line.units![0]?.name || "علبة",
                                    boxPrice: line.price,
                                    part1Name: line.units![1]?.name || "شريط",
                                    part1Qty: p1Qty,
                                    part2Name: line.units![2]?.name || "حبة",
                                    part2Qty: p2Qty,
                                  });
                                  updateLine(idx, { units: nextUnits, unit_size: nextUnits?.[0]?.count || 1 });
                                }}
                                className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-mono"
                              />
                              <input
                                type="number"
                                step="0.01"
                                placeholder="سعر الحبة"
                                value={line.units[2]?.price ?? ""}
                                onChange={(e) => {
                                  const next = [...(line.units || [])];
                                  next[2] = { ...next[2], price: Math.max(0, Number(e.target.value) || 0) };
                                  updateLine(idx, { units: next });
                                }}
                                className="h-8 px-2 rounded-lg bg-bg border border-mint-line font-mono"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {hasConflict && (
                      <div className="p-2.5 rounded-xl bg-amber-pale/70 border border-amber/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-ink">
                          {isEn
                            ? "Price or expiry differs from existing stock in this branch:"
                            : "السعر أو الصلاحية تختلف عن الرصيد المتوفر بالفرع:"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateLine(idx, { batchAction: "split" })}
                            className={`px-2.5 py-1 rounded-lg font-bold border ${
                              line.batchAction === "split" ? "bg-primary text-white border-primary" : "bg-card text-ink border-mint-line"
                            }`}
                          >
                            {isEn ? "Separate Batch (Old/New)" : "فصل كدفعة جديدة (القديم/الجديد)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateLine(idx, { batchAction: "merge_update" })}
                            className={`px-2.5 py-1 rounded-lg font-bold border ${
                              line.batchAction === "merge_update" ? "bg-primary text-white border-primary" : "bg-card text-ink border-mint-line"
                            }`}
                          >
                            {isEn ? "Merge & Update Price" : "دمج وتحديث الدفعة"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Payment & Totals Card */}
          {status === "completed" && (
            <div className="bg-bg border border-mint-line rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink-soft mb-1">{isEn ? "Paid Now (₪)" : "المدفوع فوراً عند الاستلام (₪)"}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-card border border-mint-line font-mono text-base font-black text-ink"
                  />
                </div>
                {Number(paidAmount) > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.values(PAYMENT_METHODS).map((m) => (
                        <button
                          key={m.code}
                          type="button"
                          onClick={() => setPaymentMethod(m.code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            paymentMethod === m.code ? "bg-primary text-white border-primary" : "bg-card text-ink-soft border-mint-line"
                          }`}
                        >
                          {isEn ? m.labelEn : m.labelAr}
                        </button>
                      ))}
                    </div>
                    {PAYMENT_METHODS[paymentMethod].requiresRef && (
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder={isEn ? "Reference / Transfer #" : "رقم المرجع / الحوالة (اختياري)"}
                        className="w-full h-9 px-3 rounded-xl bg-card border border-mint-line font-mono text-xs text-ink"
                      />
                    )}
                  </>
                )}
              </div>

              <div className="bg-card border border-mint-line rounded-xl p-4 space-y-2 flex flex-col justify-center">
                <div className="flex justify-between text-sm font-bold text-ink">
                  <span>{isEn ? "Invoice Total" : "إجمالي الفاتورة"}</span>
                  <span className="font-mono font-black">₪{summary.totalCost.toFixed(2)}</span>
                </div>
                {summary.creditSettled > 0 && (
                  <div className="flex justify-between text-xs font-bold text-teal">
                    <span>{isEn ? "Credit Offset" : "خصم من الرصيد الدائن"}</span>
                    <span className="font-mono">-₪{summary.creditSettled.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-ink-soft">
                  <span>{isEn ? "Immediate Payment" : "الدفعة الفورية"}</span>
                  <span className="font-mono">₪{summary.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-coral pt-2 border-t border-mint-line">
                  <span>{isEn ? "Remaining Balance" : "المتبقي على الحساب"}</span>
                  <span className="font-mono">₪{summary.remaining.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-mint-line bg-bg/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-black font-mono text-ink">
            {isEn ? "Total:" : "الإجمالي:"} ₪{summary.totalCost.toFixed(2)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg border border-mint-line font-bold text-sm">
              {isEn ? "Cancel" : "إلغاء"}
            </button>
            {!wasCompleted && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave("draft")}
                className="px-4 py-2.5 rounded-xl bg-amber-pale text-amber border border-amber/30 font-black text-sm hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "..." : isEn ? "Save as Draft PO" : "حفظ كطلبية (مسودة)"}
              </button>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSave("completed")}
              className="px-5 py-2.5 rounded-xl bg-primary text-white font-black text-sm hover:bg-teal shadow-md disabled:opacity-50"
            >
              {submitting
                ? "..."
                : wasCompleted
                ? isEn
                  ? "Save Updates"
                  : "حفظ التعديلات"
                : isEn
                ? "Approve & Receive to Stock"
                : "اعتماد وإدخال للمخزون"}
            </button>
          </div>
        </div>
      </div>

      <QuickAddItemModal
        isOpen={showQuickAdd}
        pharmacyId={pharmacyId}
        branchId={branchId}
        lang={lang}
        onClose={() => setShowQuickAdd(false)}
        onItemCreated={(item) => addLine({ ...item, batchAction: "split" })}
      />

      <MasterCatalogModal
        isOpen={showCatalog}
        onClose={() => setShowCatalog(false)}
        inventory={inventory}
        pharmacyId={pharmacyId}
        branches={branches}
        currentBranchId={branchId}
        onSelectDrug={handleSelectCatalogDrug}
      />
    </div>
  );
}
