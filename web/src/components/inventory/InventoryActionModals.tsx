"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import LocalBarcode from "@/components/LocalBarcode";
import {
  canViewCosts,
  composeBaseQty,
  extractBoxMultiplier,
  formatQtyWithUnits,
  normalizeExpiryIso,
  parseUnitsArray,
  round2,
  STOCK_ADJUSTMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import {
  recordStockAdjustmentItem,
  splitOrAddBatchItem,
  useControlledDrugsLogData,
  useStockMovementsData,
} from "@/lib/inventory/api";

// ─── 1. Split / Add Batch Modal ──────────────────────────────────
export function SplitBatchModal({
  item,
  pharmacyId,
  userRole,
  language = "ar",
  onClose,
}: {
  item: InventoryItemRecord | null;
  pharmacyId: string;
  userRole?: string;
  language?: "ar" | "en";
  onClose: () => void;
}) {
  const isEn = language === "en";
  const showCosts = canViewCosts(userRole);
  const [boxes, setBoxes] = useState("1");
  const [loosePills, setLoosePills] = useState("0");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setBoxes("1");
    setLoosePills("0");
    setCost(item.cost !== undefined ? String(item.cost) : "");
    setPrice(item.price !== undefined ? String(item.price) : "");
    setBatchNumber("");
    setExpiryMonth("");
  }, [item]);

  if (!item) return null;
  const units = parseUnitsArray(item.units);
  const mult = extractBoxMultiplier(units);
  const addedBaseQty = composeBaseQty({ boxes: Number(boxes) || 0, pills: mult > 1 ? Number(loosePills) || 0 : 0 }, units);

  const handleSave = async () => {
    if (addedBaseQty <= 0) {
      toast.error(isEn ? "Quantity must be positive" : "يجب إدخال كمية أكبر من صفر");
      return;
    }
    setSubmitting(true);
    try {
      await splitOrAddBatchItem(
        pharmacyId,
        item.id,
        {
          addedBaseQty,
          cost: showCosts ? Number(cost || item.cost || 0) : Number(item.cost || 0),
          price: Number(price || item.price || 0),
          batch_number: batchNumber.trim(),
          expiry: normalizeExpiryIso(expiryMonth),
        },
        language
      );
      toast.success(isEn ? "FEFO batch added cleanly" : "تمت إضافة الدفعة لجدول FEFO بنجاح");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed adding batch" : "فشل إضافة الدفعة"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg p-6 shadow-2xl border border-mint-line space-y-4">
        <div className="flex items-center justify-between border-b border-mint-line pb-3">
          <div>
            <h3 className="text-[18px] font-black text-primary">
              {isEn ? "Add New Batch (FEFO)" : "إضافة تشغيلة / دفعة جديدة"}
            </h3>
            <p className="text-[12px] text-ink-soft font-bold">{item.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg font-bold text-ink-soft hover:text-coral">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{units[0]?.name || (isEn ? "Boxes" : "عدد العلب")}</label>
            <input type="number" min="0" value={boxes} onChange={(e) => setBoxes(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
          </div>
          {mult > 1 && (
            <div>
              <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Extra Base Units" : "وحدات مفردة إضافية"}</label>
              <input type="number" min="0" value={loosePills} onChange={(e) => setLoosePills(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
            </div>
          )}
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Batch Number" : "رقم التشغيلة"}</label>
            <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="BN-2027" className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Expiry (Month/Year)" : "الصلاحية (شهر/سنة)"}</label>
            <input type="month" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Sell Price (Box)" : "سعر البيع"}</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
          </div>
          {showCosts && (
            <div>
              <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Cost (Box)" : "سعر التكلفة"}</label>
              <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
            </div>
          )}
        </div>

        <div className="bg-primary-pale/60 rounded-xl p-3 text-[12px] font-bold text-primary">
          {isEn ? "Will add:" : "الكمية المضافة:"} {formatQtyWithUnits({ qty: addedBaseQty, units }, units, language)}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-bg text-ink-soft font-bold text-[13px]">{isEn ? "Cancel" : "إلغاء"}</button>
          <button disabled={submitting} onClick={handleSave} className="px-5 py-2 rounded-xl bg-primary text-white font-black text-[13px] hover:bg-primary-light disabled:opacity-50">
            {submitting ? "..." : (isEn ? "Add Batch" : "اعتماد الدفعة")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Damaged / Waste Adjustment Modal ─────────────────────────
export function WasteAdjustmentModal({
  item,
  pharmacyId,
  userName = "المدير",
  userRole,
  language = "ar",
  onClose,
}: {
  item: InventoryItemRecord | null;
  pharmacyId: string;
  userName?: string;
  userRole?: string;
  language?: "ar" | "en";
  onClose: () => void;
}) {
  const isEn = language === "en";
  const showCosts = canViewCosts(userRole);
  const [boxes, setBoxes] = useState("1");
  const [loosePills, setLoosePills] = useState("0");
  const [reason, setReason] = useState(STOCK_ADJUSTMENT_REASONS[0].labelAr);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setBoxes("1");
      setLoosePills("0");
      setReason(isEn ? STOCK_ADJUSTMENT_REASONS[0].labelEn : STOCK_ADJUSTMENT_REASONS[0].labelAr);
      setNotes("");
    }
  }, [item, isEn]);

  if (!item) return null;
  const units = parseUnitsArray(item.units);
  const mult = extractBoxMultiplier(units);
  const deductBase = composeBaseQty({ boxes: Number(boxes) || 0, pills: mult > 1 ? Number(loosePills) || 0 : 0 }, units);
  const estLoss = round2((deductBase / mult) * (Number(item.cost) || 0));

  const handleSubmit = async () => {
    if (deductBase <= 0) {
      toast.error(isEn ? "Quantity must be positive" : "الرجاء إدخال كمية التلف");
      return;
    }
    if (deductBase > (Number(item.qty) || 0)) {
      toast.error(isEn ? "Cannot exceed current stock" : "كمية التلف تتجاوز الرصيد الحالي");
      return;
    }
    setSubmitting(true);
    try {
      await recordStockAdjustmentItem(
        pharmacyId,
        {
          drug_id: item.id,
          qty: deductBase,
          expectedQty: Number(item.qty) || 0,
          reason,
          notes,
          recorded_by: userName,
        },
        language
      );
      toast.success(isEn ? "Waste write-off recorded" : "تم خصم التوالف وتسجيل القيد بنجاح");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed recording waste" : "فشل تسجيل التوالف"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg p-6 shadow-2xl border border-mint-line space-y-4">
        <div className="flex items-center justify-between border-b border-mint-line pb-3">
          <div>
            <h3 className="text-[18px] font-black text-coral">{isEn ? "Write-Off / Damaged Stock" : "تسجيل تالف / هدر مخزون"}</h3>
            <p className="text-[12px] text-ink-soft font-bold">{item.name} — {formatQtyWithUnits(item, units, language)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg font-bold text-ink-soft hover:text-coral">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{units[0]?.name || (isEn ? "Boxes" : "العلب التالفة")}</label>
            <input type="number" min="0" value={boxes} onChange={(e) => setBoxes(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
          </div>
          {mult > 1 && (
            <div>
              <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Extra Base Units" : "وحدات مفردة"}</label>
              <input type="number" min="0" value={loosePills} onChange={(e) => setLoosePills(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 font-mono font-bold" />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Reason" : "سبب التسوية"}</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold">
              {STOCK_ADJUSTMENT_REASONS.map((r) => (
                <option key={r.code} value={isEn ? r.labelEn : r.labelAr}>
                  {isEn ? r.labelEn : r.labelAr}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Notes" : "ملاحظات"}</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isEn ? "Optional note" : "تفاصيل إضافية"} className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2 text-[13px]" />
          </div>
        </div>

        <div className="bg-coral-pale/50 border border-coral/30 rounded-xl p-3 text-[12px] font-bold text-coral flex justify-between">
          <span>{isEn ? "Deduct:" : "الخصم الفعلي:"} {formatQtyWithUnits({ qty: deductBase, units }, units, language)}</span>
          {showCosts && <span>{isEn ? "Est. Loss:" : "الخسارة المقدرة:"} {estLoss.toFixed(2)} ₪</span>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-bg text-ink-soft font-bold text-[13px]">{isEn ? "Cancel" : "إلغاء"}</button>
          <button disabled={submitting} onClick={handleSubmit} className="px-5 py-2 rounded-xl bg-coral text-white font-black text-[13px] disabled:opacity-50">
            {submitting ? "..." : (isEn ? "Confirm Write-Off" : "تأكيد الخصم والتسجيل")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Item Stock Card Ledger Modal (كارت الصنف) ────────────────
export function StockMovementsModal({
  item,
  pharmacyId,
  language = "ar",
  onClose,
}: {
  item: InventoryItemRecord | null;
  pharmacyId: string;
  language?: "ar" | "en";
  onClose: () => void;
}) {
  const isEn = language === "en";
  const { movements, isLoading } = useStockMovementsData(pharmacyId, item?.id || null);

  if (!item) return null;
  const units = parseUnitsArray(item.units);

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-4xl max-h-[88vh] flex flex-col p-6 shadow-2xl border border-mint-line">
        <div className="flex items-center justify-between border-b border-mint-line pb-3 mb-4">
          <div>
            <h3 className="text-[19px] font-black text-primary">{isEn ? `Stock Card Ledger — ${item.name}` : `كارت حركة الصنف — ${item.name}`}</h3>
            <p className="text-[12px] font-bold text-ink-soft">
              {isEn ? "Current Balance:" : "الرصيد الحالي:"} {formatQtyWithUnits(item, units, language)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg font-bold text-ink-soft hover:text-coral">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-ink-soft font-bold">{isEn ? "Loading ledger..." : "جاري تحميل حركات الصنف..."}</div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-ink-soft font-bold">{isEn ? "No stock movements recorded yet." : "لا توجد حركات مسجلة لهذا الصنف حتى الآن."}</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-bg text-ink-soft text-[12px] font-black">
                  <th className="p-2.5 text-start">{isEn ? "Date" : "التاريخ"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Movement" : "العملية"}</th>
                  <th className="p-2.5 text-center">{isEn ? "Delta" : "التغير"}</th>
                  <th className="p-2.5 text-center">{isEn ? "Before -> After" : "الرصيد قبل ← بعد"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Batch / Ref" : "التشغيلة / المرجع"}</th>
                  <th className="p-2.5 text-start">{isEn ? "By" : "المسؤول"}</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m: any) => {
                  const meta = STOCK_MOVEMENT_TYPES[m.type] || { labelAr: m.type, labelEn: m.type };
                  const positive = Number(m.delta) > 0;
                  return (
                    <tr key={m.id} className="border-b border-mint-line hover:bg-primary-pale/30">
                      <td className="p-2.5 font-mono text-[11px] text-ink-soft">{String(m.created_at || "").slice(0, 16).replace("T", " ")}</td>
                      <td className="p-2.5 font-bold text-ink">
                        <div>{isEn ? meta.labelEn : meta.labelAr}</div>
                        {m.notes && <div className="text-[11px] text-ink-soft font-normal">{m.notes}</div>}
                      </td>
                      <td className={`p-2.5 text-center font-mono font-black ${positive ? "text-emerald-700" : Number(m.delta) < 0 ? "text-coral" : "text-ink-soft"}`}>
                        {positive ? "+" : ""}{m.delta}
                      </td>
                      <td className="p-2.5 text-center font-mono text-[12px]">
                        {m.qty_before} ➔ <span className="font-black text-primary">{m.qty_after}</span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-ink-soft">
                        {m.batch_number || m.reference_id || "—"}
                      </td>
                      <td className="p-2.5 text-[12px] text-ink">{m.actor_name || "System"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 4. Printable Barcode Label Modal ────────────────────────────
export function BarcodeLabelModal({
  item,
  language = "ar",
  onClose,
}: {
  item: InventoryItemRecord | null;
  language?: "ar" | "en";
  onClose: () => void;
}) {
  const isEn = language === "en";
  const [copies, setCopies] = useState(4);
  if (!item) return null;
  const code = String(item.barcode || item.id || "000000").slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-2xl p-6 shadow-2xl border border-mint-line space-y-4">
        <div className="flex items-center justify-between border-b border-mint-line pb-3 print:hidden">
          <h3 className="text-[18px] font-black text-primary">{isEn ? "Print Barcode Labels" : "طباعة ملصقات الباركود"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg font-bold text-ink-soft">✕</button>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <label className="text-[13px] font-bold text-ink-soft">{isEn ? "Copies:" : "عدد الملصقات:"}</label>
          <input type="number" min="1" max="40" value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(40, Number(e.target.value) || 1)))} className="w-24 bg-bg border border-mint-line rounded-xl px-3 py-1.5 font-mono font-bold" />
          <button onClick={() => window.print()} className="ms-auto px-5 py-2 rounded-xl bg-primary text-white font-black text-[13px]">
            {isEn ? "Print Stickers" : "طباعة الملصقات"}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto print:overflow-visible print:max-h-none">
          {Array.from({ length: copies }).map((_, idx) => (
            <div key={idx} className="border border-dashed border-ink-soft/40 rounded-xl p-2 text-center bg-white">
              <div className="text-[11px] font-black text-ink truncate">{item.name}</div>
              <div className="text-[12px] font-black text-primary">{Number(item.price || 0).toFixed(2)} ₪</div>
              <LocalBarcode value={code} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 5. Controlled Drugs Dispensing Register Modal ───────────────
export function ControlledRegisterModal({
  isOpen,
  pharmacyId,
  language = "ar",
  onClose,
}: {
  isOpen: boolean;
  pharmacyId: string;
  language?: "ar" | "en";
  onClose: () => void;
}) {
  const isEn = language === "en";
  const { log, isLoading } = useControlledDrugsLogData(pharmacyId, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-4xl max-h-[88vh] flex flex-col p-6 shadow-2xl border border-mint-line">
        <div className="flex items-center justify-between border-b border-mint-line pb-3 mb-4">
          <div>
            <h3 className="text-[19px] font-black text-coral">{isEn ? "Controlled Medicines Register" : "دفتر صرف الأدوية المراقبة والسموم"}</h3>
            <p className="text-[12px] text-ink-soft font-bold">{isEn ? "Audit log of all dispensed restricted drugs" : "سجل رقابي موثق لكافة عمليات صرف الأدوية المقيدة"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg font-bold text-ink-soft">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-10 text-center text-ink-soft font-bold">{isEn ? "Loading..." : "جاري التحميل..."}</div>
          ) : log.length === 0 ? (
            <div className="py-10 text-center text-ink-soft font-bold">{isEn ? "No controlled dispenses recorded." : "لا توجد حركات صرف لأدوية مراقبة."}</div>
          ) : (
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-amber-pale/70 text-ink font-black text-[12px]">
                  <th className="p-2.5 text-start">{isEn ? "Date" : "التاريخ"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Drug" : "الصنف المراقب"}</th>
                  <th className="p-2.5 text-center">{isEn ? "Qty" : "الكمية"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Patient" : "اسم المريض"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Dispensed By" : "الصيدلي الصارف"}</th>
                  <th className="p-2.5 text-start">{isEn ? "Sale #" : "رقم الفاتورة"}</th>
                </tr>
              </thead>
              <tbody>
                {log.map((row: any) => (
                  <tr key={row.id} className="border-b border-mint-line hover:bg-bg/40">
                    <td className="p-2.5 font-mono text-[12px]">{row.date}</td>
                    <td className="p-2.5 font-black text-ink">{row.drug}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-coral">{row.qty}</td>
                    <td className="p-2.5 font-bold">{row.patient} {row.patientPhone ? `(${row.patientPhone})` : ""}</td>
                    <td className="p-2.5">{row.cashier}</td>
                    <td className="p-2.5 font-mono text-[11px] text-ink-soft">{row.saleId || row.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
