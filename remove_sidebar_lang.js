const fs = require('fs');
let c = fs.readFileSync('web/src/components/Sidebar.tsx', 'utf8');

const target = `      {/* Language Switcher */}
      <div className="p-3 border-t border-mint-line/50">
        <div className="flex items-center gap-2 bg-bg p-1 rounded-xl">
          <button
            onClick={() => setLanguage("ar")}
            className={\`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors \${language !== "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft hover:text-ink"}\`}
          >
            {t.sidebar.arabic}
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={\`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors \${language === "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft hover:text-ink"}\`}
          >
            {t.sidebar.english}
          </button>
        </div>
      </div>`;

c = c.replace(target, '');
fs.writeFileSync('web/src/components/Sidebar.tsx', c, 'utf8');
console.log('Removed');
