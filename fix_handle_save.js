const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const start = code.indexOf('const handleSave = async () => {');
const finallyIdx = code.indexOf('finally { setLoading(false); }', start);
const end = code.indexOf('};', finallyIdx) + 2;

if (start !== -1 && end > finallyIdx) {
  const newHandleSave = `const handleSave = async () => {
    if (!form.supplier_name && !form.supplier_id) return toast.error("يرجى اختيار أو كتابة اسم المورد");
    if (cartItems.length === 0) return toast.error("الفاتورة فارغة");
    setLoading(true);
    try {
      if (editingDraftId) {
        await fetch(\`http://localhost:3001/api/pharmacies/\${user?.pharmacy_id}/purchase-invoices/\${editingDraftId}\`, { method:"DELETE" });
      }
      const res = await fetch(\`http://localhost:3001/api/pharmacies/\${user?.pharmacy_id}/purchase-invoices\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: cartItems, total_cost: cartTotal, paid_amount: 0 })
      });
      const r = await res.json();
      if (r.success) { 
        toast.success(form.status === 'draft' ? "تم حفظ الفاتورة المبدئية!" : "تم حفظ الفاتورة وتحديث المخزون!"); 
        setShowAdd(false); 
        setEditingDraftId(null);
        setForm({ supplier_id:"", supplier_name:"", invoice_number:"", notes:"", branch_id: branchFilter, status: "completed" }); 
        setCartItems([]); 
        mutate(); 
      }
      else toast.error(r.error || "فشل");
    } catch { toast.error("خطأ"); } finally { setLoading(false); }
  };`;
  
  code = code.substring(0, start) + newHandleSave + code.substring(end);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully replaced handleSave!');
} else {
  console.log('Could not find handleSave block.', start, finallyIdx, end);
}
