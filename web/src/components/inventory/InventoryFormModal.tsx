"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  buildUnitsArray,
  canViewCosts,
  composeBaseQty,
  decomposeBaseQty,
  formatQtyWithUnits,
  getActiveBranches,
  getCategoryList,
  normalizeExpiryIso,
  parseUnitsArray,
  resolveBranchId,
  resolveBranchName,
  toMonthPickerValue,
  validateInventoryInput,
  type BranchRecord,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import { addInventoryItem, updateInventoryItem } from "@/lib/inventory/api";

export interface InventoryFormInitialDraft {
  name?: string;
  scientificName?: string;
  barcode?: string;
  category?: string;
  manufacturer?: string;
  isControlled?: boolean;
  price?: number | string;
  cost?: number | string;
  minQty?: number | string;
  units?: any;
}

interface Props {
  mode?: "modal" | "page";
  isOpen?: boolean;
  onClose?: () => void;
  onSaved?: (res?: any, keepOpen?: boolean) => void;
  editingItem?: InventoryItemRecord | null;
  initialDraft?: InventoryFormInitialDraft | null;
  pharmacyId: string;
  userRole?: string;
  userBranch?: string;
  branches?: BranchRecord[];
  defaultBranchFilter?: string;
  language?: "ar" | "en";
}

export default function InventoryFormModal({
  mode = "modal",
  isOpen = true,
  onClose,
  onSaved,
  editingItem = null,
  initialDraft = null,
  pharmacyId,
  userRole,
  userBranch,
  branches = [],
  defaultBranchFilter = "all",
  language = "ar",
}: Props) {
  const isEn = language === "en";
  const showCosts = canViewCosts(userRole);
  const activeBranches = useMemo(() => getActiveBranches(branches), [branches]);
  const categories = useMemo(() => getCategoryList(language), [language]);
  const isEdit = Boolean(editingItem?.id);

  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState(isEn ? "General Medicines" : "أدوية عامة");
  const [manufacturer, setManufacturer] = useState("");
  const [isControlled, setIsControlled] = useState(false);
  const [price, setPrice] = useState("");
  const [priceError, setPriceError] = useState("");
  const [cost, setCost] = useState("");
  const [minQty, setMinQty] = useState("5");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [branchId, setBranchId] = useState("");

  // Units & qty state
  const [boxName, setBoxName] = useState(isEn ? "Box" : "علبة");
  const [hasSub1, setHasSub1] = useState(false);
  const [sub1Name, setSub1Name] = useState(isEn ? "Strip" : "شريط");
  const [sub1PerBox, setSub1PerBox] = useState("");
  const [sub1Price, setSub1Price] = useState("");
  const [sub1Barcode, setSub1Barcode] = useState("");
  const [hasSub2, setHasSub2] = useState(false);
  const [sub2Name, setSub2Name] = useState(isEn ? "Pill" : "حبة");
  const [sub2PerSub1, setSub2PerSub1] = useState("");
  const [sub2Price, setSub2Price] = useState("");
  const [sub2Barcode, setSub2Barcode] = useState("");

  // Remainder-safe Stock fields (boxes + strips + pills)
  const [qtyBoxes, setQtyBoxes] = useState("0");
  const [qtyStrips, setQtyStrips] = useState("0");
  const [qtyPills, setQtyPills] = useState("0");

  useEffect(() => {
    if (mode === "modal" && !isOpen) return;

    if (editingItem) {
      const units = parseUnitsArray(editingItem.units);
      const decomp = decomposeBaseQty(Number(editingItem.qty) || 0, units);
      setName(editingItem.name || "");
      setScientificName(editingItem.scientificName || "");
      setBarcode(editingItem.barcode || "");
      setCategory(editingItem.category || (isEn ? "General Medicines" : "أدوية عامة"));
      setManufacturer(editingItem.manufacturer || "");
      setIsControlled([true, 1, "1"].includes(editingItem.isControlled as any));
      setPrice(editingItem.price !== undefined && Number(editingItem.price) > 0 ? String(editingItem.price) : "");
      setPriceError("");
      setCost(editingItem.cost !== undefined ? String(editingItem.cost) : "");
      setMinQty(editingItem.minQty !== undefined && editingItem.minQty !== null ? String(editingItem.minQty) : "5");
      setBatchNumber(editingItem.batch_number || "");
      setExpiryMonth(toMonthPickerValue(editingItem.expiry));
      setBranchId(editingItem.branch_id || "");

      setBoxName(units[0]?.name || (isEn ? "Box" : "علبة"));
      if (units.length >= 3) {
        setHasSub1(true);
        setHasSub2(true);
        const s2Count = Math.max(2, Number(units[1].count) || 2);
        const s1Count = Math.max(2, Math.round((Number(units[0].count) || s2Count) / s2Count));
        setSub1Name(units[1].name || "شريط");
        setSub1PerBox(String(s1Count));
        setSub1Price(String(units[1].price ?? ""));
        setSub1Barcode(units[1].barcode || "");
        setSub2Name(units[2].name || "حبة");
        setSub2PerSub1(String(s2Count));
        setSub2Price(String(units[2].price ?? ""));
        setSub2Barcode(units[2].barcode || "");
        setQtyBoxes(String(decomp.boxes));
        setQtyStrips(String(decomp.strips));
        setQtyPills(String(decomp.pills));
      } else if (units.length === 2) {
        setHasSub1(true);
        setHasSub2(false);
        setSub1Name(units[1].name || "شريط");
        setSub1PerBox(String(Math.max(2, Number(units[0].count) || 2)));
        setSub1Price(String(units[1].price ?? ""));
        setSub1Barcode(units[1].barcode || "");
        setSub2PerSub1("");
        setSub2Price("");
        setSub2Barcode("");
        setQtyBoxes(String(decomp.boxes));
        setQtyStrips("0");
        setQtyPills(String(decomp.pills));
      } else {
        setHasSub1(false);
        setHasSub2(false);
        setSub1PerBox("");
        setSub1Price("");
        setSub1Barcode("");
        setSub2PerSub1("");
        setSub2Price("");
        setSub2Barcode("");
        setQtyBoxes(String(decomp.baseQty));
        setQtyStrips("0");
        setQtyPills("0");
      }
      return;
    }

    // New item / Catalog draft initialization
    const draft = initialDraft || {};
    const draftUnits = parseUnitsArray(draft.units);
    setName(draft.name || "");
    setScientificName(draft.scientificName || "");
    setBarcode(draft.barcode || "");
    setCategory(draft.category || (isEn ? "General Medicines" : "أدوية عامة"));
    setManufacturer(draft.manufacturer || "");
    setIsControlled(Boolean(draft.isControlled));
    setPrice(draft.price !== undefined && Number(draft.price) > 0 ? String(draft.price) : "");
    setPriceError("");
    setCost(draft.cost !== undefined ? String(draft.cost) : "");
    setMinQty(draft.minQty !== undefined ? String(draft.minQty) : "5");
    setBatchNumber("");
    setExpiryMonth("");

    const defaultBr =
      resolveBranchId(activeBranches, defaultBranchFilter !== "all" ? defaultBranchFilter : userBranch) ||
      (activeBranches[0]?.id ? String(activeBranches[0].id) : "");
    setBranchId(defaultBr);

    if (draftUnits.length >= 3) {
      setBoxName(draftUnits[0].name || "علبة");
      setHasSub1(true);
      setHasSub2(true);
      const s2Count = Math.max(2, Number(draftUnits[1].count) || 2);
      const s1Count = Math.max(2, Math.round((Number(draftUnits[0].count) || s2Count) / s2Count));
      setSub1Name(draftUnits[1].name || "شريط");
      setSub1PerBox(String(s1Count));
      setSub1Price(String(draftUnits[1].price || ""));
      setSub2Name(draftUnits[2].name || "حبة");
      setSub2PerSub1(String(s2Count));
      setSub2Price(String(draftUnits[2].price || ""));
    } else if (draftUnits.length === 2) {
      setBoxName(draftUnits[0].name || "علبة");
      setHasSub1(true);
      setHasSub2(false);
      setSub1Name(draftUnits[1].name || "شريط");
      setSub1PerBox(String(Math.max(2, Number(draftUnits[0].count) || 2)));
      setSub1Price(String(draftUnits[1].price || ""));
      setSub2PerSub1("");
      setSub2Price("");
    } else {
      setBoxName(isEn ? "Box" : "علبة");
      setHasSub1(false);
      setHasSub2(false);
      setSub1Name(isEn ? "Strip" : "شريط");
      setSub1PerBox("");
      setSub1Price("");
      setSub1Barcode("");
      setSub2Name(isEn ? "Pill" : "حبة");
      setSub2PerSub1("");
      setSub2Price("");
      setSub2Barcode("");
    }
    setQtyBoxes("");
    setQtyStrips("0");
    setQtyPills("0");
  }, [editingItem, initialDraft, isOpen, mode, isEn, activeBranches, defaultBranchFilter, userBranch]);

  const builtUnits = useMemo(
    () =>
      buildUnitsArray({
        boxName,
        boxPrice: Number(price) || 0,
        boxBarcode: barcode,
        hasSub1,
        sub1Name,
        sub1PerBox: Number(sub1PerBox) || 0,
        sub1Price: sub1Price === "" ? "" : Number(sub1Price),
        sub1Barcode,
        hasSub2,
        sub2Name,
        sub2PerSub1: Number(sub2PerSub1) || 0,
        sub2Price: sub2Price === "" ? "" : Number(sub2Price),
        sub2Barcode,
      }),
    [boxName, price, barcode, hasSub1, sub1Name, sub1PerBox, sub1Price, sub1Barcode, hasSub2, sub2Name, sub2PerSub1, sub2Price, sub2Barcode]
  );

  const computedBaseQty = useMemo(() => {
    return composeBaseQty(
      {
        boxes: Number(qtyBoxes) || 0,
        strips: hasSub1 && hasSub2 ? Number(qtyStrips) || 0 : 0,
        pills: hasSub1 ? Number(qtyPills) || 0 : 0,
      },
      builtUnits
    );
  }, [qtyBoxes, qtyStrips, qtyPills, hasSub1, hasSub2, builtUnits]);

  const generateBarcode = () => {
    setBarcode(`629${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  const handleSubmit = async (keepOpen = false) => {
    const expiryIso = normalizeExpiryIso(expiryMonth);
    const cleanPrice = String(price).trim();
    const validation = validateInventoryInput({
      name,
      scientificName,
      barcode,
      category,
      manufacturer,
      price: cleanPrice === "" ? "" : Number(cleanPrice),
      cost: showCosts ? Number(cost || 0) : Number(editingItem?.cost || 0),
      qty: computedBaseQty,
      minQty: Number(minQty === "" ? 5 : minQty),
      expiry: expiryIso,
      batch_number: batchNumber,
      isControlled,
      units: builtUnits,
    });

    if (!validation.ok) {
      if (validation.code === "PRICE_REQUIRED" || validation.code === "INVALID_PRICE") {
        setPriceError(validation.message);
      } else {
        setPriceError("");
      }
      toast.error(validation.message);
      return;
    }
    setPriceError("");

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        ...validation.normalized,
        units: builtUnits.length > 1 || barcode ? builtUnits : null,
        branch_id: isEdit ? (editingItem?.branch_id || null) : (branchId || null),
      };
      if (!showCosts && isEdit) delete payload.cost;

      let res;
      if (isEdit && editingItem) {
        payload.expectedQty = Number(editingItem.qty) || 0;
        res = await updateInventoryItem(pharmacyId, editingItem.id, payload, language);
        toast.success(isEn ? "Item updated cleanly" : "تم تحديث الصنف بنجاح");
      } else {
        res = await addInventoryItem(pharmacyId, payload, language);
        toast.success(isEn ? "Item added to inventory" : "تمت إضافة الصنف للمخزون بنجاح");
      }
      if (onSaved) onSaved(res, keepOpen);
      if (mode === "modal" && !keepOpen && onClose) onClose();
      if (keepOpen && !isEdit) {
        setName("");
        setScientificName("");
        setBarcode("");
        setPrice("");
        setCost("");
        setBatchNumber("");
        setExpiryMonth("");
        setQtyBoxes("");
        setQtyStrips("0");
        setQtyPills("0");
      }
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Save failed" : "فشل حفظ الصنف"));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "modal" && !isOpen) return null;

  const formBody = (
    <div className="space-y-5">
      {/* Identity & Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Trade Name *" : "الاسم التجاري *"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isEn ? "e.g., Amoxicillin 500mg" : "مثال: أموكسيسيلين 500 ملغ"}
            className="w-full bg-bg/60 border border-mint-line rounded-xl px-3.5 py-2.5 text-[14px] font-bold text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Scientific / Generic Name" : "الاسم العلمي / المادة الفعالة"}
          </label>
          <input
            type="text"
            value={scientificName}
            onChange={(e) => setScientificName(e.target.value)}
            placeholder="e.g., Paracetamol"
            className="w-full bg-bg/60 border border-mint-line rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Barcode (Primary / Box)" : "الباركود (للعلبة الكبرى)"}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="629..."
              className="flex-1 bg-bg/60 border border-mint-line rounded-xl px-3.5 py-2.5 text-[14px] font-mono text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={generateBarcode}
              className="px-3 py-2 rounded-xl bg-primary-pale text-primary font-bold text-[12px] hover:bg-primary hover:text-white transition-colors"
            >
              {isEn ? "Generate" : "توليد"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Category" : "التصنيف الدوائي"}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-bold text-ink outline-none focus:border-primary"
            >
              {categories.map((cat) => (
                <option key={cat.code} value={cat.label}>
                  {cat.label}
                </option>
              ))}
              {!categories.some((c) => c.label === category) && category ? (
                <option value={category}>{category}</option>
              ) : null}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Manufacturer" : "الشركة المصنعة"}
            </label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder={isEn ? "Company" : "اسم الشركة"}
              className="w-full bg-bg/60 border border-mint-line rounded-xl px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Pricing, Threshold & Expiry */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-primary-pale/50 p-4 rounded-2xl border border-mint-line">
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Box Sell Price *" : "سعر البيع (للعلبة) *"}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              if (priceError) setPriceError("");
            }}
            placeholder="0.00"
            aria-invalid={Boolean(priceError)}
            className={`w-full bg-white border rounded-xl px-3 py-2 text-[14px] font-mono font-bold text-ink outline-none focus:border-primary ${priceError ? "border-coral ring-2 ring-coral/20" : "border-mint-line"}`}
          />
          {priceError && (
            <p className="text-[11px] font-bold text-coral mt-1">{priceError}</p>
          )}
        </div>
        {showCosts && (
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">
              {isEn ? "Box Cost" : "سعر التكلفة (للعلبة)"}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[14px] font-mono font-bold text-ink outline-none focus:border-primary"
            />
          </div>
        )}
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Min Alert (Boxes)" : "الحد الأدنى (بالعلبة)"}
          </label>
          <input
            type="number"
            min="0"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[14px] font-mono font-bold text-ink outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-ink-soft mb-1">
            {isEn ? "Expiry (Month/Year)" : "تاريخ الانتهاء (شهر/سنة)"}
          </label>
          <input
            type="month"
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-mono font-bold text-ink outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Units Hierarchy */}
      <div className="bg-white border border-mint-line rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-[14px] font-black text-primary">
              {isEn ? "Multi-Unit Packaging & Barcodes" : "نظام الوحدات الفرعية والباركود"}
            </h4>
            <p className="text-[11px] text-ink-soft">
              {isEn ? "Sell by Box, Strip, or individual Pill cleanly" : "بيع بالعلبة أو الشريط أو الحبة بدقة حسابية كاملة"}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-ink">
            <input
              type="checkbox"
              checked={hasSub1}
              onChange={(e) => {
                setHasSub1(e.target.checked);
                if (!e.target.checked) setHasSub2(false);
                if (e.target.checked && !sub1PerBox) setSub1PerBox("2");
              }}
              className="w-4 h-4 accent-primary rounded"
            />
            {isEn ? "Contains Sub-Units (e.g., Strips)" : "يحتوي وحدات فرعية (شريط/ظرف)"}
          </label>
        </div>

        {hasSub1 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-mint-line">
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Unit 2 Name" : "اسم الوحدة 2"}</label>
              <input type="text" value={sub1Name} onChange={(e) => setSub1Name(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-bold" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Count / Box" : "العدد بالعلبة"}</label>
              <input type="number" min="2" value={sub1PerBox} onChange={(e) => setSub1PerBox(e.target.value)} placeholder="3" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Price (auto if empty)" : "سعر الوحدة 2"}</label>
              <input type="number" step="0.01" value={sub1Price} onChange={(e) => setSub1Price(e.target.value)} placeholder="Auto" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-mono" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Unit 2 Barcode" : "باركود الوحدة 2"}</label>
              <input type="text" value={sub1Barcode} onChange={(e) => setSub1Barcode(e.target.value)} placeholder="اختياري" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[12px] font-mono" />
            </div>

            <div className="col-span-2 md:col-span-4 flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[12px] font-bold text-ink">
                <input
                  type="checkbox"
                  checked={hasSub2}
                  onChange={(e) => {
                    setHasSub2(e.target.checked);
                    if (e.target.checked && !sub2PerSub1) setSub2PerSub1("10");
                  }}
                  className="w-4 h-4 accent-primary rounded"
                />
                {isEn ? "Contains 3rd Level (Individual Pills)" : "مستوى ثالث (حبة / قرص مفرد)"}
              </label>
            </div>

            {hasSub2 && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Unit 3 Name" : "اسم الوحدة 3"}</label>
                  <input type="text" value={sub2Name} onChange={(e) => setSub2Name(e.target.value)} className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Count / Strip" : "الحبات بالشريط"}</label>
                  <input type="number" min="2" value={sub2PerSub1} onChange={(e) => setSub2PerSub1(e.target.value)} placeholder="10" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Pill Price" : "سعر الحبة"}</label>
                  <input type="number" step="0.01" value={sub2Price} onChange={(e) => setSub2Price(e.target.value)} placeholder="Auto" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[13px] font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Pill Barcode" : "باركود الحبة"}</label>
                  <input type="text" value={sub2Barcode} onChange={(e) => setSub2Barcode(e.target.value)} placeholder="اختياري" className="w-full bg-bg/60 border border-mint-line rounded-lg px-2.5 py-2 text-[12px] font-mono" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Remainder-Safe Stock Quantities + Batch & Branch + Controlled */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-bg/50 p-4 rounded-2xl border border-mint-line">
        <div className={hasSub1 ? "md:col-span-2" : ""}>
          <label className="block text-[12px] font-bold text-primary mb-1.5">
            {isEn ? "Current Stock (Remainder-Safe)" : "الرصيد الحالي (يحافظ على الكسور المفردة)"}
          </label>
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[90px]">
              <span className="block text-[10px] font-bold text-ink-soft mb-0.5">{boxName}</span>
              <input
                type="number"
                min="0"
                step={hasSub1 ? "1" : "any"}
                value={qtyBoxes}
                onChange={(e) => setQtyBoxes(e.target.value)}
                className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 font-mono font-bold text-[14px]"
              />
            </div>
            {hasSub1 && hasSub2 && (
              <div className="flex-1 min-w-[90px]">
                <span className="block text-[10px] font-bold text-ink-soft mb-0.5">{sub1Name}</span>
                <input
                  type="number"
                  min="0"
                  value={qtyStrips}
                  onChange={(e) => setQtyStrips(e.target.value)}
                  className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 font-mono font-bold text-[14px]"
                />
              </div>
            )}
            {hasSub1 && (
              <div className="flex-1 min-w-[90px]">
                <span className="block text-[10px] font-bold text-ink-soft mb-0.5">{hasSub2 ? sub2Name : sub1Name}</span>
                <input
                  type="number"
                  min="0"
                  value={qtyPills}
                  onChange={(e) => setQtyPills(e.target.value)}
                  className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 font-mono font-bold text-[14px]"
                />
              </div>
            )}
          </div>
          <p className="text-[11px] font-bold text-primary mt-1.5">
            {isEn ? "Total Computed:" : "الإجمالي المحسوب:"} {formatQtyWithUnits({ qty: computedBaseQty, units: builtUnits }, builtUnits, language)} ({computedBaseQty})
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Batch Number" : "رقم التشغيلة"}</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="BATCH-01"
              className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-ink-soft mb-1">{isEn ? "Branch" : "الفرع"}</label>
            {isEdit ? (
              <div className="px-3 py-2 bg-white/70 border border-mint-line rounded-xl text-[13px] font-bold text-ink-soft">
                {resolveBranchName(branches, editingItem?.branch_id, editingItem?.branchName, language)}
              </div>
            ) : (
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={Boolean(userBranch && userBranch !== "all" && !["manager", "owner"].includes(String(userRole || "").toLowerCase()))}
                className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-bold text-ink"
              >
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                {!activeBranches.length && <option value="Main">{isEn ? "Main Branch" : "الفرع الرئيسي"}</option>}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Controlled Medication Toggle */}
      <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber bg-amber-pale/50 cursor-pointer">
        <input
          type="checkbox"
          checked={isControlled}
          onChange={(e) => setIsControlled(e.target.checked)}
          className="w-4 h-4 accent-coral rounded"
        />
        <div>
          <div className="text-[13px] font-black text-ink">
            {isEn ? "Controlled / Restricted Medication (Narcotic Log)" : "دواء مراقب / خاضع للرقابة (يُقيّد في دفتر السموم)"}
          </div>
          <div className="text-[11px] text-ink-soft">
            {isEn ? "Dispensing requires authorized staff permission on server & POS." : "يُمنع صرفه في نقطة البيع إلا للموظفين المخولين من السيرفر."}
          </div>
        </div>
      </label>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-mint-line">
        {mode === "modal" && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-bg text-ink-soft font-bold text-[14px] hover:bg-mint-line/60"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
        )}
        {!isEdit && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-2.5 rounded-xl bg-primary-pale text-primary font-black text-[14px] hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            {isEn ? "Save & Add Another" : "حفظ وإضافة صنف آخر"}
          </button>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSubmit(false)}
          className="px-6 py-2.5 rounded-xl bg-primary text-white font-black text-[14px] shadow-md hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {submitting
            ? (isEn ? "Saving..." : "جاري الحفظ...")
            : isEdit
              ? (isEn ? "Save Changes" : "حفظ التعديلات")
              : (isEn ? "Save Item" : "حفظ الصنف بالمخزون")}
        </button>
      </div>
    </div>
  );

  if (mode === "page") {
    return (
      <div className="bg-white rounded-[28px] p-6 md:p-8 shadow-sm border border-mint-line">
        {formBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-mint-line">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-mint-line">
          <h3 className="text-[20px] font-black text-primary">
            {isEdit
              ? (isEn ? `Edit Item: ${editingItem?.name}` : `تعديل صنف: ${editingItem?.name}`)
              : (isEn ? "Add New Medicine / Product" : "إضافة صنف دوائي جديد")}
          </h3>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg text-ink-soft font-bold hover:text-coral">
              ✕
            </button>
          )}
        </div>
        {formBody}
      </div>
    </div>
  );
}
