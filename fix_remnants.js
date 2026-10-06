const fs = require('fs');

function replaceFile(path, replacements) {
  if (!fs.existsSync(path)) return;
  let c = fs.readFileSync(path, 'utf8');
  let original = c;
  for (let r of replacements) {
    c = c.replace(r.search, r.replace);
  }
  if (original !== c) {
    fs.writeFileSync(path, c, 'utf8');
    console.log(`Updated ${path}`);
  }
}

// AppBar.tsx
replaceFile('web/src/components/AppBar.tsx', [
  { search: 'لا توجد إشعارات حالياً', replace: '{language === "en" ? "No notifications" : "لا توجد إشعارات حالياً"}' },
  { search: />عرض كل الإشعارات</g, replace: '>{language === "en" ? "View all notifications" : "عرض كل الإشعارات"}<' }
]);

// MainLayoutWrapper.tsx
replaceFile('web/src/components/MainLayoutWrapper.tsx', [
  { search: />التطبيق في وضع القراءة فقط، انتظار موافقة المسؤول على تأكيد الاشتراك راجع إيصالك.</g, replace: '>{language === "en" ? "App in Read-Only mode. Awaiting admin approval. Please check your receipt." : "التطبيق في وضع القراءة فقط، انتظار موافقة المسؤول على تأكيد الاشتراك راجع إيصالك."}<' }
]);

// SearchBar.tsx
replaceFile('web/src/components/SearchBar.tsx', [
  { search: 'placeholder="ابحث..."', replace: 'placeholder={language === "en" ? "Search..." : "ابحث..."}' }
]);

// Sidebar.tsx
replaceFile('web/src/components/Sidebar.tsx', [
  { search: />صيدلي أول</g, replace: '>{language === "en" ? "Senior Pharmacist" : "صيدلي أول"}<' }
]);

// SocketProvider.tsx
replaceFile('web/src/components/SocketProvider.tsx', [
  { search: 'تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل', replace: 'language === "en" ? "Subscription activated successfully. You can now use the full system." : "تم تفعيل اشتراكك بنجاح يمكنك الآن استخدام النظام بالكامل"' }
]);

// lib/api.ts
replaceFile('web/src/lib/api.ts', [
  { search: 'حدث خطأ في الاتصال بالسيرفر', replace: 'Connection Error' }
]);

// store/index.ts
replaceFile('web/src/store/index.ts', [
  { search: 'primaryUnit: "علبة"', replace: 'primaryUnit: "Box"' }
]);

// utils/formatQty.ts
replaceFile('web/src/utils/formatQty.ts', [
  { search: 'علبة', replace: '${language === "en" ? "Box" : "علبة"}' },
  { search: 'جزء', replace: '${language === "en" ? "Part" : "جزء"}' },
  { search: ' و ', replace: ' ${language === "en" ? "and" : "و"} ' }
]);
