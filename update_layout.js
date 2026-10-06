const fs = require('fs');
let c = fs.readFileSync('web/src/app/layout.tsx', 'utf8');

if (!c.includes('LanguageWrapper')) {
  c = c.replace(
    'import MainLayoutWrapper from "@/components/MainLayoutWrapper";',
    'import MainLayoutWrapper from "@/components/MainLayoutWrapper";\nimport LanguageWrapper from "@/components/LanguageWrapper";'
  );

  c = c.replace(
    '<body\n        className="min-h-full bg-bg text-ink selection:bg-primary-pale flex"\n        suppressHydrationWarning\n      >',
    '<body\n        className="min-h-full bg-bg text-ink selection:bg-primary-pale"\n        suppressHydrationWarning\n      >\n        <LanguageWrapper>'
  );
  
  c = c.replace(
    '</SocketProvider>\n      </body>',
    '</SocketProvider>\n        </LanguageWrapper>\n      </body>'
  );
  
  // also remove dir="rtl" from html to avoid hydration mismatches
  c = c.replace('dir="rtl"', '');

  fs.writeFileSync('web/src/app/layout.tsx', c, 'utf8');
  console.log('Updated layout.tsx');
}
