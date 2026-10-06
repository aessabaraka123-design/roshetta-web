const fs = require('fs');
let c = fs.readFileSync('web/src/app/more/page.tsx', 'utf8');

const importStatement = `import { useStore } from "@/store";\nimport { useTranslation } from "@/i18n";`;
c = c.replace('import { useStore } from "@/store";', importStatement);

const toggleCode = `        {/* Language Switcher Section */}
        <div className="flex items-center gap-3 bg-card border border-mint-line rounded-[14px] px-3.5 py-3 shadow-sm mt-1 mb-2">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-bg flex items-center justify-center shrink-0">
            <svg className="w-[18px] h-[18px] stroke-primary" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="flex-1 text-[15px] font-bold text-ink">
            {t.sidebar.language}
          </div>
          <div className="flex bg-bg rounded-lg p-1">
            <button
              onClick={() => useStore.getState().setLanguage("ar")}
              className={\`px-3 py-1 text-sm font-bold rounded-md transition-colors \${useStore.getState().language !== "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft"}\`}
            >
              {t.sidebar.arabic}
            </button>
            <button
              onClick={() => useStore.getState().setLanguage("en")}
              className={\`px-3 py-1 text-sm font-bold rounded-md transition-colors \${useStore.getState().language === "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft"}\`}
            >
              {t.sidebar.english}
            </button>
          </div>
        </div>

        <div
          onClick={() => {`;

c = c.replace(`        <div\n          onClick={() => {\n            useStore.getState().logout();`, toggleCode);

c = c.replace('const user = useStore((state) => state.user);', 'const user = useStore((state) => state.user);\n  const { t } = useTranslation();');

fs.writeFileSync('web/src/app/more/page.tsx', c, 'utf8');
console.log('Added to more page');
