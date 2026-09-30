const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/inventory/PricingScreen.js', 'utf8');

// Add pharmacyId and customPrice state
code = code.replace(/const \[settings, setSettings\] = useState\(null\);/, "const { pharmacyId } = useStore();\n  const [settings, setSettings] = useState(null);\n  const [customPrice, setCustomPrice] = useState(null);");

// Update useEffect to fetch customPrice
code = code.replace(/useEffect\(\(\) => \{\n\s*fetch\(\$\{API_BASE\}\/api\/admin\/settings\)\n\s*\.then\(res => res\.json\(\)\)\n\s*\.then\(data => setSettings\(data\.settings \|\| data\)\)\n\s*\.catch\(e => console\.error\("Error fetching settings", e\)\);\n\s*\}, \[\]\);/, \useEffect(() => {
    fetch(\\\\/api/admin/settings\\\)
      .then(res => res.json())
      .then(data => setSettings(data.settings || data))
      .catch(e => console.error("Error fetching settings", e));
      
    if (pharmacyId) {
      fetch(\\\\/api/admin/pharmacies/\\\\, {
        headers: { 'x-pharmacy-id': pharmacyId }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.pharmacy && data.pharmacy.customPrice != null) {
          setCustomPrice(data.pharmacy.customPrice);
        }
      })
      .catch(e => console.error("Error fetching pharmacy custom price", e));
    }
  }, [pharmacyId]);\);

// Use customPrice in PLANS
code = code.replace(/price: settings\?\.monthlyPrice \|\| 49,/, "price: customPrice != null ? customPrice : (settings?.monthlyPrice || 49),");
code = code.replace(/price: settings\?\.annualPrice \|\| 499,/, "price: customPrice != null ? customPrice * 10 : (settings?.annualPrice || 499),");

fs.writeFileSync('C:/roshetta_app/src/screens/inventory/PricingScreen.js', code, 'utf8');
