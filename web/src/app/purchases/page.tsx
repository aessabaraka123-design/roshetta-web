"use client";
import { useState, useEffect, useRef } from "react";
import AppBar from "@/components/AppBar";
import ConfirmModal from "@/components/ConfirmModal";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatQty } from "@/utils/formatQty";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PurchasesPage() {
  const user = useStore((s: any) => s.user);
  const language = useStore((s: any) => s.language);
  const router = useRouter();
  const pdfRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // --- State ---
  const [branchFilter, setBranchFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);
  const [pdfInvoice, setPdfInvoice] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const downloadPDF = async (inv: any) => {
    setDownloadingPdf(inv.id);
    setPdfInvoice(inv);
    setTimeout(async () => {
      try {
        // @ts-ignore
        const html2pdf = (await import("html2pdf.js")).default;
        const el = pdfRef.current;
        if (el) {
          const opt = {
            margin: 0,
            filename: `فاتورة-${inv.id}.pdf`,
            image: { type: "jpeg" as const, quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
          };
          await html2pdf().from(el).set(opt).save();
        }
      } catch (e) {
        console.error("PDF error", e);
      }
      setDownloadingPdf(null);
      setPdfInvoice(null);
    }, 150);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const tName = (name: string) => {
    if (language !== "en") return name;
    const dict: any = { "شريط": "Strip", "أمبولة": "Ampoule", "مغلف": "Sachet", "قطرة": "Drop", "حبة": "Pill", "مل": "ml", "غرام": "Gram", "علبة": "Box" };
    return dict[name] || name;
  };
  const [showDrop, setShowDrop] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    invoice_number: "",
    notes: "",
    branch_id: "all",
    status: "completed",
    paid_amount: "",
  });
  const [newItem, setNewItem] = useState({
    name: "",
    scientificName: "",
    category: "",
    price_sell: "",
    price_buy: "",
    minQty: "",
    expiry: "",
    barcode: "",
  });

  // --- Data ---
  const { data: branchesData } = useSWR(
    user && (user.role === "owner" || user.role === "superadmin")
      ? `${API}/api/admin/pharmacies/${user.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const { data: invoicesData, mutate } = useSWR(
    user
      ? `${API}/api/pharmacies/${user.pharmacy_id}/purchase-invoices?branch_id=${branchFilter}`
      : null,
    fetcher,
  );
  const { data: inventoryData, mutate: mutateInv } = useSWR(
    user ? `${API}/api/pharmacies/${user.pharmacy_id}/inventory` : null,
    fetcher,
  );
  const { data: suppliersData } = useSWR(
    user ? `${API}/api/pharmacies/${user.pharmacy_id}/suppliers` : null,
    fetcher,
  );

  const branches = branchesData?.branches || [];
  const invoices = invoicesData?.invoices || [];
  const inventory = inventoryData?.inventory || [];
  const suppliers = suppliersData?.suppliers || [];

  // --- Computed ---
  const cartTotal = cartItems.reduce(
    (s, i) => s + (i.qty || 0) * (i.purchase_price || 0),
    0,
  );
  const totalCost = invoices.reduce(
    (s: number, i: any) => s + (i.total_cost || 0),
    0,
  );
  const totalPaid = invoices.reduce(
    (s: number, i: any) => s + (i.paid_amount || 0),
    0,
  );
  const totalRemaining = invoices.reduce(
    (s: number, i: any) => s + (i.remaining || 0),
    0,
  );

  const branchInv =
    form.branch_id === "all"
      ? inventory
      : inventory.filter(
          (d: any) =>
            d.branch_id === form.branch_id ||
            String(d.branch_id) === String(form.branch_id),
        );
  const uniqueMap = new Map();
  branchInv.forEach((d: any) => {
    if (!uniqueMap.has(d.name)) uniqueMap.set(d.name, d);
  });
  const uniqueInv = Array.from(uniqueMap.values());
  const filteredInv = itemSearch
    ? uniqueInv.filter(
        (d: any) =>
          d.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
          (d.barcode && d.barcode.includes(itemSearch)),
      )
    : uniqueInv.slice(0, 20);

  // --- Handlers ---
  const openNew = () => {
    setEditingId(null);
    setForm({
      supplier_id: "",
      supplier_name: "",
      invoice_number: "",
      notes: "",
      branch_id: branchFilter,
      status: "completed",
      paid_amount: "",
    });
    setCartItems([]);
    setItemSearch("");
    setShowAdd(true);
  };

  const openEdit = (inv: any) => {
    setEditingId(inv.id);
    setForm({
      supplier_id: inv.supplier_id || "",
      supplier_name: inv.supplier_name || "",
      invoice_number: inv.invoice_number || "",
      notes: inv.notes || "",
      branch_id: inv.branch_id || "all",
      status: inv.status || "completed",
      paid_amount: inv.paid_amount || "",
    });
    const items =
      typeof inv.items === "string"
        ? JSON.parse(inv.items || "[]")
        : inv.items || [];
    setCartItems(items);
    setItemSearch("");
    setShowAdd(true);
  };

  const addItemToCart = (drug: any) => {
    const existing = cartItems.find((i) => i.id === drug.id);
    if (existing)
      setCartItems((c) =>
        c.map((i) => (i.id === drug.id ? { ...i, qty: i.qty + 1 } : i)),
      );
    else
      setCartItems((c) => [
        ...c,
        {
          id: drug.id,
          name: drug.name,
          qty: 1,
          purchase_price: drug.cost || 0,
          sell_price: drug.price || 0,
          has_parts: false,
          part1_name: "شريط",
          part1_qty: 10,
          part1_price: 0,
          has_subparts: false,
          part2_name: "حبة",
          part2_qty: 10,
          part2_price: 0,
        },
      ]);
    setItemSearch("");
    setShowDrop(false);
  };

  const pullLowStock = () => {
    const low = uniqueInv.filter((d: any) => (d.qty || 0) <= (d.minQty || 0));
    if (low.length === 0) {
      toast(language === "en" ? "No shortages in this branch" : "لا يوجد نواقص في هذا الفرع");
      return;
    }
    const newCart = [...cartItems];
    low.forEach((d: any) => {
      if (!newCart.find((i) => i.id === d.id)) {
        const needed = Math.max(1, (d.minQty || 0) - (d.qty || 0) + 10);
        newCart.push({
          id: d.id,
          name: d.name,
          qty: needed,
          purchase_price: d.cost || 0,
          sell_price: d.price || 0,
          has_parts: false,
          part1_name: "شريط",
          part1_qty: 10,
          part1_price: 0,
          has_subparts: false,
          part2_name: "حبة",
          part2_qty: 10,
          part2_price: 0,
        });
      }
    });
    setCartItems(newCart);
    toast.success(language === "en" ? `Fetched ${low.length} short items!` : `تم جلب ${low.length} صنف ناقص!`);
  };

  const handleSave = async () => {
    if (!form.supplier_name && !form.supplier_id && form.status !== "draft")
      return toast.error(language === "en" ? "Supplier must be selected for actual invoices" : "يجب تحديد المورد للفاتورة الفعلية");
    if (cartItems.length === 0)
      return toast.error(language === "en" ? "Invoice is empty, add items first" : "الفاتورة فارغة، أضف أصناف أولاً");
    setLoading(true);
    try {
      if (editingId) {
        await fetch(
          `${API}/api/pharmacies/${user?.pharmacy_id}/purchase-invoices/${editingId}`,
          { method: "DELETE" },
        );
      }
      const res = await fetch(
        `${API}/api/pharmacies/${user?.pharmacy_id}/purchase-invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            items: cartItems.map((item: any) => ({
              ...item,
              unit_size: (() => {
                if (item.units) {
                  try {
                    const arr = JSON.parse(item.units);
                    if (arr && arr.length > 0) return arr[0].count;
                  } catch (e) {}
                }
                return 1;
              })(),
            })),
            total_cost: cartTotal,
            paid_amount: form.paid_amount ? parseFloat(form.paid_amount) : 0,
          }),
        },
      );
      const r = await res.json();
      if (r.success) {
        toast.success(
          form.status === "draft"
            ? (language === "en" ? "Draft order saved!" : "تم حفظ الطلبية المبدئية!")
            : (language === "en" ? "Purchase invoice saved!" : "تم حفظ فاتورة المشتريات!"),
        );
        setShowAdd(false);
        setEditingId(null);
        setCartItems([]);
        mutate();
      } else toast.error(r.error || (language === "en" ? "Save error" : "خطأ في الحفظ"));
    } catch {
      toast.error(language === "en" ? "Server connection error" : "خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!newItem.name || !newItem.price_sell) {
      toast.error(language === "en" ? "Enter item name and price" : "أدخل اسم وسعر الصنف");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/api/pharmacies/${user?.pharmacy_id}/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newItem.name,
            scientificName: newItem.scientificName,
            category: newItem.category || "General medicines",
            price_sell: parseFloat(newItem.price_sell) || 0,
            price_buy: parseFloat(newItem.price_buy) || 0,
            cost: parseFloat(newItem.price_buy) || 0,
            minQty: parseInt(newItem.minQty) || 0,
            expiry: newItem.expiry || "",
            barcode: newItem.barcode || "",
            qty: 0,
            branch_id: form.branch_id === "all" ? null : form.branch_id,
          }),
        },
      );
      const r = await res.json();
      if (r.success) {
        toast.success(language === "en" ? "Item added!" : "تم إضافة الصنف!");
        setCartItems((c) => [
          ...c,
          {
            id: r.id,
            name: newItem.name,
            qty: 1,
            purchase_price: 0,
            sell_price: 0,
            has_parts: false,
            part1_name: "شريط",
            part1_qty: 10,
            part1_price: 0,
            has_subparts: false,
            part2_name: "حبة",
            part2_qty: 10,
            part2_price: 0,
          },
        ]);
        setShowQuickAdd(false);
        setNewItem({
          name: "",
          scientificName: "",
          category: "",
          price_sell: "",
          price_buy: "",
          minQty: "",
          expiry: "",
          barcode: "",
        });
        mutateInv();
      } else toast.error(r.error);
    } catch {
      toast.error(language === "en" ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const executeDelete = async (id: string) => {
    const r = await (
      await fetch(
        `${API}/api/pharmacies/${user?.pharmacy_id}/purchase-invoices/${id}`,
        { method: "DELETE" },
      )
    ).json();
    if (r.success) {
      toast.success(language === "en" ? "Deleted successfully" : "تم الحذف");
      mutate();
    } else toast.error(r.error);
  };

  // --- UI Helpers ---
  const StatusBadge = ({ inv }: { inv: any }) => {
    if (inv.status === "draft")
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-[#F5F5F0] text-[#888]">
          {language === "en" ? "Draft Order" : "طلبية مبدئية"}
        </span>
      );
    if ((inv.remaining || 0) <= 0)
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-teal-pale text-teal">
          مدفوعة بالكامل
        </span>
      );
    if ((inv.paid_amount || 0) > 0)
      return (
        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-100 text-amber-700">
          دفع جزئي
        </span>
      );
    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-coral-pale text-coral">
        غير مدفوعة
      </span>
    );
  };

  const parseItems = (items: any) => {
    if (Array.isArray(items)) return items;
    try {
      return JSON.parse(items || "[]");
    } catch {
      return [];
    }
  };

  return (
    <>
      <AppBar title={language === 'en' ? "Purchases" : "المشتريات"} showNotifs showLogo />

      <div className="p-4 md:p-6 pb-28 md:pb-8 max-w-5xl mx-auto">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <p className="text-[12px] font-bold text-ink-soft mb-1">
              {language === 'en' ? "Total Invoices" : "إجمالي الفواتير"}
            </p>
            <p className="text-[22px] font-mono font-black text-ink">
              ₪{totalCost.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <p className="text-[12px] font-bold text-ink-soft mb-1">
              {language === 'en' ? "Total Paid" : "إجمالي المدفوع"}
            </p>
            <p className="text-[22px] font-mono font-black text-teal">
              ₪{totalPaid.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm">
            <p className="text-[12px] font-bold text-ink-soft mb-1">
              {language === "en" ? "Total Remaining" : "إجمالي المتبقي"}
            </p>
            <p className="text-[22px] font-mono font-black text-coral">
              ₪{totalRemaining.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Marquee Ticker */}
        <style>{`
          @keyframes marquee-rtl {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-marquee-rtl {
            display: inline-flex;
            animation: marquee-rtl 35s linear infinite;
          }
          .animate-marquee-rtl:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div
          className="mb-6 bg-white overflow-hidden rounded-2xl border border-mint-line shadow-sm flex items-center p-3 relative"
          dir="rtl"
        >
          <div className="flex-shrink-0 z-10 bg-white pl-3 flex items-center gap-2 border-l border-mint-line">
            <span className="text-xl">✨</span>
            <span className="font-bold text-primary text-[14px]">
              {language === 'en' ? "Quick Tip:" : "نصيحة سريعة:"}
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative flex items-center">
            <div className="animate-marquee-rtl flex items-center gap-6 text-[14px] font-bold text-ink-soft w-max">
              <span>
                {language === 'en' ? "Purchasing system now supports FIFO for 100% accurate profit calculation 💰" : "نظام المشتريات يدعم الآن نظام الدفعات (FIFO) لضمان حساب أرباحك بدقة 100% 💰"}
              </span>
              <span className="text-mint-line">|</span>
              <span>{language === 'en' ? 'You can edit "Selling Price" directly from within the invoice 🏷️' : 'يمكنك تعديل "سعر البيع" مباشرة من داخل الفاتورة 🏷️'}</span>
              <span className="text-mint-line">|</span>
              <span>
                {language === 'en' ? 'Remember: "Draft" invoices do not change stock, "Completed" ones apply quantities and prices instantly ✅' : 'تذكر: الفاتورة "المبدئية" لا تُغيّر أرقام مخزونك، الفاتورة "ال{language === "en" ? "Completed" : "مكتملة"}" تعتمد الكميات والأسعار فوراً ✅'}
              </span>
              <span className="text-mint-line">|</span>
              <span>
                {language === 'en' ? "Made a mistake? Don't worry! Deleting a completed invoice automatically reverts the stock 🔄" : "هل أخطأت؟ لا تقلق! حذف الفاتورة المكتملة يسحب كمياتها من المخزون تلقائياً 🔄"}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-[14px]"
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
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            {language === 'en' ? "New Invoice" : "فاتورة جديدة"}
          </button>
          {(user?.role === "owner" || user?.role === "superadmin") &&
            branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-white border border-mint-line text-ink font-bold py-3 px-4 rounded-2xl outline-none focus:border-primary text-[14px]"
              >
                <option value="all">{language === 'en' ? "All Branches" : "كل الفروع"}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
        </div>

        {/* Invoices List */}
        {invoices.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-mint-line">
            <div className="w-20 h-20 bg-primary-pale rounded-3xl flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-[17px] font-black text-ink mb-2">
              {language === 'en' ? "No invoices yet" : "لا توجد فواتير بعد"}
            </h3>
            <p className="text-[14px] text-ink-soft">
              {language === 'en' ? "Start by adding a purchase invoice or draft order" : "ابدأ بإضافة فاتورة مشتريات أو طلبية مبدئية"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv: any) => {
              const items = parseItems(inv.items);
              const isDraft = inv.status === "draft";
              return (
                <div
                  key={inv.id}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${isDraft ? "border-r-4 border-r-[#ccc] border-mint-line" : "border-mint-line"}`}
                >
                  <div className="p-5">
                    {/* Row 1: Icon + Name + Badge | Price */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isDraft ? "bg-[#F5F5F0]" : "bg-primary-pale"}`}
                        >
                          <svg
                            className={`w-5 h-5 ${isDraft ? "text-ink-soft" : "text-primary"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-[17px] text-ink">
                              {inv.supplier_name ||
                                (isDraft ? (language === 'en' ? "Draft without supplier" : "طلبية بدون مورد") : (language === 'en' ? "Unspecified supplier" : "مورد غير محدد"))}
                            </span>
                            <StatusBadge inv={inv} />
                            {inv.invoice_number && (
                              <span className="text-[12px] font-mono text-ink-soft bg-bg px-2 py-0.5 rounded-lg border border-mint-line">
                                #{inv.invoice_number}
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-ink-soft">
                            {new Date(inv.date).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      {/* Price Block */}
                      <div className="shrink-0 text-start">
                        <p className="text-[22px] font-mono font-black text-ink leading-tight">
                          ₪{(inv.total_cost || 0).toFixed(2)}
                        </p>
                        {(inv.remaining || 0) > 0 && (
                          <p className="text-[12px] font-bold text-coral text-start">
                            {language === 'en' ? "Remaining" : "متبقي"} ₪{(inv.remaining || 0).toFixed(2)}
                          </p>
                        )}
                        {(inv.remaining || 0) <= 0 &&
                          inv.status !== "draft" && (
                            <p className="text-[12px] font-bold text-teal text-start">
                              {language === 'en' ? "Fully Paid ✓" : "مدفوعة بالكامل ✓"}
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Row 2: Items */}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-3 pt-3 border-t border-mint-line">
                        {items.slice(0, 5).map((item: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 bg-bg text-primary text-[11px] font-bold px-3 py-1.5 rounded-xl border border-mint-line"
                          >
                            {item.name}{" "}
                            <span className="text-ink-soft font-medium">
                              × {item.qty}
                            </span>
                          </span>
                        ))}
                        {items.length > 5 && (
                          <span className="text-[11px] text-ink-soft py-1 self-center">
                            +{items.length - 5} {language === 'en' ? "more" : "أخرى"}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Row 3: Action Buttons */}
                    <div className="flex gap-2 pt-3 mt-1 border-t border-mint-line justify-end">
                      <button
                        onClick={() => openEdit(inv)}
                        className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${isDraft ? "bg-primary text-white hover:opacity-90" : "bg-primary-pale text-primary hover:bg-primary hover:text-white"}`}
                      >
                        {isDraft ? (language === 'en' ? "Add to Stock" : "إدخال للمخزون") : (language === 'en' ? "Edit" : "تعديل")}
                      </button>
                      <button
                        onClick={() => setShowPreview(inv)}
                        className="px-4 py-2 bg-bg text-ink-soft rounded-xl text-[13px] font-bold hover:bg-mint-line transition-all"
                      >
                        {language === 'en' ? "Preview" : "معاينة"}
                      </button>
                      <button
                        onClick={() => downloadPDF(inv)}
                        disabled={downloadingPdf === inv.id}
                        className="px-4 py-2 bg-bg text-teal rounded-xl text-[13px] font-bold hover:bg-teal/10 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        {downloadingPdf === inv.id ? (
                          <svg
                            className="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        ) : (
                          "PDF"
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(inv.id)}
                        className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral-pale transition-all"
                      >
                        {language === 'en' ? "Delete" : "حذف"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Add / Edit Modal (Split Panel) ===== */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          />
          <div
            className="relative bg-white rounded-3xl w-full max-w-5xl flex flex-col shadow-2xl border border-mint-line z-10 overflow-hidden"
            style={{ height: "min(85vh, 750px)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-mint-line bg-white">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${form.status === "draft" ? "bg-coral-pale" : "bg-primary-pale"}`}
                >
                  <svg
                    className={`w-6 h-6 ${form.status === "draft" ? "text-coral" : "text-primary"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[22px] font-black text-ink leading-tight">
                    {editingId ? (language === 'en' ? "Edit Invoice" : "تعديل الفاتورة") : (language === 'en' ? "New Purchase Invoice" : "فاتورة مشتريات جديدة")}
                  </h2>
                  <p className="text-[13px] text-ink-soft mt-0.5">
                    {form.status === "draft"
                      ? (language === 'en' ? "Draft Order — does not affect stock" : "طلبية مبدئية — لا تؤثر على المخزون")
                      : (language === 'en' ? "Actual Invoice — adds to stock and supplier account" : "فاتورة فعلية — تضاف للمخزون وحساب المورد")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line transition-colors text-ink-soft"
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
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* ── Body: Split Panels ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* RIGHT PANEL — Controls */}
              <div className="w-80 shrink-0 border-l border-mint-line bg-[#FAFAF8] flex flex-col">
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Type Toggle */}
                  <div>
                    <label className="block text-[13px] font-black text-ink-soft uppercase tracking-wide mb-2">
                      {language === 'en' ? "Invoice Type" : "نوع الفاتورة"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, status: "completed" })
                        }
                        className={`py-3 rounded-xl border-2 text-[14px] font-black transition-all ${form.status === "completed" ? "border-primary bg-primary-pale text-primary shadow-sm" : "border-mint-line bg-white text-ink-soft hover:border-primary/40"}`}
                      >
                        {language === 'en' ? "Actual" : "فعلية"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, status: "draft" })}
                        className={`py-3 rounded-xl border-2 text-[14px] font-black transition-all ${form.status === "draft" ? "border-coral bg-coral-pale text-coral shadow-sm" : "border-mint-line bg-white text-ink-soft hover:border-coral/40"}`}
                      >
                        {language === 'en' ? "Draft" : "مبدئية"}
                      </button>
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-[13px] font-black text-ink-soft uppercase tracking-wide mb-1.5">
                      {language === "en" ? "Supplier" : "المورد"} {" "}
                      {form.status === "completed" && (
                        <span className="text-coral">*</span>
                      )}
                    </label>
                    <select
                      value={form.supplier_id}
                      onChange={(e) => {
                        const sel = suppliers.find(
                          (s: any) => s.id === e.target.value,
                        );
                        setForm((p) => ({
                          ...p,
                          supplier_id: e.target.value,
                          supplier_name: sel ? sel.name : "",
                        }));
                      }}
                      className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="">{language === "en" ? "Select Supplier..." : "اختر المورد..."}</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="block text-[13px] font-black text-ink-soft uppercase tracking-wide mb-1.5">
                      {language === "en" ? "Supplier Invoice No" : "رقم فاتورة المورد"}
                    </label>
                    <input
                      type="text"
                      value={form.invoice_number}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          invoice_number: e.target.value,
                        }))
                      }
                      placeholder={language === "en" ? "Optional" : "اختياري"}
                      className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  {/* Branch */}
                  {(user?.role === "owner" || user?.role === "superadmin") &&
                    branches.length > 0 && (
                      <div>
                        <label className="block text-[13px] font-black text-ink-soft uppercase tracking-wide mb-1.5">
                          الفرع
                        </label>
                        <select
                          value={form.branch_id}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              branch_id: e.target.value,
                            }))
                          }
                          className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[14px] font-bold text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                          <option value="all">المخزن الرئيسي</option>
                          {branches.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  {/* Paid Amount */}
                  {form.status !== "draft" && (
                    <div>
                      <label className="block text-[13px] font-black text-ink-soft uppercase tracking-wide mb-1.5">
                        {language === "en" ? "Paid Amount (₪)" : "المبلغ المدفوع (₪)"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.paid_amount}
                        onChange={(e) =>
                          setForm({ ...form, paid_amount: e.target.value })
                        }
                        placeholder="0.00"
                        className="w-full bg-white border border-mint-line rounded-xl px-4 py-3 text-[15px] font-mono font-black text-teal outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Total block */}
                <div className="p-5 border-t border-mint-line bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[14px] font-bold text-ink-soft">
                      {language === "en" ? "Grand Total" : "الإجمالي الكلي"}
                    </span>
                    <span className="text-[24px] font-mono font-black text-primary">
                      ₪{cartTotal.toFixed(2)}
                    </span>
                  </div>
                  {form.paid_amount && parseFloat(form.paid_amount) > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-mint-line">
                      <span className="text-[13px] font-bold text-ink-soft">
                        {language === "en" ? "Remaining" : "المتبقي"} (دين)
                      </span>
                      <span className="text-[16px] font-mono font-black text-coral">
                        ₪
                        {Math.max(
                          0,
                          cartTotal - parseFloat(form.paid_amount),
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* LEFT PANEL — Items */}
              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                {/* Search bar */}
                <div className="px-6 py-4 border-b border-mint-line bg-white shrink-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative flex-1">
                      <div className="flex items-center gap-3 bg-bg border border-mint-line rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <svg
                          className="w-5 h-5 text-ink-soft shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => {
                            setItemSearch(e.target.value);
                            setShowDrop(true);
                          }}
                          onFocus={() => setShowDrop(true)}
                          placeholder={language === "en" ? "Search and add item..." : "ابحث عن صنف وأضفه..."}
                          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft/70"
                        />
                      </div>
                      {showDrop && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-mint-line rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                          {filteredInv.map((d: any) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => addItemToCart(d)}
                              className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg transition-colors text-start border-b border-mint-line last:border-0"
                            >
                              <span className="text-[15px] font-bold text-ink">
                                {d.name}
                              </span>
                              <span className="text-[13px] font-mono text-ink-soft">
                                {language === "en" ? "In Stock:" : "في المخزون:"} {formatQty(d.qty, d.units, language)}
                              </span>
                            </button>
                          ))}
                          {filteredInv.length === 0 && (
                            <div className="p-5 text-center">
                              <p className="text-[14px] text-ink-soft mb-3">
                                "{itemSearch}" غير موجود
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDrop(false);
                                  setNewItem({ ...newItem, name: itemSearch });
                                  setShowQuickAdd(true);
                                }}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-[14px] font-bold hover:opacity-90 transition-all"
                              >
                                + إضافته كصنف جديد
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={pullLowStock}
                      className="flex items-center gap-2 text-[14px] font-bold text-primary bg-primary-pale hover:bg-primary hover:text-white px-4 py-3 rounded-xl transition-all whitespace-nowrap"
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
                          strokeWidth="2.5"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {language === "en" ? "Fetch Shortages" : "جلب النواقص"}
                    </button>
                  </div>
                  <p className="text-[13px] text-ink-soft">
                    {cartItems.length} {language === "en" ? "items added • Click on item to edit quantity and price" : "صنف مضاف • اضغط على الصنف لتعديل الكمية والسعر"}

                  </p>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <div className="w-20 h-20 bg-bg rounded-3xl flex items-center justify-center mb-5 border border-mint-line">
                        <svg
                          className="w-10 h-10 text-ink-soft/50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <p className="text-[18px] font-black text-ink-soft">
                        {language === "en" ? "No items added yet" : "لم تضف أصنافاً بعد"}
                      </p>
                      <p className="text-[14px] text-ink-soft/70 mt-2">
                        {language === "en" ? "Search for an item above to add to the invoice" : "ابحث عن صنف في الأعلى لإضافته للفاتورة"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-transparent">
                      {cartItems.map((item, idx) => {
                        const hasParts = item.has_parts || false;
                        const hasSubparts = item.has_subparts || false;
                        const p1Name = item.part1_name || "شريط";
                        const p2Name = item.part2_name || "حبة";
                        const unitSize =
                          (hasParts ? item.part1_qty || 1 : 1) *
                          (hasParts && hasSubparts ? item.part2_qty || 1 : 1);
                        const effectiveQty = Math.round(item.qty * unitSize);
                        const upd = (field: string, val: any) =>
                          setCartItems((c) =>
                            c.map((i, j) => {
                              if (j !== idx) return i;
                              const n = { ...i, [field]: val };
                              if (
                                [
                                  "sell_price",
                                  "part1_qty",
                                  "part2_qty",
                                  "has_parts",
                                  "has_subparts",
                                ].includes(field)
                              ) {
                                if (n.has_parts && n.part1_qty > 0) {
                                  n.part1_price = Number(
                                    ((n.sell_price || 0) / n.part1_qty).toFixed(
                                      2,
                                    ),
                                  );
                                  if (n.has_subparts && n.part2_qty > 0) {
                                    n.part2_price = Number(
                                      (n.part1_price / n.part2_qty).toFixed(2),
                                    );
                                  }
                                }
                              }
                              return n;
                            }),
                          );

                        return (
                          <div
                            key={idx}
                            className={`px-6 py-6 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]"}`}
                          >
                            {/* Name + Delete */}
                            <div
                              className="flex items-center justify-between mb-6"
                              dir="rtl"
                            >
                              <span className="font-black text-[15px] text-ink">
                                {item.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCartItems((c) =>
                                    c.filter((_, j) => j !== idx),
                                  )
                                }
                                className="text-coral hover:bg-coral-pale p-1.5 rounded-lg transition-colors"
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
                                    strokeWidth="2.5"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>

                            {/* Base Qty & Price */}
                            <div
                              className="grid grid-cols-4 gap-4 items-end mb-5"
                              dir="rtl"
                            >
                              {/* الكمية */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                  {language === "en" ? "Quantity (Box)" : "الكمية (علبة)"}
                                </label>
                                <div className="flex items-center bg-white rounded-xl border border-[#CBD5E1] overflow-hidden w-full h-[42px]">
                                  <button
                                    type="button"
                                    onClick={() => upd("qty", item.qty + 1)}
                                    className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px] transition-colors"
                                  >
                                    +
                                  </button>
                                  <input
                                    type="number"
                                    value={item.qty ?? ""}
                                    onChange={(e) =>
                                      upd(
                                        "qty",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="flex-1 w-full text-center font-mono font-black text-[14px] text-ink outline-none border-x border-[#CBD5E1] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      upd("qty", Math.max(1, item.qty - 1))
                                    }
                                    className="w-10 h-full flex items-center justify-center text-ink-soft hover:bg-bg font-light text-[18px] transition-colors"
                                  >
                                    −
                                  </button>
                                </div>
                              </div>
                              {/* سعر الشراء */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                  {language === "en" ? "Purchase price (box)" : "سعر شراء العلبة"}
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.purchase_price ?? ""}
                                    onChange={(e) =>
                                      upd(
                                        "purchase_price",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">
                                    ₪
                                  </span>
                                </div>
                              </div>
                              {/* سعر البيع */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                  {language === "en" ? "Sale price (box)" : "سعر بيع العلبة"}
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.sell_price ?? ""}
                                    onChange={(e) =>
                                      upd(
                                        "sell_price",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono font-bold outline-none focus:border-primary text-center h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="absolute left-3 top-3 text-[12px] text-ink-soft font-bold">
                                    ₪
                                  </span>
                                </div>
                              </div>
                              {/* الإجمالي */}
                              <div>
                                <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                  {language === "en" ? "Total for boxes" : "الإجمالي للعلب"}
                                </label>
                                <div className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 text-[15px] font-mono font-black text-primary text-center h-[42px] flex items-center justify-center">
                                  ₪
                                  {(
                                    item.qty * (item.purchase_price || 0)
                                  ).toFixed(2)}
                                </div>
                              </div>
                            </div>

                            {/* Parts Toggle Area */}
                            <div
                              className="border border-ink-soft/30 rounded-2xl p-4 mb-4 bg-white"
                              dir="rtl"
                            >
                              <label className="flex items-center justify-start gap-3 cursor-pointer group">
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${hasParts ? "bg-ink border-ink" : "bg-white border-[#CBD5E1]"}`}
                                >
                                  {hasParts && (
                                    <svg
                                      className="w-3.5 h-3.5 text-white"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="4"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-[13px] font-bold text-ink">
                                  {language === "en" ? "Sold in parts (strips/pills)?" : "يُباع بالأجزاء (أشرطة / حبات)؟"}
                                </span>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={hasParts}
                                  onChange={(e) =>
                                    upd("has_parts", e.target.checked)
                                  }
                                />
                              </label>

                              {hasParts && (
                                <div className="mt-4 pt-4 border-t border-ink-soft/30">
                                  <h4 className="text-[12px] font-bold text-ink-soft mb-4 text-start">
                                    {language === "en" ? "First part (e.g. strip)" : "الجزء الأول (مثال: شريط)"}
                                  </h4>
                                  <div className="flex flex-wrap gap-4 mb-5">
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                        {language === "en" ? "Part name" : "اسم الجزء"}
                                      </label>
                                      <select
                                        value={p1Name}
                                        onChange={(e) =>
                                          upd("part1_name", e.target.value)
                                        }
                                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary text-start h-[40px]"
                                      >
                                        <option value="شريط">{language === "en" ? "Strip" : "شريط"}</option>
                                        <option value="أمبولة">{language === "en" ? "Ampoule" : "أمبولة"}</option>
                                        <option value="مغلف">{language === "en" ? "Sachet" : "مغلف"}</option>
                                        <option value="قطرة">{language === "en" ? "Drop" : "قطرة"}</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[110px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                        {language === "en" ? `How many ${tName(p1Name)}s in a box?` : `كم ${p1Name} في العلبة؟`}
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.part1_qty ?? ""}
                                        onChange={(e) =>
                                          upd(
                                            "part1_qty",
                                            parseInt(e.target.value) || 1,
                                          )
                                        }
                                        className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                        {language === "en" ? `Price per ${tName(p1Name)}` : `سعر الـ ${p1Name}`}
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={item.part1_price ?? ""}
                                          onChange={(e) =>
                                            upd(
                                              "part1_price",
                                              parseFloat(e.target.value) || 0,
                                            )
                                          }
                                          className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="absolute left-3 top-2.5 text-[11px] text-ink-soft font-bold">
                                          ₪
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <label className="flex items-center justify-start gap-3 cursor-pointer group mt-2">
                                    <div
                                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${hasSubparts ? "bg-ink border-ink" : "bg-white border-[#CBD5E1]"}`}
                                    >
                                      {hasSubparts && (
                                        <svg
                                          className="w-3.5 h-3.5 text-white"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="4"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span className="text-[12px] font-bold text-ink">
                                      {language === "en" ? `Is ${tName(p1Name)} sold in smaller parts?` : `هل يباع الـ ${p1Name} مجزأ؟ (مثال: حبة)`}
                                    </span>
                                    <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={hasSubparts}
                                      onChange={(e) =>
                                        upd("has_subparts", e.target.checked)
                                      }
                                    />
                                  </label>

                                  {hasSubparts && (
                                    <div className="mt-4 pt-4 border-t border-ink-soft/30 flex flex-wrap gap-4">
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">{language === "en" ? "Part name" : "اسم الجزء"}</label>
                                        <select
                                          value={p2Name}
                                          onChange={(e) =>
                                            upd("part2_name", e.target.value)
                                          }
                                          className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[13px] font-bold text-ink outline-none focus:border-primary text-start h-[40px]"
                                        >
                                          <option value="حبة">{language === "en" ? "Pill" : "حبة"}</option>
                                          <option value="مل">{language === "en" ? "ml" : "مل"}</option>
                                          <option value="غرام">{language === "en" ? "Gram" : "غرام"}</option>
                                        </select>
                                      </div>
                                      <div className="flex-1 min-w-[110px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                          {language === "en" ? `How many ${tName(p2Name)}s in a ${tName(p1Name)}?` : `كم ${p2Name} في الـ ${p1Name}؟`}
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          value={item.part2_qty ?? ""}
                                          onChange={(e) =>
                                            upd(
                                              "part2_qty",
                                              parseInt(e.target.value) || 1,
                                            )
                                          }
                                          className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-[100px]">
                                        <label className="block text-[11px] font-bold text-ink-soft mb-2 text-start">
                                          {language === "en" ? `Price per ${tName(p2Name)}` : `سعر الـ ${p2Name}`}
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="number"
                                            step="0.01"
                                            value={item.part2_price ?? ""}
                                            onChange={(e) =>
                                              upd(
                                                "part2_price",
                                                parseFloat(e.target.value) || 0,
                                              )
                                            }
                                            className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-[14px] font-mono outline-none focus:border-primary text-center h-[40px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <span className="absolute left-3 top-2.5 text-[11px] text-ink-soft font-bold">
                                            ₪
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Effective Qty badge */}
                            <div className="flex justify-start" dir="rtl">
                              <div className="bg-[#F8FAFC] text-ink px-4 py-2.5 rounded-full border border-ink-soft/30 text-[12px] font-bold inline-flex items-center gap-2">
                                📦 {language === "en" ? "Will be added to stock:" : "سيتم إضافة للمخزون:"} {" "}
                                <span className="font-mono text-[14px] font-black">
                                  {effectiveQty}
                                </span>{" "}
                                {hasParts
                                  ? hasSubparts
                                    ? p2Name
                                    : p1Name
                                  : "علبة"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-mint-line bg-white flex gap-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-primary text-white font-black py-4 text-[16px] rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_8px_16px_rgba(20,184,166,0.25)] flex items-center justify-center gap-2"
              >
                {loading
                  ? "جاري الحفظ..."
                  : form.status === "draft"
                    ? (language === "en" ? "💾 Save as Draft" : "💾 حفظ كطلبية مبدئية")
                    : (language === "en" ? "✅ Save and Enter to Stock" : "✅ حفظ وإدخال للمخزون")}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-8 py-4 bg-bg text-ink text-[16px] font-bold rounded-2xl hover:bg-mint-line transition-all"
              >
                {language === "en" ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
          {showDrop && (
            <div
              className="absolute inset-0 z-[5]"
              onClick={() => setShowDrop(false)}
            />
          )}
        </div>
      )}

      {/* ===== Quick Add Item Modal ===== */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setShowQuickAdd(false)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-mint-line z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-mint-line bg-white shrink-0">
              <div>
                <h3 className="text-[17px] font-black text-ink">
                  تعريف صنف جديد
                </h3>
                <p className="text-[11px] text-ink-soft">
                  سيُضاف للمخزون وللفاتورة معاً
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line text-ink-soft transition-colors"
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
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
              dir="rtl"
            >
              {/* اسم الصنف */}
              <div>
                <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                  اسم الصنف <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  autoFocus
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[14px] font-bold outline-none focus:border-primary transition-colors text-start"
                  placeholder="مثال: أموكسيل 500"
                />
              </div>

              {/* الشركة المصنعة + الفئة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    الشركة المصنّعة
                  </label>
                  <input
                    type="text"
                    value={newItem.scientificName}
                    onChange={(e) =>
                      setNewItem({ ...newItem, scientificName: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors text-start"
                    placeholder="مثال: Pfizer"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    الفئة العلاجية
                  </label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors text-start"
                    placeholder="مثال: مضاد حيوي"
                  />
                </div>
              </div>

              {/* سعر الشراء + سعر البيع + الكمية الدنيا */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    سعر الشراء (₪)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price_buy}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price_buy: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    سعر البيع (₪) <span className="text-coral">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price_sell}
                    onChange={(e) =>
                      setNewItem({ ...newItem, price_sell: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    الحد الأدنى
                  </label>
                  <input
                    type="number"
                    value={newItem.minQty}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minQty: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-center"
                    placeholder="5"
                  />
                </div>
              </div>

              {/* تاريخ الصلاحية + رقم الدفعة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    تاريخ الصلاحية
                  </label>
                  <input
                    type="date"
                    value={newItem.expiry}
                    onChange={(e) =>
                      setNewItem({ ...newItem, expiry: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-bold outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-black text-ink-soft mb-1.5">
                    الباركود
                  </label>
                  <input
                    type="text"
                    value={newItem.barcode}
                    onChange={(e) =>
                      setNewItem({ ...newItem, barcode: e.target.value })
                    }
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-2.5 text-[13px] font-mono font-bold outline-none focus:border-primary transition-colors text-start"
                    placeholder={language === "en" ? "Optional" : "اختياري"}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-mint-line bg-bg shrink-0">
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={loading}
                className="w-full bg-primary text-white font-black py-3 rounded-2xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/20 transition-all text-[15px]"
              >
                {loading
                  ? "جاري الإضافة..."
                  : "✅ إضافة للمخزون وإدراج بالفاتورة"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Preview Modal ===== */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setShowPreview(null)}
          />
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-mint-line z-10 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-mint-line">
              <h3 className="text-[18px] font-black text-ink">
                {language === "en" ? "Invoice Preview" : "معاينة الفاتورة"}
              </h3>
              <button
                onClick={() => setShowPreview(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-bg hover:bg-mint-line transition-colors text-ink-soft"
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
            <div className="flex-1 overflow-y-auto px-6 py-5" id="print-area">
              <div className="text-center mb-6 pb-5 border-b-2 border-dashed border-mint-line">
                <div className="w-16 h-16 bg-primary-pale rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-[22px] font-black text-ink">
                  {showPreview.supplier_name || language === "en" ? "No Supplier" : "بدون مورد"}
                </h2>
                {showPreview.invoice_number && (
                  <p className="text-[14px] font-mono text-ink-soft mt-1">
                    {language === "en" ? "Invoice No:" : "رقم الفاتورة:"} {showPreview.invoice_number}
                  </p>
                )}
                <p className="text-[13px] text-ink-soft mt-1">
                  {new Date(showPreview.date).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="mt-3">
                  <StatusBadge inv={showPreview} />
                </div>
              </div>
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-mint-line">
                    <th className="pb-2 text-[13px] font-black text-ink-soft">
                      الصنف
                    </th>
                    <th className="pb-2 text-[13px] font-black text-ink-soft text-center">
                      الكمية
                    </th>
                    <th className="pb-2 text-[13px] font-black text-ink-soft text-start">
                      السعر
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-line">
                  {parseItems(showPreview.items).map(
                    (item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3 text-[14px] font-bold text-ink">
                          {item.name}
                        </td>
                        <td className="py-3 text-[14px] font-mono text-center text-ink">
                          {item.qty}
                        </td>
                        <td className="py-3 text-[14px] font-mono font-bold text-ink text-start">
                          ₪{(item.purchase_price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <div className="mt-4 pt-4 border-t-2 border-dashed border-mint-line space-y-2">
                <div className="flex justify-between">
                  <span className="text-[16px] font-black text-ink">
                    {language === "en" ? "Grand Total" : "الإجمالي الكلي"}
                  </span>
                  <span className="text-[22px] font-mono font-black text-primary">
                    ₪{(showPreview.total_cost || 0).toFixed(2)}
                  </span>
                </div>
                {(showPreview.paid_amount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[14px] font-bold text-ink-soft">
                      المدفوع
                    </span>
                    <span className="text-[14px] font-mono font-bold text-teal">
                      ₪{(showPreview.paid_amount || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                {(showPreview.remaining || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[14px] font-bold text-ink-soft">
                      {language === "en" ? "Remaining" : "المتبقي"}
                    </span>
                    <span className="text-[14px] font-mono font-bold text-coral">
                      ₪{(showPreview.remaining || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-mint-line flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("print-area");
                  if (el) {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(
                        `<html dir="rtl"><head><style>body{font-family:Arial;padding:20px;direction:rtl} table{width:100%;border-collapse:collapse} td,th{padding:8px;border-bottom:1px solid #eee}</style></head><body>${el.innerHTML}</body></html>`,
                      );
                      w.document.close();
                      w.print();
                    }
                  }
                }}
                className="flex-1 bg-primary text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                {language === "en" ? "Print Invoice" : "طباعة الفاتورة"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const html2pdf = (await import("html2pdf.js")).default;
                    const el = pdfRef.current;
                    if (el) {
                      const opt = {
                        margin: 0,
                        filename: `فاتورة-${showPreview.id}.pdf`,
                        image: { type: "jpeg" as const, quality: 0.98 },
                        html2canvas: { scale: 2 },
                        jsPDF: {
                          unit: "mm",
                          format: "a4",
                          orientation: "portrait" as const,
                        },
                      };
                      html2pdf().from(el).set(opt).save();
                    }
                  } catch (e) {
                    console.error("PDF error", e);
                  }
                }}
                className="flex-1 bg-teal text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md shadow-teal/20"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {language === "en" ? "Download PDF" : "تنزيل PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden A4 Template for PDF */}
      {(pdfInvoice || showPreview) && (
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <div
            ref={pdfRef}
            style={{
              width: "800px",
              padding: "40px",
              backgroundColor: "white",
              color: "black",
              direction: "rtl",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid #14b8a6",
                paddingBottom: "20px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {(pdfInvoice || showPreview).status === "completed"
                    ? language === "en" ? "Purchase Invoice" : "فاتورة مشتريات"
                    : language === "en" ? "Purchase Order (Draft)" : "طلب شراء مبدئي"}
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    marginTop: "8px",
                  }}
                >
                  {language === "en" ? "Invoice No:" : "رقم الفاتورة:"}{" "}
                  {(pdfInvoice || showPreview).invoice_number ||
                    (pdfInvoice || showPreview).id}
                </p>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  {language === "en" ? "Date:" : "التاريخ:"}{" "}
                  {new Date(
                    (pdfInvoice || showPreview).date,
                  ).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div style={{ textAlign: "left" }}>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "bold",
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  {(pdfInvoice || showPreview).status === "completed"
                    ? language === "en" ? "Invoice from:" : "فاتورة قادمة من:"
                    : language === "en" ? "Invoice to:" : "فاتورة إلى:"}
                </h2>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    margin: "4px 0 0 0",
                    color: "#14b8a6",
                  }}
                >
                  {(pdfInvoice || showPreview).supplier_name || language === "en" ? "No Supplier" : "بدون مورد"}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    marginTop: "4px",
                    maxWidth: "200px",
                  }}
                >
                  {(pdfInvoice || showPreview).status === "completed"
                    ? language === "en" ? "This invoice documents the receipt of medicines from the mentioned supplier and their actual entry into the inventory." : "هذه الفاتورة توثق استلام أدوية من المورد المذكور وإدخالها للمخزون بشكل فعلي."
                    : language === "en" ? "This is a draft purchase order directed to the mentioned supplier to prepare the order." : "هذا طلب شراء مبدئي موجه للمورد المذكور لتجهيز الطلبية."}
                </p>
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "30px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f1f5f9",
                    borderBottom: "2px solid #cbd5e1",
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    الرقم
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    الصنف
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    الكمية
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    السعر الإفرادي
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontSize: "14px",
                      color: "#334155",
                    }}
                  >
                    الإجمالي
                  </th>
                </tr>
              </thead>
              <tbody>
                {parseItems((pdfInvoice || showPreview).items).map(
                  (item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          fontSize: "14px",
                          color: "#475569",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "right",
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: "#0f172a",
                        }}
                      >
                        {item.name}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontSize: "14px",
                          color: "#475569",
                        }}
                      >
                        {item.qty}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          fontSize: "14px",
                          color: "#475569",
                        }}
                      >
                        <span
                          dir="ltr"
                          style={{ display: "inline-block", direction: "ltr" }}
                        >
                          ₪ {(item.purchase_price || 0).toFixed(2)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: "#0f172a",
                        }}
                      >
                        <span
                          dir="ltr"
                          style={{ display: "inline-block", direction: "ltr" }}
                        >
                          ₪{" "}
                          {(
                            (item.purchase_price || 0) * (item.qty || 1)
                          ).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                direction: "ltr",
              }}
            >
              <div
                style={{
                  width: "350px",
                  backgroundColor: "#f8fafc",
                  padding: "24px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  direction: "rtl",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      color: "#475569",
                      fontWeight: "bold",
                    }}
                  >
                    {language === "en" ? "Grand Total" : "الإجمالي الكلي"}:
                  </span>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "900",
                      color: "#0f172a",
                    }}
                  >
                    <span
                      dir="ltr"
                      style={{ display: "inline-block", direction: "ltr" }}
                    >
                      ₪{" "}
                      {((pdfInvoice || showPreview).total_cost || 0).toFixed(2)}
                    </span>
                  </span>
                </div>
                {((pdfInvoice || showPreview).paid_amount || 0) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <span style={{ fontSize: "15px", color: "#475569" }}>
                      {language === "en" ? "Paid:" : "المدفوع:"}
                    </span>
                    <span
                      style={{
                        fontSize: "16px",
                        color: "#10b981",
                        fontWeight: "bold",
                      }}
                    >
                      <span
                        dir="ltr"
                        style={{ display: "inline-block", direction: "ltr" }}
                      >
                        ₪{" "}
                        {((pdfInvoice || showPreview).paid_amount || 0).toFixed(
                          2,
                        )}
                      </span>
                    </span>
                  </div>
                )}
                {((pdfInvoice || showPreview).remaining || 0) > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      borderTop: "1px solid #cbd5e1",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#ef4444",
                      }}
                    >
                      {language === "en" ? "Remaining (Debt):" : "المتبقي (دين):"}
                    </span>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "black",
                        color: "#ef4444",
                      }}
                    >
                      <span
                        dir="ltr"
                        style={{ display: "inline-block", direction: "ltr" }}
                      >
                        ₪{" "}
                        {((pdfInvoice || showPreview).remaining || 0).toFixed(
                          2,
                        )}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "60px",
                textAlign: "center",
                fontSize: "13px",
                color: "#94a3b8",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "20px",
              }}
            >
              <p>{language === "en" ? "Thank you for doing business with us." : "شكراً لتعاملكم معنا."}</p>
              <p style={{ marginTop: "4px" }}>
                تم إصدار هذه الفاتورة من نظام روشتة لإدارة الصيدليات
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
