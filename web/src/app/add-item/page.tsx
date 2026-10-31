"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import MasterCatalogModal, { MasterDrug } from "@/components/MasterCatalogModal";

export default function AddItem() {
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const handleSelectFromCatalog = (drug: MasterDrug) => {
    setFormData((prev) => ({
      ...prev,
      name: drug.name,
      scientificName: drug.scientificName || "",
      category: drug.category || "",
      batch_number: prev.batch_number || `B-${Math.floor(1000 + Math.random() * 9000)}`,
      isControlled: Boolean(drug.isControlled),
    }));

    if (drug.hasSubUnit) {
      setHasSubUnit(true);
      setSub1Name(drug.sub1Name || "شريط");
      setSub1Count(String(drug.sub1Count || ""));
      if (drug.hasSubUnit2) {
        setHasSubUnit2(true);
        setSub2Name(drug.sub2Name || "حبة");
        setSub2Count(String(drug.sub2Count || ""));
      }
    }

    toast.success(language === 'en' ? 'Drug details imported!' : `تم استيراد بيانات (${drug.name}) بنجاح!`);
  };

  const [formData, setFormData] = useState({
    name: "",
    scientificName: "",
    manufacturer: "",
    category: "",
    price_buy: "",
    price_sell: "",
    qty: "",
    reorder_level: "",
    batch_number: "",
    expiry_date: "",
    branch_id: "",
    isControlled: false,
  });

  const [hasSubUnit, setHasSubUnit] = useState(false);
  const [sub1Name, setSub1Name] = useState("شريط");
  const [sub1Count, setSub1Count] = useState("");
  const [sub1Price, setSub1Price] = useState("");

  const [hasSubUnit2, setHasSubUnit2] = useState(false);
  const [sub2Name, setSub2Name] = useState("حبة");
  const [sub2Count, setSub2Count] = useState("");
  const [sub2Price, setSub2Price] = useState("");

  // Auto-calculate sub-unit prices
  useEffect(() => {
    const mainPrice = parseFloat(formData.price_sell) || 0;
    const s1Count = parseFloat(sub1Count) || 0;
    const s2Count = parseFloat(sub2Count) || 0;

    if (mainPrice > 0) {
      if (s1Count > 0) {
        setSub1Price(parseFloat((mainPrice / s1Count).toFixed(2)).toString());
        if (hasSubUnit2 && s2Count > 0) {
          setSub2Price(parseFloat((mainPrice / (s1Count * s2Count)).toFixed(2)).toString());
        }
      }
    }
  }, [formData.price_sell, sub1Count, sub2Count, hasSubUnit2]);

  useEffect(() => {
    async function fetchBranches() {
      if (!user?.pharmacy_id) return;
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard`,
        );
        const data = await res.json();
        if (data.success && data.branches?.length > 0) {
          setBranches(data.branches);
          let defaultBranch = data.branches[0].id;
          if (user?.branch && user.branch !== "الرئيسي") {
            const ub = data.branches.find((b: any) => b.name === user.branch);
            if (ub) defaultBranch = ub.id;
          }
          setFormData((prev) => ({ ...prev, branch_id: defaultBranch }));
        }
      } catch (err) {
      }
    }
    fetchBranches();
  }, [user?.pharmacy_id, user?.branch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSub1CountChange = (val: string) => {
    setSub1Count(val);
    if (errors.sub1Count) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.sub1Count;
        return updated;
      });
    }
  };

  const handleSub1PriceChange = (val: string) => {
    setSub1Price(val);
    if (errors.sub1Price) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.sub1Price;
        return updated;
      });
    }
  };

  const handleSub2CountChange = (val: string) => {
    setSub2Count(val);
    if (errors.sub2Count) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.sub2Count;
        return updated;
      });
    }
  };

  const handleSub2PriceChange = (val: string) => {
    setSub2Price(val);
    if (errors.sub2Price) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.sub2Price;
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ─── VALIDATION ────────────────────────────────────────────────────────────
    const newErrors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = language === 'en' ? 'Medicine trade name is required' : 'اسم الدواء (التجاري) مطلوب';
    }

    const priceSell = parseFloat(formData.price_sell);
    if (!formData.price_sell || isNaN(priceSell) || priceSell <= 0) {
      newErrors.price_sell = language === 'en' ? 'Valid selling price (> 0) is required' : 'يرجى إدخال سعر بيع صحيح أكبر من صفر';
    }

    if (formData.price_buy) {
      const priceBuy = parseFloat(formData.price_buy);
      if (isNaN(priceBuy) || priceBuy < 0) {
        newErrors.price_buy = language === 'en' ? 'Purchase price cannot be negative' : 'سعر الشراء لا يمكن أن يكون بالسالب';
      }
    }

    if (formData.qty) {
      const qtyNum = parseFloat(formData.qty);
      if (isNaN(qtyNum) || qtyNum < 0) {
        newErrors.qty = language === 'en' ? 'Initial quantity cannot be negative' : 'الكمية الابتدائية لا يمكن أن تكون بالسالب';
      }
    }

    let finalQty = Number(formData.qty) || 0;
    let unitsArr: any = null;

    if (hasSubUnit) {
      const s1Count = Number(sub1Count);
      const s1Price = Number(sub1Price);

      if (!sub1Count || isNaN(s1Count) || s1Count <= 0) {
        newErrors.sub1Count = language === 'en' ? `Please enter count of ${sub1Name} in the box` : `يرجى إدخال عدد الـ ${sub1Name} في العلبة`;
      }
      if (!sub1Price || isNaN(s1Price) || s1Price <= 0) {
        newErrors.sub1Price = language === 'en' ? `Please enter price for ${sub1Name}` : `يرجى إدخال سعر الـ ${sub1Name}`;
      }

      if (hasSubUnit2) {
        const s2Count = Number(sub2Count);
        const s2Price = Number(sub2Price);

        if (!sub2Count || isNaN(s2Count) || s2Count <= 0) {
          newErrors.sub2Count = language === 'en' ? `Please enter count of ${sub2Name} in ${sub1Name}` : `يرجى إدخال عدد الـ ${sub2Name} في الـ ${sub1Name}`;
        }
        if (!sub2Price || isNaN(s2Price) || s2Price <= 0) {
          newErrors.sub2Price = language === 'en' ? `Please enter price for ${sub2Name}` : `يرجى إدخال سعر الـ ${sub2Name}`;
        }

        if (s1Count > 0 && s2Count > 0) {
          const boxBaseCount = s1Count * s2Count;
          const stripBaseCount = s2Count;
          finalQty = (Number(formData.qty) || 0) * boxBaseCount;
          unitsArr = [
            {
              name: "علبة",
              count: boxBaseCount,
              price: Number(formData.price_sell),
            },
            { name: sub1Name, count: stripBaseCount, price: s1Price },
            { name: sub2Name, count: 1, price: s2Price },
          ];
        }
      } else if (s1Count > 0) {
        finalQty = (Number(formData.qty) || 0) * s1Count;
        unitsArr = [
          { name: "علبة", count: s1Count, price: Number(formData.price_sell) },
          { name: sub1Name, count: 1, price: s1Price },
        ];
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(language === 'en' ? 'Please fix the fields highlighted in red' : 'يرجى تصحيح الحقول المحددة باللون الأحمر');
      return;
    }

    setLoading(true);
    setErrors({});

    const itemId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const eventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const payload = {
      ...formData,
      id: itemId,
      eventId: eventId,
      qty: finalQty,
      units: unitsArr ? JSON.stringify(unitsArr) : null,
    };

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/inventory`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Idempotency-Key": eventId,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || (language === 'en' ? "Error adding item" : "حدث خطأ أثناء الإضافة"));
      }

      setLoading(false);
      toast.success(language === 'en' ? "Item added successfully!" : "تمت إضافة الصنف بنجاح!");
      router.push("/inventory");
    } catch (error: any) {
      setLoading(false);
      const rawMsg = error instanceof Error ? error.message : String(error);
      if (rawMsg.includes("INVENTORY_NAME_CONFLICT") || rawMsg.includes("يوجد منتج بنفس هذا الاسم")) {
        setErrors((prev) => ({
          ...prev,
          name: language === 'en' ? 'A medicine with this name already exists in this branch' : 'عذراً، يوجد صنف مسجل بنفس هذا الاسم بالفعل في هذا الفرع',
        }));
        toast.error(language === 'en' ? 'Medicine with this name already exists' : 'عذراً، يوجد صنف مسجل بنفس هذا الاسم بالفعل');
      } else {
        toast.error(rawMsg || (language === 'en' ? "Error adding item" : "حدث خطأ أثناء الإضافة"));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AppBar title={language === 'en' ? 'Add New Item' : 'إضافة صنف جديد'} showLogo={false} />

      {/* Quick Catalog Import Banner */}
      <div
        onClick={() => setIsCatalogOpen(true)}
        className="mt-4 bg-gradient-to-r from-primary/10 via-teal/5 to-card border border-primary/25 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:border-primary/60 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚡</span>
          <div>
            <h4 className="font-bold text-xs text-ink">
              {language === 'en' ? 'Quick Auto-fill from Drug Directory' : 'تعبئة تلقائية سريعة من دليل الأدوية الافتراضي'}
            </h4>
            <p className="text-[11px] text-ink-soft">
              {language === 'en'
                ? 'Select any certified medicine to auto-complete name, category, and units'
                : 'اختر أي صنف معتمد لتعبئة الاسم، التصنيف، والوحدات تلقائياً'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCatalogOpen(true);
          }}
          className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-teal transition-colors shrink-0 shadow-sm"
        >
          {language === 'en' ? 'Browse Directory' : 'تصفح الدليل'}
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Medicine Name (Trade) *' : 'اسم الدواء (التجاري) *'}
            </label>
            <div className={`bg-card border-2 rounded-xl p-3.5 transition-all ${
              errors.name 
                ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                : 'border-mint-line focus-within:border-teal'
            }`}>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: Augmentin 1g' : 'مثال: أوجمنتين 1 جم'}
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-[12px] font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.name}</span>
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Scientific Name' : 'الاسم العلمي'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
              <input
                name="scientificName"
                value={formData.scientificName}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: Amoxicillin' : 'مثال: أموكسيسيلين / باراسيتامول'}
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Manufacturer' : 'الشركة المصنّعة'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
              <input
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: GSK / Pfizer' : 'مثال: فايزر / الحكمة / دار الدواء'}
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Therapeutic Category' : 'الفئة العلاجية'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
              <input
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: Antibiotic' : 'مثال: مضاد حيوي / مسكن'}
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Purchase Price (₪)' : 'سعر الشراء (₪)'}
            </label>
            <div className={`bg-card border-2 rounded-xl p-3.5 transition-all ${
              errors.price_buy 
                ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                : 'border-mint-line focus-within:border-teal'
            }`}>
              <input
                type="number"
                step="0.01"
                name="price_buy"
                value={formData.price_buy}
                onChange={handleChange}
                placeholder="28.00"
                className="w-full bg-transparent border-none outline-none text-[16px] font-mono text-ink placeholder:text-[#A6B8AE]"
                style={{ direction: "ltr", textAlign: "left" }}
              />
            </div>
            {errors.price_buy && (
              <p className="text-red-500 text-[12px] font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.price_buy}</span>
              </p>
            )}
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Selling Price (₪) *' : 'سعر البيع (₪) *'}
            </label>
            <div className={`bg-card border-2 rounded-xl p-3.5 transition-all ${
              errors.price_sell 
                ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                : 'border-mint-line focus-within:border-teal'
            }`}>
              <input
                type="number"
                step="0.01"
                name="price_sell"
                value={formData.price_sell}
                onChange={handleChange}
                placeholder="38.00"
                className="w-full bg-transparent border-none outline-none text-[16px] font-mono text-ink placeholder:text-[#A6B8AE]"
                style={{ direction: "ltr", textAlign: "left" }}
              />
            </div>
            {errors.price_sell && (
              <p className="text-red-500 text-[12px] font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.price_sell}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Initial Quantity' : 'الكمية الابتدائية'}
            </label>
            <div className={`bg-card border-2 rounded-xl p-3.5 transition-all ${
              errors.qty 
                ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                : 'border-mint-line focus-within:border-teal'
            }`}>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                placeholder="24"
                className="w-full bg-transparent border-none outline-none text-[16px] font-mono text-ink placeholder:text-[#A6B8AE]"
                style={{ direction: "ltr", textAlign: "left" }}
              />
            </div>
            {errors.qty && (
              <p className="text-red-500 text-[12px] font-bold mt-1.5 flex items-center gap-1">
                <span>⚠️</span>
                <span>{errors.qty}</span>
              </p>
            )}
          </div>
          {user?.role === "صيدلي" ? null : (
            <div className="flex-1">
              <label className="block text-[14px] font-semibold text-ink-soft mb-2">
                {language === 'en' ? 'Target Branch' : 'الفرع المضاف إليه'}
              </label>
              <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none outline-none text-[16px] text-ink"
                >
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Batch Number' : 'رقم الدفعة'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
              <input
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                placeholder="A2201"
                className="w-full bg-transparent border-none outline-none text-[16px] font-mono text-ink placeholder:text-[#A6B8AE]"
                style={{ direction: "ltr", textAlign: "left" }}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Expiry Date (Optional)' : 'تاريخ الصلاحية (اختياري)'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5 focus-within:border-teal transition-all">
              <input
                type="month"
                name="expiry_date"
                value={formData.expiry_date}
                onChange={handleChange}
                className="w-full bg-transparent border-none outline-none text-[16px] font-mono text-ink placeholder:text-[#A6B8AE]"
                style={{ direction: "ltr", textAlign: "left" }}
              />
            </div>
          </div>
        </div>

        {/* Controlled Medicine Section */}
        <div className="bg-card border-2 border-mint-line rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[16px] font-bold text-teal block">
                {language === 'en' ? 'Controlled Medicine' : 'دواء خاضع للرقابة (مراقبة)'}
              </label>
              <span className="text-xs text-ink-soft">{language === 'en' ? 'Selling this medicine requires admin privileges' : 'يمنع بيع هذا الدواء إلا بصلاحيات الإدارة'}</span>
            </div>
            <input
              type="checkbox"
              checked={formData.isControlled}
              onChange={(e) => setFormData(prev => ({ ...prev, isControlled: e.target.checked }))}
              className="w-6 h-6 accent-teal cursor-pointer"
            />
          </div>
        </div>

        {/* Units Section */}
        <div className="bg-card border-2 border-mint-line rounded-xl p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-[16px] font-bold text-teal">
              {language === 'en' ? 'Sold in parts (Strips / Pills)?' : 'يُباع بالأجزاء (أشرطة / حبات)؟'}
            </label>
            <input
              type="checkbox"
              checked={hasSubUnit}
              onChange={(e) => {
                setHasSubUnit(e.target.checked);
                if (!e.target.checked) {
                  setHasSubUnit2(false);
                  setErrors((prev) => {
                    const updated = { ...prev };
                    delete updated.sub1Count;
                    delete updated.sub1Price;
                    delete updated.sub2Count;
                    delete updated.sub2Price;
                    return updated;
                  });
                }
              }}
              className="w-5 h-5 accent-teal cursor-pointer"
            />
          </div>

          {hasSubUnit && (
            <div className="bg-teal-pale/30 p-4 rounded-xl border border-teal-pale space-y-4">
              <h3 className="font-bold text-[14px] text-teal">
                {language === 'en' ? 'First Part (e.g. Strip)' : 'الجزء الأول (مثال: شريط)'}
              </h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {language === 'en' ? 'Part Name' : 'اسم الجزء'}
                  </label>
                  <select
                    value={sub1Name}
                    onChange={(e) => setSub1Name(e.target.value)}
                    className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] outline-none focus:border-teal"
                  >
                    <option value="شريط">{language === 'en' ? 'Strip' : 'شريط'}</option>
                    <option value="حبة">{language === 'en' ? 'Pill / Capsule' : 'حبة / كبسولة'}</option>
                    <option value="أمبولة">{language === 'en' ? 'Ampoule' : 'أمبولة'}</option>
                    <option value="ظرف">{language === 'en' ? 'Sachet' : 'ظرف (مغلف)'}</option>
                    <option value="قطرة">{language === 'en' ? 'Drop' : 'قطرة'}</option>
                    <option value="عبوة">{language === 'en' ? 'Bottle/Package' : 'عبوة'}</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {language === 'en' ? `How many ${sub1Name === 'شريط' ? (language === 'en' ? 'Strips' : 'شريط') : sub1Name} in the box? *` : `كم ${sub1Name} في العلبة؟ *`}
                  </label>
                  <input
                    type="number"
                    value={sub1Count}
                    onChange={(e) => handleSub1CountChange(e.target.value)}
                    placeholder={language === 'en' ? 'Example: 3' : 'مثال: 3'}
                    className={`w-full bg-white border rounded-lg p-2 text-[14px] font-mono text-start outline-none transition-all ${
                      errors.sub1Count 
                        ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                        : 'border-mint-line focus:border-teal'
                    }`}
                    dir="ltr"
                  />
                  {errors.sub1Count && (
                    <p className="text-red-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{errors.sub1Count}</span>
                    </p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {language === 'en' ? `Price of ${sub1Name === 'شريط' ? (language === 'en' ? 'Strip' : 'شريط') : sub1Name} *` : `سعر ${sub1Name} *`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sub1Price}
                    onChange={(e) => handleSub1PriceChange(e.target.value)}
                    placeholder={language === 'en' ? 'Example: 12.00' : 'مثال: 12.00'}
                    className={`w-full bg-white border rounded-lg p-2 text-[14px] font-mono text-start outline-none transition-all ${
                      errors.sub1Price 
                        ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                        : 'border-mint-line focus:border-teal'
                    }`}
                    dir="ltr"
                  />
                  {errors.sub1Price && (
                    <p className="text-red-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{errors.sub1Price}</span>
                    </p>
                  )}
                </div>
              </div>

              {sub1Name !== 'حبة' && sub1Name !== 'أمبولة' && sub1Name !== 'قطرة' && (
                <>
                  <div className="h-px bg-mint-line my-4"></div>

                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[14px] font-bold text-teal">
                      {language === 'en' ? `Is ${sub1Name === 'شريط' ? (language === 'en' ? 'Strip' : 'شريط') : sub1Name} sold in parts? (e.g. pill)` : `هل يباع الـ ${sub1Name} مجزأ؟ (مثال: حبة)`}
                    </label>
                    <input
                      type="checkbox"
                      checked={hasSubUnit2}
                      onChange={(e) => {
                        setHasSubUnit2(e.target.checked);
                        if (!e.target.checked) {
                          setErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.sub2Count;
                            delete updated.sub2Price;
                            return updated;
                          });
                        }
                      }}
                      className="w-5 h-5 accent-teal cursor-pointer"
                    />
                  </div>
                </>
              )}

              {sub1Name !== 'حبة' && sub1Name !== 'أمبولة' && sub1Name !== 'قطرة' && hasSubUnit2 && (
                <div className="bg-white/50 p-4 rounded-xl border border-mint-line space-y-4">
                  <h3 className="font-bold text-[14px] text-teal">
                    {language === 'en' ? 'Smallest Part (e.g. Pill)' : 'أصغر جزء (مثال: حبة)'}
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold text-ink-soft mb-1">
                        {language === 'en' ? 'Smallest Part Name' : 'اسم الجزء الأصغر'}
                      </label>
                      <select
                        value={sub2Name}
                        onChange={(e) => setSub2Name(e.target.value)}
                        className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] outline-none focus:border-teal"
                      >
                        <option value="حبة">{language === 'en' ? 'Pill' : 'حبة'}</option>
                        <option value="ملي">{language === 'en' ? 'ml' : 'ملي'}</option>
                        <option value="نقطة">{language === 'en' ? 'Drop' : 'نقطة'}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold text-ink-soft mb-1">
                        {language === 'en' ? `How many ${sub2Name === 'حبة' ? (language === 'en' ? 'Pills' : 'حبة') : sub2Name} in ${sub1Name === 'شريط' ? (language === 'en' ? 'Strip' : 'شريط') : sub1Name}? *` : `كم ${sub2Name} في الـ ${sub1Name}؟ *`}
                      </label>
                      <input
                        type="number"
                        value={sub2Count}
                        onChange={(e) => handleSub2CountChange(e.target.value)}
                        placeholder={language === 'en' ? 'Example: 10' : 'مثال: 10'}
                        className={`w-full bg-white border rounded-lg p-2 text-[14px] font-mono text-start outline-none transition-all ${
                          errors.sub2Count 
                            ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                            : 'border-mint-line focus:border-teal'
                        }`}
                        dir="ltr"
                      />
                      {errors.sub2Count && (
                        <p className="text-red-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{errors.sub2Count}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold text-ink-soft mb-1">
                        {language === 'en' ? `Price of ${sub2Name === 'حبة' ? (language === 'en' ? 'Pill' : 'حبة') : sub2Name} *` : `سعر ${sub2Name} *`}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sub2Price}
                        onChange={(e) => handleSub2PriceChange(e.target.value)}
                        placeholder={language === 'en' ? 'Example: 1.50' : 'مثال: 1.50'}
                        className={`w-full bg-white border rounded-lg p-2 text-[14px] font-mono text-start outline-none transition-all ${
                          errors.sub2Price 
                            ? 'border-red-500 bg-red-500/5 ring-2 ring-red-500/20' 
                            : 'border-mint-line focus:border-teal'
                        }`}
                        dir="ltr"
                      />
                      {errors.sub2Price && (
                        <p className="text-red-500 text-[11px] font-bold mt-1 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>{errors.sub2Price}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full bg-primary text-white border-none py-[16px] rounded-xl font-sans font-bold text-[18px] mt-8 cursor-pointer shadow-sm block text-center transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? (language === 'en' ? 'Saving...' : 'جاري الحفظ...') : (language === 'en' ? 'Save Item' : 'حفظ الصنف')}
        </button>
      </form>

      {/* Master Catalog Selection Modal */}
      <MasterCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectDrug={handleSelectFromCatalog}
      />
    </div>
  );
}
