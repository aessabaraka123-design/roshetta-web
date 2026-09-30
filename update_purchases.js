const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Update form state
code = code.replace(
  /const \[form, setForm\] = useState\(\{ supplier_id: "", supplier_name: "", invoice_number: "", notes: "", branch_id: "all" \}\);/,
  'const [form, setForm] = useState({ supplier_id: "", supplier_name: "", invoice_number: "", notes: "", branch_id: "all", status: "completed" });\n  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);'
);

// 2. Update handleSave body
const oldHandleSave = /const handleSave = async \(\) => \{[\s\S]*?finally \{ setLoading\(false\); \}\n  \};/;
const newHandleSave = `const handleSave = async () => {
    if (!form.supplier_name && !form.supplier_id) return toast.error("يرجى اختيار أو كتابة اسم المورد");
    if (cartItems.length === 0) return toast.error("الفاتورة فارغة");
    setLoading(true);
    try {
      if (editingDraftId) {
        // Delete the old draft before saving the completed one
        await fetch(\`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user?.pharmacy_id}/purchase-invoices/\${editingDraftId}\`, { method:"DELETE" });
      }
      const res = await fetch(\`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user?.pharmacy_id}/purchase-invoices\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: cartItems, total_cost: cartTotal, paid_amount: 0 })
      });
      const r = await res.json();
      if (r.success) { 
        toast.success(form.status === 'draft' ? "تم حفظ الفاتورة المبدئية!" : "تم حفظ الفاتورة وإضافتها للمخزون!"); 
        setShowAdd(false); 
        setEditingDraftId(null);
        setForm({ supplier_id:"", supplier_name:"", invoice_number:"", notes:"", branch_id: branchFilter, status: "completed" }); 
        setCartItems([]); 
        mutate(); 
      }
      else toast.error(r.error || "خطأ");
    } catch { toast.error("خطأ بالاتصال"); } finally { setLoading(false); }
  };`;
code = code.replace(oldHandleSave, newHandleSave);

// 3. Add handleEditDraft function and update add button logic
code = code.replace(
  /<button onClick=\{\(\) => setShowAdd\(true\)\} className="bg-primary/g,
  `const handleEditDraft = (inv: any) => {
    setForm({
      supplier_id: inv.supplier_id || "",
      supplier_name: inv.supplier_name || "",
      invoice_number: inv.invoice_number || "",
      notes: inv.notes || "",
      branch_id: inv.branch_id || "all",
      status: "completed" // default to completing it now
    });
    setCartItems(JSON.parse(inv.items || "[]"));
    setEditingDraftId(inv.id);
    setShowAdd(true);
  };
  
  return (
    // ...
    <button onClick={() => { setEditingDraftId(null); setForm({ supplier_id:"", supplier_name:"", invoice_number:"", notes:"", branch_id: branchFilter, status: "completed" }); setCartItems([]); setShowAdd(true); }} className="bg-primary`
);

// 4. Modify invoice item UI to handle drafts
const badgeRegex = /const getStatusBadge = \(inv: any\) => \{[\s\S]*?return <span className="px-2 py-1 rounded-lg text-\[11px\] font-bold bg-coral-pale text-coral">غير مدفوع<\/span>;\n  \};/;
const newBadge = `const getStatusBadge = (inv: any) => {
    if (inv.status === 'draft') return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-ink/10 text-ink-soft">فاتورة مبدئية (طلبية)</span>;
    if (inv.remaining <= 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-teal-pale text-teal">مدفوع</span>;
    if (inv.paid_amount > 0) return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-pale text-[#B9791C]">جزئي</span>;
    return <span className="px-2 py-1 rounded-lg text-[11px] font-bold bg-coral-pale text-coral">غير مدفوع</span>;
  };`;
code = code.replace(badgeRegex, newBadge);

// 5. Add "Enter to System" button for drafts, and hide pay button for drafts
const btnRegex = /<button \n\s*onClick=\{\(\) => setShowPayModal\(inv\)\}/g;
code = code.replace(btnRegex, `{inv.status === 'draft' ? (
                        <button onClick={() => handleEditDraft(inv)} className="px-3 py-1.5 rounded-lg bg-teal-pale text-teal text-[12px] font-bold hover:bg-teal hover:text-white transition">
                          إدخال للمخزون
                        </button>
                      ) : (
                        <button onClick={() => setShowPayModal(inv)}`);
const payRegex = /text-white transition">\n\s*سداد\n\s*<\/button>/g;
code = code.replace(payRegex, `text-white transition">سداد</button>\n                      )}`);

// 6. Add status selector in modal
const modalHeaderRegex = /<div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">\s*<h3 className="text-\[20px\] font-black text-primary">إضافة فاتورة مشتريات<\/h3>/g;
code = code.replace(modalHeaderRegex, `<div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
                <h3 className="text-[20px] font-black text-primary">{editingDraftId ? "إدخال فاتورة فعلية" : "إضافة فاتورة مشتريات"}</h3>`);

const notesFieldRegex = /<textarea placeholder="ملاحظات حول الفاتورة" value=\{form\.notes\} onChange=\{e => setForm\(\{ \.\.\.form, notes: e\.target\.value \}\)\} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-\[14px\] outline-none focus:border-primary h-20"><\/textarea>\n\s*<\/div>/g;
code = code.replace(notesFieldRegex, `<textarea placeholder="ملاحظات حول الفاتورة" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 text-[14px] outline-none focus:border-primary h-20"></textarea>
                </div>
                
                <div className="mb-4">
                  <label className="block text-[13px] font-bold text-ink-soft mb-2">نوع الفاتورة (مبدئية أم فعلية)</label>
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'completed' ? 'var(--primary)' : '', background: form.status === 'completed' ? 'var(--primary-pale)' : '' }}>
                      <input type="radio" name="status" checked={form.status === 'completed'} onChange={() => setForm({...form, status: 'completed'})} className="accent-primary" />
                      <div>
                        <div className="text-[14px] font-bold text-primary">فاتورة فعلية</div>
                        <div className="text-[11px] text-ink-soft">تضاف فوراً للمخزون وحساب المورد</div>
                      </div>
                    </label>
                    <label className="flex-1 flex items-center gap-2 p-3 border border-mint-line rounded-xl cursor-pointer hover:bg-bg transition" style={{ borderColor: form.status === 'draft' ? 'var(--coral)' : '', background: form.status === 'draft' ? 'var(--coral-pale)' : '' }}>
                      <input type="radio" name="status" checked={form.status === 'draft'} onChange={() => setForm({...form, status: 'draft'})} className="accent-coral" />
                      <div>
                        <div className="text-[14px] font-bold text-coral">فاتورة مبدئية (طلبية)</div>
                        <div className="text-[11px] text-ink-soft">حفظ فقط، لا تؤثر على المخزون الآن</div>
                      </div>
                    </label>
                  </div>
                </div>`);

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
console.log('Patched frontend!');
