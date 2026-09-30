const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Add paid_amount to form state
const formStateRegex = /const \[form, setForm\] = useState\(\{ supplier_id: "", supplier_name: "", invoice_number: "", notes: "", branch_id: "all", status: "completed" \}\);/;
if (formStateRegex.test(code)) {
  code = code.replace(formStateRegex, 'const [form, setForm] = useState({ supplier_id: "", supplier_name: "", invoice_number: "", notes: "", branch_id: "all", status: "completed", paid_amount: "" });');
  console.log('Fixed form state initialization');
} else {
  // Try loose match
  const looseForm = /const \[form, setForm\] = useState\(\{[\s\S]*?status: "completed" \}\);/;
  if(looseForm.test(code)){
      code = code.replace(looseForm, (m) => m.replace('status: "completed"', 'status: "completed", paid_amount: ""'));
      console.log('Fixed form state initialization (loose)');
  } else {
    // Maybe it has inv.status due to my previous fix? Oh wait, I replaced it BACK to "completed" in `fix_ts_error.js`
    console.log('Could not find form state initialization');
  }
}

// 2. Add paid_amount to handleEditDraft
const handleEditRegex = /const handleEditDraft = \(inv: any\) => \{[\s\S]*?branch_id: inv\.branch_id \|\| "all",\r?\n\s*status: inv\.status \|\| "completed"\r?\n\s*\}\);/;
if(handleEditRegex.test(code)) {
  code = code.replace(handleEditRegex, (match) => match.replace('status: inv.status || "completed"', 'status: inv.status || "completed",\n        paid_amount: inv.paid_amount || ""'));
  console.log('Fixed handleEditDraft');
} else {
  console.log('Could not find handleEditDraft');
}

// 3. Update handleSave to send paid_amount
const handleSaveRegex = /body: JSON\.stringify\(\{ \.\.\.form, items: cartItems, total_cost: cartTotal, paid_amount: 0 \}\)/;
if (handleSaveRegex.test(code)) {
  code = code.replace(handleSaveRegex, 'body: JSON.stringify({ ...form, items: cartItems, total_cost: cartTotal, paid_amount: form.paid_amount ? parseFloat(form.paid_amount as string) : 0 })');
  console.log('Fixed handleSave payload');
} else {
  console.log('Could not find handleSave payload');
}

// 4. Add the input field in the modal UI
const totalDivRegex = /<div className="flex justify-between items-center pt-2 border-t border-mint-line">\r?\n\s*<span className="font-bold text-ink-soft text-\[13px\]">الإجمالي:<\/span>\r?\n\s*<span className="font-mono font-black text-\[16px\] text-primary">₪\{cartTotal\.toFixed\(2\)\}<\/span>\r?\n\s*<\/div>/;
const totalDivNew = `<div className="flex justify-between items-center pt-2 border-t border-mint-line">
                      <span className="font-bold text-ink-soft text-[13px]">الإجمالي:</span>
                      <span className="font-mono font-black text-[16px] text-primary">₪{cartTotal.toFixed(2)}</span>
                    </div>
                    {form.status !== 'draft' && (
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-mint-line border-dashed">
                        <span className="font-bold text-ink-soft text-[13px]">المبلغ المدفوع (شيكل):</span>
                        <input type="number" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} className="w-32 bg-bg border border-mint-line rounded-xl px-3 py-1.5 text-[14px] outline-none focus:border-primary text-left font-mono font-bold" placeholder="0.00" />
                      </div>
                    )}`;

if(code.includes('الإجمالي:</span>')) {
  // Replace manually
  const parts = code.split('<span className="font-bold text-ink-soft text-[13px]">الإجمالي:</span>');
  if(parts.length > 1) {
    const endPart = parts[1].split('</div>');
    if(endPart.length > 1) {
      const replaced = '<span className="font-bold text-ink-soft text-[13px]">الإجمالي:</span>' + endPart[0] + '</div>' + 
      `\n                    {form.status !== 'draft' && (
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-mint-line border-dashed">
                        <span className="font-bold text-ink-soft text-[13px]">المبلغ المدفوع (شيكل):</span>
                        <input type="number" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} className="w-32 bg-bg border border-mint-line rounded-xl px-3 py-1.5 text-[14px] outline-none focus:border-primary text-left font-mono font-bold" placeholder="0.00" />
                      </div>
                    )}`;
      code = parts[0] + replaced + endPart.slice(1).join('</div>');
      console.log('Fixed UI total section');
    }
  }
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
