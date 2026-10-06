"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import { fetchApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useStore } from "@/store";

export default function AddItem() {
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

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
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/dashboard`,
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
  }, [user?.pharmacy_id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalQty = Number(formData.qty);
    let unitsArr: any = null;

    if (hasSubUnit) {
      if (!sub1Name || !sub1Count || !sub1Price) {
        toast.error(language === 'en' ? "Please complete sub-unit details (strips/ampoules)" : "يرجى إكمال بيانات الجزء الأصغر (الأشرطة/الأمبولات)");
        setLoading(false);
        return;
      }
      const s1Count = Number(sub1Count);
      if (hasSubUnit2) {
        if (!sub2Name || !sub2Count || !sub2Price) {
          toast.error(language === 'en' ? "Please complete smallest unit details (pills)" : "يرجى إكمال تفاصيل أصغر جزء (الحبات)");
          setLoading(false);
          return;
        }
        const s2Count = Number(sub2Count);
        const boxBaseCount = s1Count * s2Count;
        const stripBaseCount = s2Count;
        finalQty = Number(formData.qty) * boxBaseCount;
        unitsArr = [
          {
            name: "علبة",
            count: boxBaseCount,
            price: Number(formData.price_sell),
          },
          { name: sub1Name, count: stripBaseCount, price: Number(sub1Price) },
          { name: sub2Name, count: 1, price: Number(sub2Price) },
        ];
      } else {
        finalQty = Number(formData.qty) * s1Count;
        unitsArr = [
          { name: "علبة", count: s1Count, price: Number(formData.price_sell) },
          { name: sub1Name, count: 1, price: Number(sub1Price) },
        ];
      }
    }

    const payload = {
      ...formData,
      qty: finalQty,
      units: unitsArr ? JSON.stringify(unitsArr) : null,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLoading(false);
      toast.success(language === 'en' ? "Item added successfully!" : "تمت إضافة الصنف بنجاح!");
      router.push("/inventory");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : (language === 'en' ? "Error adding item" : "حدث خطأ أثناء الإضافة"));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AppBar title={language === 'en' ? 'Add New Item' : 'إضافة صنف جديد'} showLogo={false} />

      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Medicine Name (Trade)' : 'اسم الدواء (التجاري)'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: Augmentin 1g' : 'مثال: أوجمنتين ١g'}
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Scientific Name' : 'الاسم العلمي'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                name="scientificName"
                value={formData.scientificName}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Example: Amoxicillin' : 'مثال: Amoxicillin'}
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
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="GSK"
                className="w-full bg-transparent border-none outline-none text-[16px] text-ink placeholder:text-[#A6B8AE]"
                dir="auto"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Therapeutic Category' : 'الفئة العلاجية'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder={language === 'en' ? 'Antibiotic' : 'مضاد حيوي'}
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
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
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
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Selling Price (₪)' : 'سعر البيع (₪)'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
              <input
                required
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
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold text-ink-soft mb-2">
              {language === 'en' ? 'Initial Quantity' : 'الكمية الابتدائية'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
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
          </div>
          {user?.role === "صيدلي" ? null : (
            <div className="flex-1">
              <label className="block text-[14px] font-semibold text-ink-soft mb-2">
                {language === 'en' ? 'Target Branch' : 'الفرع المضاف إليه'}
              </label>
              <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
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
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
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
              {language === 'en' ? 'Expiry Date' : 'تاريخ الصلاحية'}
            </label>
            <div className="bg-card border-2 border-mint-line rounded-xl p-3.5">
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
                if (!e.target.checked) setHasSubUnit2(false);
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
                    className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px]"
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
                    {language === 'en' ? `How many ${sub1Name === 'شريط' ? (language === 'en' ? 'Strips' : 'شريط') : sub1Name} in the box?` : `كم ${sub1Name} في العلبة؟`}
                  </label>
                  <input
                    type="number"
                    value={sub1Count}
                    onChange={(e) => setSub1Count(e.target.value)}
                    placeholder={language === 'en' ? 'Example: 3' : 'مثال: 3'}
                    className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] font-mono text-start"
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {language === 'en' ? `Price of ${sub1Name === 'شريط' ? (language === 'en' ? 'Strip' : 'شريط') : sub1Name}` : `سعر ${sub1Name}`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sub1Price}
                    onChange={(e) => setSub1Price(e.target.value)}
                    placeholder={language === 'en' ? 'Example: 12.00' : 'مثال: 12.00'}
                    className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] font-mono text-start"
                    dir="ltr"
                  />
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
                      onChange={(e) => setHasSubUnit2(e.target.checked)}
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
                        className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px]"
                      >
                        <option value="حبة">{language === 'en' ? 'Pill' : 'حبة'}</option>
                        <option value="ملي">{language === 'en' ? 'ml' : 'ملي'}</option>
                        <option value="نقطة">{language === 'en' ? 'Drop' : 'نقطة'}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold text-ink-soft mb-1">
                        {language === 'en' ? `How many ${sub2Name === 'حبة' ? (language === 'en' ? 'Pills' : 'حبة') : sub2Name} in ${sub1Name === 'شريط' ? (language === 'en' ? 'Strip' : 'شريط') : sub1Name}?` : `كم ${sub2Name} في الـ ${sub1Name}؟`}
                      </label>
                      <input
                        type="number"
                        value={sub2Count}
                        onChange={(e) => setSub2Count(e.target.value)}
                        placeholder={language === 'en' ? 'Example: 10' : 'مثال: 10'}
                        className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] font-mono text-start"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[12px] font-bold text-ink-soft mb-1">
                        {language === 'en' ? `Price of ${sub2Name === 'حبة' ? (language === 'en' ? 'Pill' : 'حبة') : sub2Name}` : `سعر ${sub2Name}`}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={sub2Price}
                        onChange={(e) => setSub2Price(e.target.value)}
                        placeholder={language === 'en' ? 'Example: 1.50' : 'مثال: 1.50'}
                        className="w-full bg-white border border-mint-line rounded-lg p-2 text-[14px] font-mono text-start"
                        dir="ltr"
                      />
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
    </div>
  );
}
