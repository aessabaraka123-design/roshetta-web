const fs = require('fs');

let code = fs.readFileSync('web/src/app/add-item/page.tsx', 'utf8');

const targetHook = `  useEffect(() => {
    async function fetchBranches() {`;

const newHook = `  // Auto-calculate sub-unit prices
  useEffect(() => {
    const mainPrice = parseFloat(formData.price_sell) || 0;
    const s1Count = parseFloat(sub1Count) || 0;
    const s2Count = parseFloat(sub2Count) || 0;

    if (mainPrice > 0) {
      if (s1Count > 0) {
        setSub1Price(parseFloat((mainPrice / s1Count).toFixed(2)).toString());
        if (hasSubUnit2 && s2Count > 0) {
          setSub2Price(parseFloat((mainPrice / (s1Count * s2Count)).toFixed(2)).toString());
        }
      }
    }
  }, [formData.price_sell, sub1Count, sub2Count, hasSubUnit2]);

  useEffect(() => {
    async function fetchBranches() {`;

if (code.includes(targetHook)) {
  code = code.replace(targetHook, newHook);
  fs.writeFileSync('web/src/app/add-item/page.tsx', code, 'utf8');
  console.log("Injected auto-calculate useEffect into add-item");
} else {
  console.log("Could not find target hook");
}
