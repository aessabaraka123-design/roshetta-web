const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', 'utf8');

// Add pharmacyId and customPrice
code = code.replace(/const { navigate } = useNav\(\);/, "const { navigate } = useNav();\n  const { pharmacyId } = useStore();\n  const [customPrice, setCustomPrice] = useState(null);");

// Update useEffect
code = code.replace(/useEffect\(\(\) => \{\n\s*fetch\(\$\{API_BASE\}\/api\/admin\/settings\)\n\s*\.then\(res => res\.json\(\)\)\n\s*\.then\(data => \{\n\s*if \(data\.settings\) \{ setSettings\(data\.settings\); \} else \{ setSettings\(data\); \}\n\s*\}\)\n\s*\.catch\(e => console\.warn\('Failed to fetch settings:', e\)\);\n\s*\}, \[\]\);/, \useEffect(() => {
    fetch(\\\\/api/admin/settings\\\)
      .then(res => res.json())
      .then(data => {
        if (data.settings) { setSettings(data.settings); } else { setSettings(data); }
      })
      .catch(e => console.warn('Failed to fetch settings:', e));
      
    if (pharmacyId) {
      fetch(\\\\/api/admin/pharmacies/\\\\)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.pharmacy && data.pharmacy.customPrice != null) {
          setCustomPrice(data.pharmacy.customPrice);
        }
      })
      .catch(e => console.error("Error fetching custom price", e));
    }
  }, [pharmacyId]);\);

// Update prices in plans
code = code.replace(/price: settings\?\.monthlyPrice \|\| 49,/g, "price: customPrice != null ? customPrice : (settings?.monthlyPrice || 49),");
code = code.replace(/price: settings\?\.annualPrice \|\| 499,/g, "price: customPrice != null ? customPrice * 10 : (settings?.annualPrice || 499),");

fs.writeFileSync('C:/roshetta_app/src/screens/auth/UpgradeScreen.js', code, 'utf8');
