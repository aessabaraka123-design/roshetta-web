const fs = require('fs');
let code = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

if (!code.includes('document.documentElement.dir')) {
  code = code.replace(
    'import { useStore } from "@/store";',
    `import { useStore } from "@/store";\nimport { useEffect } from "react";`
  );

  code = code.replace(
    'const user = useStore((state) => state.user);',
    `const user = useStore((state: any) => state.user);\n  const language = useStore((state: any) => state.language);\n\n  useEffect(() => {\n    document.documentElement.dir = language === "en" ? "ltr" : "rtl";\n    document.documentElement.lang = language || "ar";\n  }, [language]);`
  );

  fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', code, 'utf8');
  console.log("Patched MainLayoutWrapper.tsx");
}
