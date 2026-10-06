"use client";

import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { useState, useEffect } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StockTake() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`
      : null,
    fetcher,
  );
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data?.inventory) {
      setItems(
        data.inventory.map((item: any) => ({
          ...item,
          expected: item.qty,
          actual: item.qty,
        })),
      );
    }
  }, [data]);

  const updateActual = (id: string, val: string) => {
    const num = parseInt(val, 10);
    setItems(
      items.map((item: any) =>
        item.id === id ? { ...item, actual: isNaN(num) ? 0 : num } : item,
      ),
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const changedItems = items.filter((i) => i.actual !== i.expected);
      if (changedItems.length === 0) {
        toast(language === 'en' ? 'No differences to approve' : "لا يوجد فروقات لاعتمادها");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/stock-take`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: changedItems }),
        },
      );

      if (!res.ok) throw new Error(language === 'en' ? 'Failed to approve stock take' : "فشل اعتماد الجرد");

      toast.success(language === 'en' ? 'Stock take approved and inventory updated successfully!' : "تم اعتماد الجرد وتحديث المخزون بنجاح!");
      mutate();
    } catch (error) {
      toast.error(language === 'en' ? 'An error occurred during stock take approval' : "حدث خطأ أثناء اعتماد الجرد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AppBar title={language === 'en' ? 'Stock Take' : "جرد المخزون (Stock Take)"} showLogo={false} />

      <div className="flex gap-4 mt-5">
        <div className="flex-1">
          <SearchBar placeholder={language === 'en' ? 'Scan barcode to search or register stock take...' : "امسح الباركود للبحث أو تسجيل الجرد..."} />
        </div>
        <button
          disabled={loading}
          onClick={handleFinish}
          className="bg-primary text-white px-6 py-2 rounded-[14px] font-bold text-[16px] whitespace-nowrap shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (language === 'en' ? 'Saving...' : "جاري الحفظ...") : (language === 'en' ? 'Finish Stock Take' : "إنهاء الجرد")}
        </button>
      </div>

      <div className="bg-card border border-mint-line rounded-[16px] overflow-hidden mt-6 shadow-sm">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-bg text-ink-soft text-[14px]">
              <th className="p-4 font-semibold border-b border-mint-line">
                {language === 'en' ? 'Item' : "الصنف"}
              </th>
              <th className="p-4 font-semibold border-b border-mint-line text-center">
                {language === 'en' ? 'Registered Quantity' : "الكمية المسجلة"}
              </th>
              <th className="p-4 font-semibold border-b border-mint-line text-center w-[150px]">
                {language === 'en' ? 'Actual Quantity' : "الكمية الفعلية"}
              </th>
              <th className="p-4 font-semibold border-b border-mint-line text-center">
                {language === 'en' ? 'Difference' : "الفرق"}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const diff = item.actual - item.expected;
              return (
                <tr
                  key={item.id}
                  className="border-b border-mint-line hover:bg-bg/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-bold text-[16px] text-ink">
                      {item.name}
                    </div>
                    <div className="text-[12px] font-mono text-ink-soft">
                      {item.barcode}
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-[16px] text-ink-soft">
                    {item.expected}
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="number"
                      value={item.actual.toString()}
                      onChange={(e) => updateActual(item.id, e.target.value)}
                      className="w-full bg-bg border-2 border-mint-line rounded-xl p-2 text-center font-mono text-[16px] text-primary font-bold outline-none focus:border-teal"
                    />
                  </td>
                  <td className="p-4 text-center">
                    {diff === 0 ? (
                      <span className="text-[#1E8A5F] font-bold bg-teal-pale px-3 py-1 rounded-full text-[14px]">
                        {language === 'en' ? 'Matches' : "مطابق"}
                      </span>
                    ) : diff > 0 ? (
                      <span
                        className="text-primary font-bold bg-primary-pale px-3 py-1 rounded-full text-[14px]"
                        dir="ltr"
                      >
                        +{diff}
                      </span>
                    ) : (
                      <span
                        className="text-coral font-bold bg-coral-pale px-3 py-1 rounded-full text-[14px]"
                        dir="ltr"
                      >
                        {diff}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
