const fs = require('fs');

let c = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');
c = c.replace(/<span>[\s\S]*?<\/span>/, '<span>{language === "en" ? "App in Read-Only mode. Awaiting admin approval. Please check your receipt." : "التطبيق في وضع القراءة فقط، انتظار موافقة المسؤول على تأكيد الاشتراك راجع إيصالك."}</span>');
c = c.replace(/>رفع إيصال الدفع</, '>{language === "en" ? "Upload Receipt" : "رفع إيصال الدفع"}<');
fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', c, 'utf8');

c = fs.readFileSync('web/src/components/SearchBar.tsx', 'utf8');
c = c.replace(/placeholder="ابحث\.\.\."/, 'placeholder={language === "en" ? "Search..." : "ابحث..."}');
fs.writeFileSync('web/src/components/SearchBar.tsx', c, 'utf8');

c = fs.readFileSync('web/src/components/Sidebar.tsx', 'utf8');
c = c.replace(/>صيدلي أول</g, '>{language === "en" ? "Senior Pharmacist" : "صيدلي أول"}<');
fs.writeFileSync('web/src/components/Sidebar.tsx', c, 'utf8');

c = fs.readFileSync('web/src/components/SocketProvider.tsx', 'utf8');
c = c.replace(/"تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل"/g, 'language === "en" ? "Subscription activated successfully. You can now use the full system." : "تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل"');
fs.writeFileSync('web/src/components/SocketProvider.tsx', c, 'utf8');

c = fs.readFileSync('web/src/store/index.ts', 'utf8');
c = c.replace(/"علبة"/g, '"Box"');
fs.writeFileSync('web/src/store/index.ts', c, 'utf8');

console.log('Fixed');
