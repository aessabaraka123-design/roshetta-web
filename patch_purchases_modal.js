const fs = require('fs');
let c = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// 1. Import ConfirmModal
c = c.replace(
  'import AppBar from "@/components/AppBar";',
  'import AppBar from "@/components/AppBar";\nimport ConfirmModal from "@/components/ConfirmModal";'
);

// 2. Add state
c = c.replace(
  'const [loading, setLoading] = useState(false);',
  'const [loading, setLoading] = useState(false);\n  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);'
);

// 3. Update handleDelete
c = c.replace(
  'const handleDelete = async (id: string) => {\n    if (!confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) return;',
  'const executeDelete = async (id: string) => {'
);

// 4. Update the onClick
c = c.replace(
  'onClick={() => handleDelete(inv.id)}',
  'onClick={() => setDeleteTarget(inv.id)}'
);

// 5. Inject ConfirmModal into JSX
// We'll put it right after <div className="flex-1 overflow-auto p-4 md:p-6 bg-[#F8FAFC]">
c = c.replace(
  '<div className="flex-1 overflow-auto p-4 md:p-6 bg-[#F8FAFC]">',
  `<div className="flex-1 overflow-auto p-4 md:p-6 bg-[#F8FAFC]">
        <ConfirmModal
          isOpen={!!deleteTarget}
          title={language === "en" ? "Delete Invoice" : "حذف الفاتورة"}
          message={language === "en" ? "Are you sure you want to delete this invoice? This action cannot be undone." : "هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."}
          confirmText={language === "en" ? "Delete" : "حذف"}
          onConfirm={() => {
            if (deleteTarget) executeDelete(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />`
);

fs.writeFileSync('web/src/app/purchases/page.tsx', c, 'utf8');
console.log('Patched Purchases Page for ConfirmModal');
