const fs = require('fs');
let code = fs.readFileSync('web/src/store/index.ts', 'utf8');

if (!code.includes('language:')) {
  code = code.replace('interface StoreState {', `interface StoreState {\n  language: 'ar' | 'en';\n  setLanguage: (lang: 'ar' | 'en') => void;`);
  code = code.replace('(set) => ({', `(set) => ({\n      language: 'ar',\n      setLanguage: (lang) => set({ language: lang }),`);
  fs.writeFileSync('web/src/store/index.ts', code, 'utf8');
  console.log("Added language to store.");
} else {
  console.log("Language already in store.");
}
