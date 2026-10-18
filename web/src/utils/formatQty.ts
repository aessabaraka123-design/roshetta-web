export function formatQty(qty: number, unitsJson?: string | null, language: string = "ar"): string {
  const q = Number(qty) || 0;
  if (q <= 0) return language === "en" ? "Out of Stock" : "نفد المخزون";

  const tBox = language === "en" ? "Box" : "علبة";
  const tStrip = language === "en" ? "Strip" : "شريط";
  const tPill = language === "en" ? "Pill" : "حبة";
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

  const getUnitName = (name?: string, defaultName: string = tBox) => {
    const u = name || defaultName;
    if (language === "en" && unitTranslations[u]) {
      return unitTranslations[u];
    }
    return u;
  };

  if (unitsJson) {
    try {
      const parsedUnits = typeof unitsJson === "string" ? JSON.parse(unitsJson) : unitsJson;
      if (Array.isArray(parsedUnits) && parsedUnits.length > 1) {
        const boxesCount = Number(parsedUnits[0]?.count) || 1;
        const boxes = Math.floor(q / boxesCount);
        const remAfterBoxes = q % boxesCount;

        if (parsedUnits.length === 3) {
          const stripCount = Number(parsedUnits[1]?.count) || 1;
          const strips = Math.floor(remAfterBoxes / stripCount);
          const pills = remAfterBoxes % stripCount;

          const parts: string[] = [];
          if (boxes > 0) parts.push(`${boxes} ${getUnitName(parsedUnits[0]?.name, tBox)}`);
          if (strips > 0) parts.push(`${strips} ${getUnitName(parsedUnits[1]?.name, tStrip)}`);
          if (pills > 0) parts.push(`${pills} ${getUnitName(parsedUnits[2]?.name, tPill)}`);

          if (parts.length === 0) return `0 ${getUnitName(parsedUnits[0]?.name, tBox)}`;
          return parts.join(tAnd);
        } else if (parsedUnits.length === 2) {
          const pills = remAfterBoxes;
          const parts: string[] = [];
          if (boxes > 0) parts.push(`${boxes} ${getUnitName(parsedUnits[0]?.name, tBox)}`);
          if (pills > 0) parts.push(`${pills} ${getUnitName(parsedUnits[1]?.name, tPill)}`);

          if (parts.length === 0) return `0 ${getUnitName(parsedUnits[0]?.name, tBox)}`;
          return parts.join(tAnd);
        }
      }
    } catch {}
  }
  return `${q} ${tBox}`;
}
