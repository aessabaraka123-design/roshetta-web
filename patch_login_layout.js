const fs = require('fs');
let c = fs.readFileSync('web/src/app/login/page.tsx', 'utf8');

c = c.replace(
  'padding: 13px 44px 13px 16px;',
  'padding: 13px 16px;\n    padding-inline-start: 44px;\n    padding-inline-end: 44px;'
);
c = c.replace(
  'position:absolute; right:15px; top:50%; transform:translateY(-50%);',
  'position:absolute; inset-inline-start:15px; top:50%; transform:translateY(-50%);'
);
c = c.replace(
  'position:absolute; left:15px; top:50%; transform:translateY(-50%);',
  'position:absolute; inset-inline-end:15px; top:50%; transform:translateY(-50%);'
);

// Also let's place the language toggle button elegantly at the top of the white card instead of floating absolute on the page edge.
// We can find where <div className="card-title"> is, and put it inside a flex container.

c = c.replace(
  '<div className="card-title">',
  '<div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>\n            <div>'
);
c = c.replace(
  '<h2>{language === "en" ? "Login" : "تسجيل الدخول"}</h2>\n            <p>{language === "en" ? "Enter your details to continue" : "أدخل بياناتك للمتابعة"}</p>\n          </div>',
  '<h2>{language === "en" ? "Login" : "تسجيل الدخول"}</h2>\n              <p>{language === "en" ? "Enter your details to continue" : "أدخل بياناتك للمتابعة"}</p>\n            </div>\n            <button\n              type="button"\n              onClick={() => setLanguage(language === "en" ? "ar" : "en")}\n              style={{ background: "var(--pale-bg)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, color: "var(--deep)", fontSize: "13px" }}\n            >\n              {language === "en" ? "عربي" : "English"}\n            </button>\n          </div>'
);

// Remove the old absolute toggle button injected by the subagent
c = c.replace(
  /<button[\s\S]*?onClick=\{\(\) => setLanguage\(language === 'en' \? 'ar' : 'en'\)\}[\s\S]*?<\/button>/,
  ''
);

fs.writeFileSync('web/src/app/login/page.tsx', c, 'utf8');
console.log('Fixed login layout and moved button');
