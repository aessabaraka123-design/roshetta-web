const fs = require('fs');

// 1. admin/page.tsx
let f = 'web/src/app/admin/page.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/user\.name/g, '(user as any)?.name');
c = c.replace(/user\.role/g, '(user as any)?.role');
c = c.replace(/user\./g, 'user?.');
fs.writeFileSync(f, c, 'utf8');

// 2. login/page.tsx
f = 'web/src/app/login/page.tsx';
c = fs.readFileSync(f, 'utf8');
// remove width and height props from RoshettaLogo
c = c.replace(/<RoshettaLogo width=\{[0-9]+\} height=\{[0-9]+\} \/>/g, '<RoshettaLogo />');
fs.writeFileSync(f, c, 'utf8');

// 3. pos/page.tsx
f = 'web/src/app/pos/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/catch \(error\) \{/g, 'catch (error: any) {');
fs.writeFileSync(f, c, 'utf8');

// 4. prescriptions/page.tsx
f = 'web/src/app/prescriptions/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/\(p\) =>/g, '(p: any) =>');
c = c.replace(/\(prx\) =>/g, '(prx: any) =>');
fs.writeFileSync(f, c, 'utf8');

// 5. purchases/page.tsx
f = 'web/src/app/purchases/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/orientation: "portrait"/g, 'orientation: "portrait" as const');
c = c.replace(/orientation: "landscape"/g, 'orientation: "landscape" as const');
fs.writeFileSync(f, c, 'utf8');

// 6. receipt-upload/page.tsx
f = 'web/src/app/receipt-upload/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/<RoshettaLogo size=\{[0-9]+\} \/>/g, '<RoshettaLogo />');
fs.writeFileSync(f, c, 'utf8');

// 7. reports/page.tsx
f = 'web/src/app/reports/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/formatter=\{\(val\) =>/g, 'formatter={(val: any) =>');
fs.writeFileSync(f, c, 'utf8');

// 8. sales/page.tsx
f = 'web/src/app/sales/page.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/\(sale\) =>/g, '(sale: any) =>');
fs.writeFileSync(f, c, 'utf8');

// 9. Sidebar.tsx
f = 'web/src/components/Sidebar.tsx';
c = fs.readFileSync(f, 'utf8');
c = c.replace(/\(item\) =>/g, '(item: any) =>');
fs.writeFileSync(f, c, 'utf8');

console.log('Fixed TS errors');
