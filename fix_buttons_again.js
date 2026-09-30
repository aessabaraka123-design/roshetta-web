const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /<div className="flex gap-2">[\s\S]*?setShowPreviewModal[\s\S]*?handleDelete[\s\S]*?<\/div>/;

const newButtons = `<div className="flex gap-2">
                    <button onClick={() => handleEditDraft(inv)} className="px-4 py-2 bg-primary text-white rounded-xl text-[13px] font-bold hover:opacity-90 transition-all">
                      {inv.status === 'draft' ? 'إدخال للمخزون' : 'تعديل الفاتورة'}
                    </button>
                    <button onClick={() => setShowPreviewModal(inv)} className="px-4 py-2 bg-bg text-primary rounded-xl text-[13px] font-bold hover:bg-primary-pale transition-all">معاينة</button>
                    <button onClick={() => handleDelete(inv.id)} className="px-4 py-2 bg-bg text-coral rounded-xl text-[13px] font-bold hover:bg-coral hover:text-white transition-all">حذف</button>
                  </div>`;

if (regex.test(code)) {
  code = code.replace(regex, newButtons);
  fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
  console.log('Successfully replaced buttons!');
} else {
  console.log('Failed to match action buttons');
}
