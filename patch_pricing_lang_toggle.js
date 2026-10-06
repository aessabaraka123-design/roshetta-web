const fs = require('fs');
let c = fs.readFileSync('web/src/app/pricing/page.tsx', 'utf8');

c = c.replace(
  'const language = useStore((state: any) => state.language);',
  'const language = useStore((state: any) => state.language);\n  const setLanguage = useStore((state: any) => state.setLanguage);'
);

c = c.replace(
  '<div className="pricing-page-container" dir="rtl">',
  '<div className="pricing-page-container" dir={language === "en" ? "ltr" : "rtl"}>\n      <button\n        type="button"\n        onClick={() => setLanguage(language === "en" ? "ar" : "en")}\n        style={{\n          position: "absolute",\n          top: "24px",\n          insetInlineEnd: "24px",\n          zIndex: 50,\n          background: "var(--paper)",\n          border: "1px solid var(--line)",\n          padding: "8px 16px",\n          borderRadius: "8px",\n          cursor: "pointer",\n          fontWeight: 600,\n          color: "var(--deep)",\n          fontSize: "14px",\n          boxShadow: "var(--shadow)"\n        }}\n      >\n        {language === "en" ? "عربي" : "English"}\n      </button>'
);

fs.writeFileSync('web/src/app/pricing/page.tsx', c, 'utf8');
console.log('Added language toggle and dynamic dir');
