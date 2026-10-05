"use client";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const CATEGORIES = [
  "رواتب",
  "كهرباء",
  "ماء",
  "إيجار",
  "مواد تنظيف",
  "ضيافة",
  "صيانة",
  "تسويق",
  "أخرى",
];
const CAT_COLORS: Record<string, string> = {
  رواتب: "bg-primary/10 text-primary",
  كهرباء: "bg-amber-pale text-[#B9791C]",
  ماء: "bg-teal-pale text-teal",
  إيجار: "bg-coral-pale text-coral",
  مواد: "bg-teal-pale text-teal",
  ضيافة: "bg-purple-100 text-purple-700",
  صيانة: "bg-orange-100 text-orange-700",
  تسويق: "bg-pink-100 text-pink-700",
  أخرى: "bg-bg text-ink-soft",
};

export default function ExpensesPage() {
  const user = useStore((s: any) => s.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 8) + "01";

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    category: "رواتب",
    description: "",
    amount: "",
    branch_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");

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
        }
      } catch (err) {}
    }
    fetchBranches();
  }, [user?.pharmacy_id]);

  const queryBranch =
    user?.role === "صيدلي" || user?.role === "مدير فرع"
      ? user?.branch || "all"
      : branchFilter;

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/expenses?from=${from}&to=${to}&branch_id=${queryBranch}`
      : null,
    fetcher,
  );
  const expenses = data?.expenses || [];

  const todayTotal = expenses
    .filter((e: any) => e.date?.startsWith(today))
    .reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const monthTotal = expenses.reduce(
    (s: number, e: any) => s + (e.amount || 0),
    0,
  );

  const handleAdd = async () => {
    if (!form.description || !form.amount) {
      toast.error(language === 'en' ? "Please enter expense details" : "يرجى إدخال تفاصيل المصروف");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/expenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            amount: parseFloat(form.amount),
            created_by: user?.managerName || "",
          }),
        },
      );
      const r = await res.json();
      if (r.success) {
        toast.success(language === 'en' ? "Expense added!" : "تمت إضافة المصروف!");
        setShowAdd(false);
        setForm({
          category: "رواتب",
          description: "",
          amount: "",
          branch_id: "",
        });
        mutate();
      } else toast.error(r.error || (language === 'en' ? "Failed" : "فشل"));
    } catch {
      toast.error(language === 'en' ? "Error" : "خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/expenses/${id}`,
      { method: "DELETE" },
    );
    const r = await res.json();
    if (r.success) {
      toast.success(language === 'en' ? "Deleted successfully" : "تم الحذف");
      mutate();
    } else toast.error(r.error);
  };

  return (
    <>
      <AppBar title={language === 'en' ? "Daily Expenses" : "المصروفات اليومية"} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {language === 'en' ? "Today's Expenses" : "مصروفات اليوم"}
            </div>
            <div className="text-[32px] font-mono font-black text-coral">
              ₪{todayTotal.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {language === 'en' ? "Expenses this period" : "مصروفات هذه الفترة"}
            </div>
            <div className="text-[32px] font-mono font-black text-primary">
              ₪{monthTotal.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">
              {language === 'en' ? "Number of Transactions" : "عدد العمليات"}
            </div>
            <div className="text-[32px] font-mono font-black text-teal">
              {expenses.length}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-mint-line rounded-xl px-4 py-2">
            <span className="text-[13px] font-bold text-ink-soft">{language === 'en' ? "From:" : "من:"}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-[13px] outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-mint-line rounded-xl px-4 py-2">
            <span className="text-[13px] font-bold text-ink-soft">{language === 'en' ? "To:" : "إلى:"}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-[13px] outline-none bg-transparent"
            />
          </div>
          <div className="flex-1" />
          {(user?.role === "owner" ||
            user?.role === "superadmin" ||
            user?.role === "manager") &&
            branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-ink outline-none"
              >
                <option value="all">{language === 'en' ? "All Branches" : "كل الفروع"}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-[14px] shadow-md shadow-primary/20 hover:opacity-90"
          >
            + {language === 'en' ? "Add Expense" : "إضافة مصروف"}
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center">
            <div className="text-[40px] mb-3">💸</div>
            <div className="text-ink-soft font-bold">
              {language === 'en' ? "No expenses recorded in this period" : "لا توجد مصروفات مسجلة في هذه الفترة"}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((e: any) => (
              <div
                key={e.id}
                className="bg-white rounded-2xl border border-mint-line p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-xl text-[12px] font-bold ${CAT_COLORS[e.category] || CAT_COLORS["أخرى"]}`}
                  >
                    {language === 'en' ? (e.category === 'رواتب' ? 'Salaries' : e.category === 'كهرباء' ? 'Electricity' : e.category === 'ماء' ? 'Water' : e.category === 'إيجار' ? 'Rent' : e.category === 'مواد تنظيف' ? 'Cleaning Supplies' : e.category === 'ضيافة' ? 'Hospitality' : e.category === 'صيانة' ? 'Maintenance' : e.category === 'تسويق' ? 'Marketing' : e.category === 'أخرى' ? 'Other' : e.category) : e.category}
                  </span>
                  <div>
                    <div className="font-bold text-[14px] text-ink">
                      {e.description}
                    </div>
                    <div className="text-[12px] text-ink-soft mt-0.5 flex items-center gap-2">
                      <span>{new Date(e.date).toLocaleString("ar-EG")}</span>
                      {e.branch_id &&
                        branches.find((b: any) => b.id === e.branch_id) && (
                          <span className="px-2 py-0.5 bg-mint-line/30 rounded-full text-primary font-bold">
                            {
                              branches.find((b: any) => b.id === e.branch_id)
                                ?.name
                            }
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[20px] font-mono font-black text-coral">
                    ₪{(e.amount || 0).toFixed(2)}
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-ink-soft hover:text-coral transition-colors p-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                {language === 'en' ? "Add Expense" : "إضافة مصروف"}
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-2 bg-bg rounded-full text-ink-soft hover:text-coral transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {(user?.role === "owner" ||
                user?.role === "superadmin" ||
                user?.role === "manager") &&
                branches.length > 0 && (
                  <div>
                    <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                      {language === 'en' ? "Branch" : "الفرع"}
                    </label>
                    <select
                      value={form.branch_id}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, branch_id: e.target.value }))
                      }
                      className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                    >
                      <option value="">{language === 'en' ? "Main Branch" : "الفرع الرئيسي"}</option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? "Category" : "الفئة"}
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {language === 'en' ? (c === 'رواتب' ? 'Salaries' : c === 'كهرباء' ? 'Electricity' : c === 'ماء' ? 'Water' : c === 'إيجار' ? 'Rent' : c === 'مواد تنظيف' ? 'Cleaning Supplies' : c === 'ضيافة' ? 'Hospitality' : c === 'صيانة' ? 'Maintenance' : c === 'تسويق' ? 'Marketing' : c === 'أخرى' ? 'Other' : c) : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? "Description" : "الوصف"}
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary"
                  placeholder={language === 'en' ? "Example: August Electricity Bill" : "مثال: فاتورة كهرباء أغسطس"}
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">
                  {language === 'en' ? "Amount (₪)" : "المبلغ (₪)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (language === 'en' ? "Saving..." : "جاري الحفظ...") : (language === 'en' ? "Save Expense" : "حفظ المصروف")}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                {language === 'en' ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
