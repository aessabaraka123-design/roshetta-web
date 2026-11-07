"use client";

import { API_BASE_URL } from "@/lib/config";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { formatQty } from "@/utils/formatQty";
import { normalizeSearchText } from "@/utils/textUtils";
import { translateErrorMessage } from "@/lib/errorTranslations";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getExpectedBoxQty = (item: any): number => {
  const val = Number(item?.qty) || 0;
  if (val <= 0) return 0;
  if (item?.units) {
    try {
      let parsed = typeof item.units === "string" ? JSON.parse(item.units) : item.units;
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
      if (Array.isArray(parsed) && parsed.length > 1 && parsed[0]?.count) {
        return Math.floor(val / (Number(parsed[0].count) || 1));
      }
    } catch (e) {}
  }
  return val;
};

export default function StockTake() {
  const user = useStore((state) => state.user);
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

  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "diff">("all");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: dashboardData } = useSWR(
    user ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/dashboard` : null,
    fetcher
  );
  const branches = dashboardData?.branches || [];

  const { data, mutate, isLoading } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory?branch_id=${branchFilter}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 10000,
    }
  );

  useEffect(() => {
    if (data?.inventory) {
      setItems(
        data.inventory.map((item: any) => {
          const expectedBoxes = getExpectedBoxQty(item);
          return {
            ...item,
            expectedBoxes,
            actualBoxes: expectedBoxes,
          };
        })
      );
    }
  }, [data]);

  const updateActualBoxes = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, actualBoxes: Math.max(0, (Number(item.actualBoxes) || 0) + delta) }
          : item
      )
    );
  };

  const setExactActualBoxes = (id: string, val: string) => {
    const num = parseInt(val, 10);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, actualBoxes: isNaN(num) ? 0 : Math.max(0, num) }
          : item
      )
    );
  };

  const differencesCount = useMemo(() => {
    return items.filter((i) => i.actualBoxes !== i.expectedBoxes).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (search && search.trim()) {
      const qNorm = normalizeSearchText(search);
      const qRaw = search.trim().toLowerCase();
      result = result.filter((item) => {
        const nameNorm = normalizeSearchText(item.name || "");
        const barcode = String(item.barcode || "").toLowerCase();
        return (
          nameNorm.includes(qNorm) ||
          barcode.includes(qRaw) ||
          (item.name && item.name.toLowerCase().includes(qRaw))
        );
      });
    }

    if (filterMode === "diff") {
      result = result.filter((i) => i.actualBoxes !== i.expectedBoxes);
    }

    return result;
  }, [items, search, filterMode]);

  const handleFinish = async () => {
    const diffs = items.filter((i) => i.actualBoxes !== i.expectedBoxes);
    if (diffs.length === 0) {
      toast(language === "en" ? "No differences to approve" : "لا يوجد فروقات مسجلة لاعتمادها");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const changedItems = diffs.map((item) => {
        let multiplier = 1;
        let rem = 0;
        if (item?.units) {
          try {
            let parsedUnits = typeof item.units === "string" ? JSON.parse(item.units) : item.units;
            if (typeof parsedUnits === "string") parsedUnits = JSON.parse(parsedUnits);
            if (Array.isArray(parsedUnits) && parsedUnits.length > 1 && parsedUnits[0]?.count) {
              multiplier = Number(parsedUnits[0].count) || 1;
              const currentTotal = Number(item.qty || 0);
              if (currentTotal > 0) {
                const oldBoxes = Math.floor(currentTotal / multiplier);
                if (item.actualBoxes === oldBoxes) {
                  rem = currentTotal % multiplier;
                }
              }
            }
          } catch (e) {}
        }
        const newQty = Math.max(0, Number(item.actualBoxes) || 0) * multiplier + rem;
        return {
          id: item.id,
          actual: newQty,
          expectedQty: Number(item.qty || 0),
        };
      });

      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/stock-take`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: changedItems }),
        }
      );

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.success) {
        const rawCode = result.code || result.error || "";
        const errorMsg = translateErrorMessage(
          rawCode || (language === "en" ? "Failed to approve stock take" : "فشل اعتماد الجرد"),
          language === "en" ? "en" : "ar"
        );
        throw new Error(errorMsg);
      }

      toast.success(
        language === "en"
          ? "Stock take approved and inventory updated successfully!"
          : "تم اعتماد الجرد وتسوية فروقات المخزون بنجاح!"
      );
      mutate();
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          (language === "en" ? "An error occurred during stock take approval" : "حدث خطأ أثناء اعتماد الجرد")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full pb-12">
      <AppBar title={language === "en" ? "Stock Take" : "جرد المخزون"} showLogo={false} />

      {errorMessage && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-[14px] font-bold flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-red-400 hover:text-red-700 font-black text-lg px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-3 mt-4 items-stretch md:items-center">
        {(user?.role === "owner" || user?.role === "superadmin" || user?.role === "manager") &&
          branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-card text-ink border-2 border-mint-line px-3.5 py-2.5 rounded-2xl font-bold text-[14px] outline-none shadow-sm focus:border-teal"
            >
              <option value="all">{language === "en" ? "All Branches" : "كل الفروع"}</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

        <div className="flex-1">
          <SearchBar
            placeholder={
              language === "en"
                ? "Search medicine name or barcode for stock take..."
                : "ابحث باسم الصنف أو امسح الباركود للجرد..."
            }
            value={search}
            onChange={setSearch}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-card border border-mint-line rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === "all"
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {language === "en" ? `All (${items.length})` : `الكل (${items.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("diff")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterMode === "diff"
                  ? "bg-coral text-white shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>{language === "en" ? "Differences Only" : "فروقات فقط"}</span>
              {differencesCount > 0 && (
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[11px]">
                  {differencesCount}
                </span>
              )}
            </button>
          </div>

          <button
            disabled={loading || differencesCount === 0}
            onClick={handleFinish}
            className="bg-primary text-white px-5 py-2.5 rounded-2xl font-bold text-[14px] whitespace-nowrap shadow-sm hover:bg-teal transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{language === "en" ? "Saving..." : "جاري الاعتماد..."}</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>
                  {language === "en"
                    ? `Approve Stock Take (${differencesCount})`
                    : `اعتماد الجرد (${differencesCount})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stock Take Table */}
      <div className="bg-card border border-mint-line rounded-3xl overflow-hidden mt-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-bg text-ink-soft text-[13px] border-b border-mint-line">
                <th className="p-4 font-bold text-start">{language === "en" ? "Item" : "الصنف"}</th>
                <th className="p-4 font-bold text-start">{language === "en" ? "Branch" : "الفرع"}</th>
                <th className="p-4 font-bold text-center">
                  {language === "en" ? "Registered Stock" : "الرصيد المسجل بالسيستم"}
                </th>
                <th className="p-4 font-bold text-center w-[220px]">
                  {language === "en" ? "Actual Count (Boxes)" : "الكمية الفعلية (علب)"}
                </th>
                <th className="p-4 font-bold text-center">{language === "en" ? "Difference" : "الفارق"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-line">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-soft">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>{language === "en" ? "Loading inventory..." : "جاري تحميل الأصناف..."}</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-ink-soft">
                    {language === "en"
                      ? filterMode === "diff"
                        ? "No count differences detected! Everything matches registered stock."
                        : "No items match your search."
                      : filterMode === "diff"
                      ? "رائع! لا يوجد أي فروقات بالجرد، جميع الأصناف مطابقة للرصيد المسجل."
                      : "لا يوجد أصناف تطابق البحث."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => {
                  const diffBoxes = item.actualBoxes - item.expectedBoxes;
                  const isNegativeStock = Number(item.qty || 0) < 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-bg/60 transition-colors ${
                        diffBoxes !== 0 ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-[15px] text-ink leading-snug" dir="auto">
                          {item.name}
                        </div>
                        <div className="text-[12px] font-mono text-ink-soft flex items-center gap-2 mt-0.5">
                          <span>{item.barcode || "—"}</span>
                          {isNegativeStock && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              ⚠️ {language === "en" ? "Negative Stock Alert" : `سالب (${item.qty})`}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-start font-semibold text-[13px] text-ink-soft">
                        {(() => {
                          const bId = String(item.branch_id);
                          if (!bId || bId === "all" || bId === "null" || bId === "undefined")
                            return language === "en" ? "Main" : "الرئيسي";
                          const b = branches.find((x: any) => String(x.id) === bId);
                          return b ? b.name : language === "en" ? "Main" : "الرئيسي";
                        })()}
                      </td>

                      <td className="p-4 text-center">
                        <div className="font-mono text-[14px] font-bold text-ink">
                          {formatQty(item.qty, item.units, language)}
                        </div>
                        <div className="text-[11px] font-semibold text-ink-soft mt-0.5">
                          {item.expectedBoxes}{" "}
                          {language === "en" ? "boxes registered" : "علبة مسجلة"}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                          <button
                            type="button"
                            onClick={() => updateActualBoxes(item.id, -1)}
                            className="w-9 h-9 rounded-xl border border-mint-line bg-card hover:bg-bg active:scale-95 text-ink font-bold text-lg flex items-center justify-center transition-all select-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.actualBoxes ?? ""}
                            onChange={(e) => setExactActualBoxes(item.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-16 h-9 bg-bg border-2 border-mint-line rounded-xl text-center font-mono text-[15px] text-primary font-black outline-none focus:border-teal transition-all"
                            style={{ direction: "ltr" }}
                          />
                          <button
                            type="button"
                            onClick={() => updateActualBoxes(item.id, 1)}
                            className="w-9 h-9 rounded-xl border border-mint-line bg-card hover:bg-bg active:scale-95 text-ink font-bold text-lg flex items-center justify-center transition-all select-none"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {diffBoxes === 0 ? (
                          <span className="text-[#1E8A5F] font-bold bg-teal-pale px-3 py-1 rounded-full text-[13px] inline-flex items-center gap-1">
                            <span>✓</span>
                            <span>{language === "en" ? "Matches" : "مطابق"}</span>
                          </span>
                        ) : diffBoxes > 0 ? (
                          <span
                            className="text-primary font-bold bg-primary-pale px-3 py-1 rounded-full text-[13px] inline-flex items-center gap-1"
                            dir="ltr"
                          >
                            <span>+{diffBoxes}</span>
                            <span className="text-[11px]">
                              {language === "en" ? "box" : "علبة (زيادة)"}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="text-coral font-bold bg-coral-pale px-3 py-1 rounded-full text-[13px] inline-flex items-center gap-1"
                            dir="ltr"
                          >
                            <span>{diffBoxes}</span>
                            <span className="text-[11px]">
                              {language === "en" ? "box" : "علبة (عجز)"}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
