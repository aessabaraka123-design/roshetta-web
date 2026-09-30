export function formatQty(qty: number, unitsJson?: string | null): string {
  const q = qty || 0;

  if (unitsJson) {
    try {
      const parsedUnits = JSON.parse(unitsJson);
      if (parsedUnits && parsedUnits.length > 1) {
        const parts = [];

        for (let i = 0; i < parsedUnits.length; i++) {
          const unit = parsedUnits[i];
          const count = unit.count || 1;
          const val = parseFloat((q / count).toFixed(2));
          parts.push(`${val} ${unit.name || (i === 0 ? "علبة" : "جزء")}`);
        }

        return parts.join(" و ");
      }
    } catch (e) {}
  }
  return `${q} علبة`;
}
