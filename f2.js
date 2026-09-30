const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/inventory/PricingScreen.js', 'utf8');

code = code.replace("const [settings, setSettings] = useState(null);", "const [serverPlans, setServerPlans] = useState([]);");

const fetchOld = /fetch\(\$\{API_BASE\}\/api\/admin\/settings\)\s*\.then\(res => res\.json\(\)\)\s*\.then\(data => setSettings\(data\.settings \|\| data\)\)\s*\.catch\(e => console\.error\("Error fetching settings", e\)\);/;
const fetchNew = "fetch(API_BASE + '/api/subscription-plans').then(r=>r.json()).then(d=>{if(d.success&&d.plans)setServerPlans(d.plans)}).catch(e=>console.warn('Failed to fetch plans',e));";

code = code.replace(fetchOld, fetchNew);

const plansTarget = "  const PLANS = [";
const parseBlock = "  const sm = serverPlans.find(p => p.id === 'monthly') || {};\n  const sa = serverPlans.find(p => p.id === 'annual') || {};\n  const sl = serverPlans.find(p => p.id === 'lifetime') || {};\n\n  const PLANS = [";
code = code.replace(plansTarget, parseBlock);

code = code.replace(/price: customPrice != null \? customPrice : \(settings\?\.monthlyPrice \|\| 49\),/g, "price: customPrice != null ? customPrice : (sm.price || 49),");
code = code.replace(/oldPrice: settings\?\.monthlyOldPrice,/g, "oldPrice: sm.oldPrice || null,");

code = code.replace(/price: customPrice != null \? customPrice \* 10 : \(settings\?\.annualPrice \|\| 499\),/g, "price: customPrice != null ? customPrice * 10 : (sa.price || 499),");
code = code.replace(/oldPrice: settings\?\.annualOldPrice,/g, "oldPrice: sa.oldPrice || null,");

code = code.replace(/price: settings\?\.lifetimePrice \|\| 1499,/g, "price: sl.price || 1499,");
code = code.replace(/oldPrice: settings\?\.lifetimeOldPrice,/g, "oldPrice: sl.oldPrice || null,");

fs.writeFileSync('C:/roshetta_app/src/screens/inventory/PricingScreen.js', code, 'utf8');
