const fs = require('fs');
let c = fs.readFileSync('web/src/app/my-subscription/page.tsx', 'utf8');

c = c.replace(
  'onClick={() => {\n                toast.success(\n                  language === "en"\n                    ? "Your subscription has been successfully renewed for the next year!"\n                    : "تم تجديد اشتراكك بنجاح للعام القادم!"\n                );\n              }}',
  'onClick={() => router.push("/receipt-upload")}'
);

fs.writeFileSync('web/src/app/my-subscription/page.tsx', c, 'utf8');
console.log('Fixed Renew button in my-subscription');
