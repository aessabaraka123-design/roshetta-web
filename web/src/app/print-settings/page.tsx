"use client";

import AppBar from "@/components/AppBar";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import RoshettaLogo from "@/components/RoshettaLogo";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PrintSettings() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const { data: pharmacyData, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}`
      : null,
    fetcher,
  );

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    receiptFooter: "",
    printerSize: "80mm",
    showLogo: true,
  });

  useEffect(() => {
    if (pharmacyData?.pharmacy) {
      setFormData({
        name: pharmacyData.pharmacy.name || "",
        phone: pharmacyData.pharmacy.phone || "",
        receiptFooter:
          pharmacyData.pharmacy.receiptFooter ||
          (language === "en" ? "We wish you continued health and wellness" : "نتمنى لكم دوام الصحة والعافية"),
        printerSize: pharmacyData.pharmacy.printerSize || "80mm",
        showLogo:
          pharmacyData.pharmacy.showLogo !== undefined
            ? !!pharmacyData.pharmacy.showLogo
            : true,
      });
    }
  }, [pharmacyData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(language === "en" ? "Settings saved successfully" : "تم حفظ الإعدادات بنجاح");
        mutate();
        // Update user state optionally if name changed, but it might not be strictly necessary for now.
      } else {
        toast.error(language === "en" ? "Error saving settings" : "خطأ في الحفظ");
      }
    } catch (err) {
      toast.error(language === "en" ? "Cannot connect to server" : "لا يمكن الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleString(language === "en" ? "en-US" : language === "en" ? "en-US" : "ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  });

  if (!user) return null;

  return (
    <div className="w-full pb-10">
      <AppBar title={language === "en" ? "Customize Invoice & Printing" : "تخصيص الفاتورة والطباعة"} showLogo={false} />

      <div className="mt-6 flex flex-col md:flex-row gap-8 items-start">
        {/* Settings Form */}
        <div className="w-full md:w-1/2 bg-white rounded-3xl p-6 shadow-sm border border-mint-line">
          <h2 className="text-[20px] font-bold text-primary mb-6 border-b border-mint-line pb-4">
            {language === "en" ? "Print Settings" : "إعدادات الطباعة"}
          </h2>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                {language === "en" ? "Pharmacy Name for Printing" : "اسم الصيدلية للطباعة"}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[15px] outline-none focus:border-primary"
                placeholder={language === "en" ? "Official Pharmacy Name" : "اسم الصيدلية الرسمي"}
              />
            </div>

            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                {language === "en" ? "Phone Number Below Invoice (Optional)" : "رقم الهاتف أسفل الفاتورة (اختياري)"}
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[15px] outline-none focus:border-primary text-start"
                dir="ltr"
                placeholder="059xxxxxxx"
              />
            </div>

            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                {language === "en" ? "Welcome Message / Footer" : "رسالة الترحيب / التذييل"}
              </label>
              <textarea
                value={formData.receiptFooter}
                onChange={(e) =>
                  setFormData({ ...formData, receiptFooter: e.target.value })
                }
                className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[15px] outline-none focus:border-primary min-h-[100px]"
                placeholder={language === "en" ? "Write a thank you message to your customers..." : "اكتب رسالة شكر لعملائك..."}
              />
            </div>

            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                {language === "en" ? "Thermal Printer Size" : "مقاس الطابعة الحرارية"}
              </label>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer bg-bg p-3 border border-mint-line rounded-xl flex-1 justify-center">
                  <input
                    type="radio"
                    name="printerSize"
                    value="80mm"
                    checked={formData.printerSize === "80mm"}
                    onChange={(e) =>
                      setFormData({ ...formData, printerSize: e.target.value })
                    }
                    className="accent-primary"
                  />
                  <span className="font-bold">{language === "en" ? "80mm Printer" : "طابعة 80mm"}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-bg p-3 border border-mint-line rounded-xl flex-1 justify-center">
                  <input
                    type="radio"
                    name="printerSize"
                    value="58mm"
                    checked={formData.printerSize === "58mm"}
                    onChange={(e) =>
                      setFormData({ ...formData, printerSize: e.target.value })
                    }
                    className="accent-primary"
                  />
                  <span className="font-bold">{language === "en" ? "58mm Printer" : "طابعة 58mm"}</span>
                </label>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-4 bg-bg rounded-xl border border-mint-line">
              <input
                type="checkbox"
                checked={formData.showLogo}
                onChange={(e) =>
                  setFormData({ ...formData, showLogo: e.target.checked })
                }
                className="w-5 h-5 accent-primary rounded"
              />
              <span className="font-bold text-[14px] text-ink">
                {language === "en" ? "Show System Logo at Top of Invoice" : "عرض شعار النظام في أعلى الفاتورة"}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all disabled:opacity-50"
            >
              {loading ? (language === "en" ? "Saving..." : "جاري الحفظ...") : (language === "en" ? "Save Settings" : "حفظ الإعدادات")}
            </button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="w-full md:w-1/2 flex justify-center sticky top-20">
          <div
            className="bg-[#FDFAED] border border-mint-line shadow-[0_10px_40px_-15px_rgba(34,62,86,0.15)] p-5 w-full font-mono text-ink transition-all duration-300 relative"
            style={{
              maxWidth: formData.printerSize === "80mm" ? "320px" : "230px",
            }}
            dir={language === "en" ? "ltr" : "rtl"}
          >
            <div
              className="absolute top-[-4px] left-0 right-0 h-[4px] bg-repeat-x"
              style={{
                backgroundImage:
                  "linear-gradient(-45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px), linear-gradient(45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px)",
                backgroundSize: "8px 8px",
              }}
            ></div>

            {formData.showLogo && (
              <div className="flex justify-center mt-2 mb-3">
                <RoshettaLogo className="w-10 h-10" />
              </div>
            )}

            <div className="text-center mb-1">
              <h1 className="text-[18px] font-bold mb-1 text-ink">
                {formData.name || (language === "en" ? "Pharmacy Name" : "اسم الصيدلية")}
              </h1>
              <p className="text-[12px] text-ink-soft opacity-70">{language === "en" ? "Branch Address (Appears Automatically)" : "عنوان الفرع (يظهر تلقائياً)"}</p>
              {formData.phone && (
                <p className="text-[12px] text-ink-soft">{formData.phone}</p>
              )}
            </div>

            <div className="text-center text-[#94A3B8] tracking-widest my-3">
              - - - - - - - - - - - - - - - - - - - - - -
            </div>

            <div className="space-y-1.5 mb-1 px-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-ink-soft font-bold">{language === "en" ? "Invoice No:" : "رقم الفاتورة:"}</span>
                <span className="text-ink font-bold font-mono text-[11px]">
                  INV2G4D-000019
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-ink-soft font-bold">{language === "en" ? "Date:" : "التاريخ:"}</span>
                <span className="text-ink font-bold font-mono text-[11px]">
                  {currentDate}
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-ink-soft font-bold">{language === "en" ? "Employee:" : "الموظف:"}</span>
                <span className="text-ink font-bold">{language === "en" ? "Employee Name" : "اسم الموظف"}</span>
              </div>
            </div>

            <div className="text-center text-[#94A3B8] tracking-widest my-3">
              - - - - - - - - - - - - - - - - - - - - - -
            </div>

            <div className="flex text-[12px] font-bold text-ink-soft mb-3 px-1">
              <div className="flex-[2] text-start">{language === "en" ? "Item" : "الصنف"}</div>
              <div className="w-[40px] text-center">{language === "en" ? "Qty" : "الكمية"}</div>
              <div className="flex-1 text-start">{language === "en" ? "Total" : "المجموع"}</div>
            </div>

            <div className="space-y-3 mb-1 px-1">
              <div className="flex text-[12px] text-ink items-center">
                <div className="flex-[2] text-start font-bold truncate pr-1">
                  {language === "en" ? "Panadol Advance" : "بنادول ادفانس"}
                </div>
                <div className="w-[40px] text-center font-mono">1</div>
                <div className="flex-1 text-start font-mono font-bold">
                  15.00
                </div>
              </div>
              <div className="flex text-[12px] text-ink items-center">
                <div className="flex-[2] text-start font-bold truncate pr-1">
                  {language === "en" ? "Augmentin 1g" : "أوجمنتين 1 جم"}
                </div>
                <div className="w-[40px] text-center font-mono">1</div>
                <div className="flex-1 text-start font-mono font-bold">
                  45.00
                </div>
              </div>
            </div>

            <div className="text-center text-[#94A3B8] tracking-widest my-3">
              - - - - - - - - - - - - - - - - - - - - - -
            </div>

            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[14px] font-bold text-ink">
                {language === "en" ? "Grand Total" : "الإجمالي الكلي"}
              </span>
              <span className="text-[18px] font-black text-ink">
                60.00 <span className="text-[14px]">₪</span>
              </span>
            </div>

            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[12px] font-bold text-ink-soft">
                {language === "en" ? "Payment Method" : "طريقة الدفع"}
              </span>
              <span className="text-[12px] font-bold text-ink font-mono">
                cash
              </span>
            </div>

            <div className="text-center text-[#94A3B8] tracking-widest my-3">
              - - - - - - - - - - - - - - - - - - - - - -
            </div>

            <div className="mt-2 text-[12px] text-center space-y-1">
              <p className="font-bold">
                {formData.receiptFooter || (language === "en" ? "We wish you continued health and wellness" : "نتمنى لكم دوام الصحة والعافية")}
              </p>
              {formData.phone && (
                <p className="font-mono text-ink-soft text-[13px]" dir="ltr">
                  ☎ {formData.phone}
                </p>
              )}
            </div>

            <div className="mt-5 flex justify-center opacity-80">
              <div className="flex h-[30px] items-center">
                {[
                  4, 2, 2, 4, 2, 6, 2, 2, 4, 2, 2, 8, 2, 4, 4, 2, 6, 4, 2, 2, 8,
                  4, 2, 2, 6, 2, 2, 4,
                ].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      width: w,
                      height: "100%",
                      backgroundColor: "#475569",
                      marginRight: 2,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center justify-center gap-1 opacity-50 grayscale">
              <RoshettaLogo className="w-4 h-4" />
              <span className="text-[9px] font-bold text-[#475569]">
                {language === "en" ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}
              </span>
            </div>

            <div
              className="absolute bottom-[-4px] left-0 right-0 h-[4px] bg-repeat-x rotate-180"
              style={{
                backgroundImage:
                  "linear-gradient(-45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px), linear-gradient(45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px)",
                backgroundSize: "8px 8px",
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
