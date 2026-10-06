const fs = require('fs');
let c = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

c = c.replace(
  'const language = useStore((state: any) => state.language);',
  'const language = useStore((state: any) => state.language);\n  const setLanguage = useStore((state: any) => state.setLanguage);'
);

c = c.replace(
  'العودة للباقات\n              <svg\n                viewBox="0 0 24 24"\n                fill="none"\n                xmlns="http://www.w3.org/2000/svg"\n              >',
  '{language === "en" ? "Back to Plans" : "العودة للباقات"}\n              <svg\n                viewBox="0 0 24 24"\n                fill="none"\n                xmlns="http://www.w3.org/2000/svg"\n                style={{ transform: language === "en" ? "scaleX(-1)" : "none" }}\n              >'
);

// We need to add the language toggle button. We can put it right next to the "Back to Plans" link.
// Let's see how <header className="top-nav"> is structured.

c = c.replace(
  '<Link href="/pricing" className="back-link">',
  '<button\n                type="button"\n                onClick={() => setLanguage(language === "en" ? "ar" : "en")}\n                style={{\n                  background: "var(--paper)",\n                  border: "1px solid var(--line)",\n                  padding: "6px 12px",\n                  borderRadius: "8px",\n                  cursor: "pointer",\n                  fontWeight: 600,\n                  color: "var(--deep)",\n                  fontSize: "13px",\n                  marginInlineEnd: "16px"\n                }}\n              >\n                {language === "en" ? "عربي" : "English"}\n              </button>\n              <Link href="/pricing" className="back-link">'
);

fs.writeFileSync('web/src/app/register/page.tsx', c, 'utf8');
console.log('Fixed register page');
