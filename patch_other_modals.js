const fs = require('fs');

// ==== SUPPLIERS ====
let c1 = fs.readFileSync('web/src/app/suppliers/page.tsx', 'utf8');
c1 = c1.replace(
  'import AppBar from "@/components/AppBar";',
  'import AppBar from "@/components/AppBar";\nimport ConfirmModal from "@/components/ConfirmModal";'
);
c1 = c1.replace(
  'const [selectedSupplier, setSelectedSupplier] = useState<any>(null);',
  'const [selectedSupplier, setSelectedSupplier] = useState<any>(null);\n  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);'
);
c1 = c1.replace(
  'const handleDelete = async (id: string) => {\n    if (!confirm(language === \'en\' ? \'Are you sure you want to delete this supplier?\' : "هل أنت متأكد من حذف هذا المورد؟")) return;',
  'const executeDelete = async (id: string) => {'
);
c1 = c1.replace(
  'onClick={() => handleDelete(supplier.id)}',
  'onClick={() => setDeleteTarget(supplier.id)}'
);
c1 = c1.replace(
  '<div className="flex-1 overflow-auto p-4 md:p-6 bg-bg">',
  `<div className="flex-1 overflow-auto p-4 md:p-6 bg-bg">
        <ConfirmModal
          isOpen={!!deleteTarget}
          title={language === "en" ? "Delete Supplier" : "حذف المورد"}
          message={language === "en" ? "Are you sure you want to delete this supplier? This action cannot be undone." : "هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء."}
          confirmText={language === "en" ? "Delete" : "حذف"}
          onConfirm={() => {
            if (deleteTarget) executeDelete(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />`
);
fs.writeFileSync('web/src/app/suppliers/page.tsx', c1, 'utf8');

// ==== BRANCHES ====
let c2 = fs.readFileSync('web/src/app/branches/page.tsx', 'utf8');
c2 = c2.replace(
  'import AppBar from "@/components/AppBar";',
  'import AppBar from "@/components/AppBar";\nimport ConfirmModal from "@/components/ConfirmModal";'
);
c2 = c2.replace(
  'const [editStaff, setEditStaff] = useState<any>(null);',
  'const [editStaff, setEditStaff] = useState<any>(null);\n  const [deleteStaffTarget, setDeleteStaffTarget] = useState<string | null>(null);'
);
c2 = c2.replace(
  'const handleDeleteStaff = async (id: string) => {\n    if (!confirm(language === \'en\' ? \'Are you sure you want to delete this staff member?\' : "هل أنت متأكد من حذف هذا الموظف؟")) return;',
  'const executeDeleteStaff = async (id: string) => {'
);
c2 = c2.replace(
  'onClick={() => handleDeleteStaff(s.id)}',
  'onClick={() => setDeleteStaffTarget(s.id)}'
);
c2 = c2.replace(
  '<div className="flex-1 overflow-auto p-4 md:p-6 bg-bg">',
  `<div className="flex-1 overflow-auto p-4 md:p-6 bg-bg">
        <ConfirmModal
          isOpen={!!deleteStaffTarget}
          title={language === "en" ? "Delete Staff Member" : "حذف الموظف"}
          message={language === "en" ? "Are you sure you want to delete this staff member?" : "هل أنت متأكد من حذف هذا الموظف؟"}
          confirmText={language === "en" ? "Delete" : "حذف"}
          onConfirm={() => {
            if (deleteStaffTarget) executeDeleteStaff(deleteStaffTarget);
            setDeleteStaffTarget(null);
          }}
          onCancel={() => setDeleteStaffTarget(null)}
        />`
);
fs.writeFileSync('web/src/app/branches/page.tsx', c2, 'utf8');
console.log('Patched Suppliers and Branches');
