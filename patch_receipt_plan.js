const fs = require('fs');

// 1. my-subscription/page.tsx
let mySub = fs.readFileSync('web/src/app/my-subscription/page.tsx', 'utf8');
mySub = mySub.replace(
  'onClick={() => router.push("/receipt-upload")}',
  'onClick={() => router.push("/receipt-upload?plan=annual")}'
);
fs.writeFileSync('web/src/app/my-subscription/page.tsx', mySub, 'utf8');

// 2. upgrade-plan/page.tsx
let upg = fs.readFileSync('web/src/app/upgrade-plan/page.tsx', 'utf8');
upg = upg.replace(
  'const handleUpgrade = (planName: string) => {\n    router.push("/receipt-upload");\n  };',
  `const handleUpgrade = (planName: string) => {
    let id = "monthly";
    if (planName.includes("Lifetime") || planName.includes("دائمة") || planName.includes("حياة")) id = "lifetime";
    else if (planName.includes("Annual") || planName.includes("سنوي")) id = "annual";
    else if (planName.includes("Free") || planName.includes("مجاني")) id = "free";
    
    router.push("/receipt-upload?plan=" + id);
  };`
);
fs.writeFileSync('web/src/app/upgrade-plan/page.tsx', upg, 'utf8');

// 3. receipt-upload/page.tsx
let rcpt = fs.readFileSync('web/src/app/receipt-upload/page.tsx', 'utf8');

const useEffectQueryCode = `useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan');
      if (p) setPlan(p);
    }
  }, []);`;

rcpt = rcpt.replace(
  'const [plans, setPlans] = useState<any[]>([]);',
  `const [plans, setPlans] = useState<any[]>([]);
  
  ${useEffectQueryCode}`
);

const selectCode = `<select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              style={{
                border: "1.5px solid var(--line)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                fontFamily: "'Cairo',sans-serif",
                outline: "none",
                background: "#fff",
              }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - \${p.price}
                </option>
              ))}
            </select>`;

const readOnlyCode = `{(() => {
              const selectedP = plans.find(p => p.id === plan);
              return (
                <div style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontFamily: "'Cairo',sans-serif",
                  background: "#f8fafc",
                  color: "var(--deep)",
                  fontWeight: 600
                }}>
                  {selectedP ? \`\${selectedP.name} - $\${selectedP.price}\` : (language === "en" ? "Loading..." : "جاري التحميل...")}
                </div>
              );
            })()}`;

rcpt = rcpt.replace(selectCode, readOnlyCode);

fs.writeFileSync('web/src/app/receipt-upload/page.tsx', rcpt, 'utf8');
console.log('Fixed plan selection in receipt-upload, my-subscription, and upgrade-plan');
