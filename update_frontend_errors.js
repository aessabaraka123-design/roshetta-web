const fs = require('fs');

// Fix add-item/page.tsx
let addItemCode = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');
addItemCode = addItemCode.replace(
  '      toast.error("حدث خطأ أثناء الإضافة");\n    }',
  '      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء الإضافة");\n    }'
);
fs.writeFileSync('web/src/app/add-item/page.tsx', addItemCode, 'utf8');
console.log("Updated add-item/page.tsx");

// Fix inventory/page.tsx
let inventoryCode = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');
inventoryCode = inventoryCode.replace(
  '      } else {\n        toast.error("حدث خطأ أثناء التعديل");\n      }',
  '      } else {\n        toast.error(result.error || "حدث خطأ أثناء التعديل");\n      }'
);
fs.writeFileSync('web/src/app/inventory/page.tsx', inventoryCode, 'utf8');
console.log("Updated inventory/page.tsx");
