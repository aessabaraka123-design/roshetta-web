const fs = require('fs');
let c = fs.readFileSync('web/src/app/more/page.tsx', 'utf8');

c = c.replace(/useStore\.getState\(\)\.language/g, 'language');
c = c.replace(/useStore\.getState\(\)\.setLanguage/g, 'setLanguage');
c = c.replace(
  'const { t } = useTranslation();',
  'const { t } = useTranslation();\n  const language = useStore((state: any) => state.language);\n  const setLanguage = useStore((state: any) => state.setLanguage);'
);

fs.writeFileSync('web/src/app/more/page.tsx', c, 'utf8');
console.log('Fixed hook usage');
