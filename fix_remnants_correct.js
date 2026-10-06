const fs = require('fs');

let c = fs.readFileSync('web/src/components/SocketProvider.tsx', 'utf8');
if (!c.includes('useStore')) {
  c = c.replace('import { useEffect', 'import { useStore } from "@/store";\nimport { useEffect');
  c = c.replace('export default function SocketProvider({', 'export default function SocketProvider({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  const language = useStore((state: any) => state.language);');
}
c = c.replace(/"🎉 تم تفعيل اشتراكك بنجاح! يمكنك الآن استخدام النظام بالكامل\."/, 'language === "en" ? "🎉 Subscription activated successfully! You can now use the full system." : "🎉 تم تفعيل اشتراكك بنجاح! يمكنك الآن استخدام النظام بالكامل."');
fs.writeFileSync('web/src/components/SocketProvider.tsx', c, 'utf8');

c = fs.readFileSync('web/src/components/SearchBar.tsx', 'utf8');
c = c.replace(/placeholder="ابحث\.\.\."/, 'placeholder={language === "en" ? "Search..." : "ابحث..."}');
fs.writeFileSync('web/src/components/SearchBar.tsx', c, 'utf8');

console.log('Fixed correctly');
