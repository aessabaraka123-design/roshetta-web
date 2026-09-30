const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', 'utf8');

code = code.replace(/const \[settings, setSettings\] = useState\(null\);/, "const [serverPlans, setServerPlans] = useState([]);");

code = code.replace(/fetch\(\$\{API_BASE\}\/api\/admin\/settings\)\s*\.then\(res => res\.json\(\)\)\s*\.then\(data => \{\s*if \(data\.settings\) \{ setSettings\(data\.settings\); \} else \{ setSettings\(data\); \}\s*\}\)\s*\.catch\(e => console\.warn\('Failed to fetch settings:', e\)\);/, \etch(\\\\/api/subscription-plans\\\)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.plans) {
          setServerPlans(data.plans);
        }
      })
      .catch(e => console.warn('Failed to fetch plans:', e));\);

// inject parsing before plans
const plansTarget = "  const plans = [";
const parseBlock = \  const sm = serverPlans.find(p => p.id === 'monthly') || {};
  const sa = serverPlans.find(p => p.id === 'annual') || {};
  const sl = serverPlans.find(p => p.id === 'lifetime') || {};\n\n  const plans = [\;
code = code.replace(plansTarget, parseBlock);

// update prices
code = code.replace(/price: customPrice != null \? customPrice : \(settings\?\.monthlyPrice \|\| 49\),/g, "price: customPrice != null ? customPrice : (sm.price || 49),");
code = code.replace(/oldPrice: settings\?\.monthlyOldPrice,/g, "oldPrice: sm.oldPrice || null,");

code = code.replace(/price: customPrice != null \? customPrice \* 10 : \(settings\?\.annualPrice \|\| 499\),/g, "price: customPrice != null ? customPrice * 10 : (sa.price || 499),");
code = code.replace(/oldPrice: settings\?\.annualOldPrice,/g, "oldPrice: sa.oldPrice || null,");

code = code.replace(/price: settings\?\.lifetimePrice \|\| 1499,/g, "price: sl.price || 1499,");
code = code.replace(/oldPrice: settings\?\.lifetimeOldPrice,/g, "oldPrice: sl.oldPrice || null,");


fs.writeFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', code, 'utf8');
