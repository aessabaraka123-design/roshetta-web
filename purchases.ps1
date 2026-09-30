New-Item -ItemType Directory -Force -Path "web\src\app\purchases" | Out-Null; @'
"use client";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PurchasesPage() {
  const user = useStore(s => s.user);
  const router = useRouter();
  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const [showAdd, setShowAdd] = useState(false);
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ supplier_name:"", invoice_number:"", notes:"" });
  const [cartItems, setCartItems] = useState<any[]>([]);

  const { data: invoicesData, mutate } = useSWR(
    user ? `http://localhost:3001/api/pharmacies/${user.pharmacy_id}/purchase-invoices` : null, fetcher
  );
  const { data: inventoryData } = useSWR(
    user ? `http://localhost:3001/api/pharmacies/${user.pharmacy_id}/inventory` : null, fetcher
  );

  const invoices = invoicesData?.invoices || [];
  const inventory = inventoryData?.drugs || [];

  const totalCost = invoices.reduce((s: number, i: any) => s + (i.total_cost||0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paid_amount||0), 0);
  const totalRemaining = invoices.reduce((s: number, i: any) => s + (i.remaining||0), 0);

  const cartTotal = cartItems.reduce((s, i) => s + i.qty * i.purchase_price, 0);

  const addItemToCart = (drug: any) => {
    const existing = cartItems.find(i => i.id === drug.id);
    if (existing) setCartItems(c => c.map(i => i.id === drug.id ? {...i, qty: i.qty+1} : i));
    else setCartItems(c => [...c, { id: drug.id, name: drug.name, qty: 1, purchase_price: drug.buyPrice || 0 }]);
    setItemSearch(""); setShowItemDrop(false);
  };

  const handleSave = async () => {
    if (!form.supplier_name || cartItems.length === 0) { toast.error("أدخل اسم المورد وأضف أصناف"); return; }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/pharmacies/${user?.pharmacy_id}/purchase-invoices`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, items: cartItems, total_cost: cartTotal, paid_amount: 0 })
      });
      const r = await res.json();
      if (r.success) { toast.success("تم حفظ الفاتورة وتحديث المخزون!"); setShowAdd(false); setForm({ supplier_name:"", invoice_number:"", notes:"" }); setCartItems([]); mutate(); }
      else toast.error(r.error || "فشل");
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };

  const handlePay = async () => {
    if (!payAmount) { toast.error("أدخل المبلغ"); return; }
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/pharmacies/${user?.pharmacy_id}/purchase-invoices/${showPayModal.id}/pay`, {
        method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ payment: parseFloat(payAmount) })
      });
      const r = await res.json();
      if (r.success) { toast.success("تم تسجيل الدفعة!"); setShowPayModal(null); setPayAmount(""); mutate(); }
      else toast.error(r.error);
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الفاتورة؟")) return;
    const res = await fetch(`http://localhost:3001/api/pharmacies/${user?.pharmacy_id}/purchase-invoices/${id}`, { method:"DELETE" });
    const r = await res.json();
    if (r.success) { toast.success("تم الحذف"); mutate(); } else toast.error(r.error);
  };

  const filteredInv = inventory.filter((d: any) => d.name?.includes(itemSearch)).slice(0,6);

  const getStatusBadge = (inv: any) => {
    if (inv.remaining <= 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-teal-pale text-teal">مسدد</span>;
    if (inv.paid_amount > 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-pale text-[#B9791C]">جزئي</span>;
    return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-coral-pale text-coral">غير مسدد</span>;
  };

  return (
    <>
      <AppBar title="فواتير المشتريات" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">إجمالي الفواتير</div>
            <div className="text-[28px] font-mono font-black text-primary">{invoices.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-mint-line p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-ink-soft mb-1">إجمالي المشتريات</div>
            <div className="text-[28px] font-mono font-black text-ink">₪{totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-teal-pale/30 rounded-2xl border border-teal-pale p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-teal mb-1">المدفوع</div>
            <div className="text-[28px] font-mono font-black text-teal">₪{totalPaid.toFixed(2)}</div>
          </div>
          <div className="bg-coral-pale/30 rounded-2xl border border-coral-pale p-5 text-center shadow-sm">
            <div className="text-[12px] font-bold text-coral mb-1">المتبقي للموردين</div>
            <div className="text-[28px] font-mono font-black text-coral">₪{totalRemaining.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-5 py-3 rounded-xl font-bold text-[14px] shadow-md shadow-primary/20 hover:opacity-90">+ فاتورة شراء جديدة</button>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center">
            <div className="text-[40px] mb-3">🧾</div>
            <div className="text-ink-soft font-bold">لا توجد فواتير مشتريات بعد</div>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="bg-white rounded-2xl border border-mint-line p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-black text-[16px] text-ink">{inv.supplier_name}</span>
                      {getStatusBadge(inv)}
                      {inv.invoice_number && <span className="text-[12px] font-mono text-ink-soft">#{inv.invoice_number}</span>}
                    </div>
                    <div className="text-[12px] text-ink-soft">{new Date(inv.date).toLocaleString("ar-EG")}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-[22px] font-mono font-black text-ink">₪{(inv.total_cost||0).toFixed(2)}</div>
                    {inv.remaining > 0 && <div className="text-[12px] text-coral font-bold">متبقي: ₪{inv.remaining.toFixed(2)}</div>}
                  </div>
                </div>
                <div className="bg-bg rounded-xl p-3 mb-3">
                  <div className="text-[12px] font-bold text-ink-soft mb-2">الأصناف:</div>
                  <div className="flex flex-wrap gap-2">
                    {(inv.items||[]).map((item: any, i: number) => (
                      <span key={i} className="bg-white border border-mint-line rounded-lg px-2 py-1 text-[12px] font-semibold">
                        {item.name} × {item.qty}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {inv.remaining > 0 && (
                    <button onClick={() => setShowPayModal(inv)} className="px-4 py-2 bg-teal text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">تسديد دفعة</button>
                  )}
                  <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Invoice Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl border border-mint-line max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">فاتورة شراء جديدة</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 bg-bg rounded-full text-ink-soft hover:text-coral">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">اسم المورد *</label>
                  <input type="text" value={form.supplier_name} onChange={e => setForm(p => ({...p, supplier_name:e.target.value}))}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary" placeholder="شركة الدواء..." />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-ink-soft mb-1.5">رقم الفاتورة</label>
                  <input type="text" value={form.invoice_number} onChange={e => setForm(p => ({...p, invoice_number:e.target.value}))}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary" placeholder="اختياري" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">إضافة أصناف *</label>
                <div className="relative">
                  <input type="text" value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDrop(true); }} onFocus={() => setShowItemDrop(true)}
                    className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary" placeholder="ابحث عن دواء لإضافته..." />
                  {showItemDrop && itemSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mint-line rounded-xl shadow-lg z-50 max-h-36 overflow-y-auto">
                      {filteredInv.map((d: any) => (
                        <div key={d.id} onClick={() => addItemToCart(d)} className="p-3 hover:bg-bg cursor-pointer border-b border-mint-line last:border-0 text-[14px] font-semibold">{d.name}</div>
                      ))}
                      {filteredInv.length === 0 && <div className="p-3 text-ink-soft text-center text-[13px]">لا نتائج</div>}
                    </div>
                  )}
                </div>
              </div>

              {cartItems.length > 0 && (
                <div className="bg-bg rounded-xl p-3 space-y-2">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-mint-line">
                      <span className="flex-1 font-bold text-[13px]">{item.name}</span>
                      <input type="number" value={item.qty} min="1" onChange={e => setCartItems(c => c.map((i,j) => j===idx ? {...i, qty:parseInt(e.target.value)||1} : i))}
                        className="w-16 bg-bg border border-mint-line rounded-lg px-2 py-1 text-center text-[13px] font-mono outline-none" />
                      <span className="text-[12px] text-ink-soft">×</span>
                      <input type="number" step="0.01" value={item.purchase_price} onChange={e => setCartItems(c => c.map((i,j) => j===idx ? {...i, purchase_price:parseFloat(e.target.value)||0} : i))}
                        className="w-20 bg-bg border border-mint-line rounded-lg px-2 py-1 text-center text-[13px] font-mono outline-none" />
                      <span className="text-[12px] text-ink-soft">₪</span>
                      <button onClick={() => setCartItems(c => c.filter((_,j) => j!==idx))} className="text-coral p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-mint-line">
                    <span className="font-bold text-ink-soft text-[13px]">الإجمالي:</span>
                    <span className="font-mono font-black text-[16px] text-primary">₪{cartTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={loading} className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:opacity-90 disabled:opacity-50">
                {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line">إلغاء</button>
            </div>
          </div>
          {showItemDrop && <div className="fixed inset-0 z-40" onClick={() => setShowItemDrop(false)} />}
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-mint-line">
            <h3 className="text-[20px] font-black text-primary mb-5 border-b border-mint-line pb-4">تسديد دفعة للمورد</h3>
            <div className="space-y-4">
              <div className="bg-bg rounded-xl p-3 flex justify-between">
                <span className="text-[13px] font-bold text-ink-soft">المتبقي:</span>
                <span className="font-mono font-black text-coral">₪{(showPayModal.remaining||0).toFixed(2)}</span>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-ink-soft mb-1.5">المبلغ المدفوع (₪)</label>
                <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[18px] font-mono outline-none focus:border-teal" autoFocus />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handlePay} disabled={loading} className="flex-1 bg-teal text-white font-bold py-3.5 rounded-xl hover:opacity-90 disabled:opacity-50">تأكيد</button>
              <button onClick={() => setShowPayModal(null)} className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
'@ | Out-File -FilePath "web\src\app\purchases\page.tsx" -Encoding UTF8