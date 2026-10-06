export function formatQty(qty: number, unitsJson?: string | null, language: string = "ar"): string {
  const q = qty || 0;
  const tBox = language === "en" ? "Box" : "علبة";
  const tPart = language === "en" ? "Part" : "جزء";
  const tAnd = language === "en" ? " and " : " و ";

  const unitTranslations: Record<string, string> = {
    "علبة": "Box",
    "شريط": "Strip",
    "حبة": "Pill",
    "كرتونة": "Carton",
    "قطرة": "Drop",
    "امبولة": "Ampoule",
    "أمبولة": "Ampoule",
    "زجاجة": "Bottle",
    "كيس": "Sachet",
    "جرعة": "Dose"
  };

  if (unitsJson) {
    try {
      const parsedUnits = JSON.parse(unitsJson);
      if (parsedUnits && parsedUnits.length > 1) {
        const parts = [];

        for (let i = 0; i < parsedUnits.length; i++) {
          const unit = parsedUnits[i];
          const count = unit.count || 1;
          const val = parseFloat((q / count).toFixed(2));
          let uName = unit.name || (i === 0 ? tBox : tPart);
          
          if (language === "en" && unitTranslations[uName]) {
            uName = unitTranslations[uName];
          }

          parts.push(`${val} ${uName}`);
        }

        return parts.join(tAnd);
      }
    } catch (e) {}
  }
  return `${q} ${tBox}`;
}
