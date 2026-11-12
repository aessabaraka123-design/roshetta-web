/**
 * web/src/lib/stock-take/domain.ts
 * Pure domain engine for Physical Stock Take Sessions, Cycle Counts,
 * Batch-Level Counts, Blind Mode, Conflict Resolution & Shrinkage Analytics.
 * Exact 3-way parity mirror of:
 * - roshetta_server/stock-take-domain.js
 * - C:/roshetta_app/src/domain/stockTakeDomain.js
 */

import {
  computeStockStatus,
  composeBaseQty,
  deductBatchesFefo,
  addOrMergeBatch,
  extractBoxMultiplier,
  formatQtyWithUnits,
  itemMatchesBranchFilter,
  normalizeCategoryLabel,
  normalizeSearchText,
  parseBatchesArray,
  parseUnitsArray,
  round2,
  round4,
  safeJson,
  sortBatchesFefo,
  type InventoryItemRecord,
} from "../inventory/domain";

export type StockTakeScopeType = "full" | "cycle_category" | "controlled" | "expiring" | "low" | "custom";

export interface StockTakeReasonMeta {
  code: string;
  labelAr: string;
  labelEn: string;
  direction: "shortage" | "surplus" | "both";
}

export const STOCK_TAKE_SCOPES: Array<{ code: StockTakeScopeType; labelAr: string; labelEn: string }> = [
  { code: "full", labelAr: "جرد شامل للمخزون", labelEn: "Full Store Count" },
  { code: "cycle_category", labelAr: "جرد دوري حسب الفئة", labelEn: "Cycle Count (Category)" },
  { code: "controlled", labelAr: "جرد الأدوية المراقبة", labelEn: "Controlled Meds Count" },
  { code: "expiring", labelAr: "جرد قريبة الانتهاء (<=60 يوم)", labelEn: "Expiring Soon (<=60d)" },
  { code: "low", labelAr: "جرد النواقص والنافد", labelEn: "Low & Out of Stock" },
  { code: "custom", labelAr: "جرد مخصص / مسح باركود", labelEn: "Custom / Scan Count" },
];

export const STOCK_TAKE_REASON_CODES: StockTakeReasonMeta[] = [
  { code: "stock_take_shortage", labelAr: "عجز جرد", labelEn: "Count Shortage", direction: "shortage" },
  { code: "stock_take_surplus", labelAr: "فائض جرد", labelEn: "Count Surplus", direction: "surplus" },
  { code: "damaged", labelAr: "تلف / كسر أثناء التخزين", labelEn: "Damaged / Broken", direction: "shortage" },
  { code: "expired", labelAr: "منتهي الصلاحية", labelEn: "Expired Stock", direction: "shortage" },
  { code: "theft_loss", labelAr: "فاقد / تسريب غير مبرر", labelEn: "Shrinkage / Loss", direction: "shortage" },
  { code: "entry_error", labelAr: "تصحيح خطأ قيد سابق", labelEn: "Previous Entry Error", direction: "both" },
  { code: "unrecorded_bonus", labelAr: "بونص / كمية مجانية غير مقيدة", labelEn: "Unrecorded Bonus", direction: "surplus" },
];

export const HIGH_VARIANCE_PCT_THRESHOLD = 10;
export const HIGH_VARIANCE_VALUE_THRESHOLD = 100;

export function resolveReasonCode(rawReason = "", deltaBaseQty = 0): string {
  const norm = normalizeSearchText(rawReason);
  if (norm) {
    for (const r of STOCK_TAKE_REASON_CODES) {
      if (
        normalizeSearchText(r.code) === norm ||
        normalizeSearchText(r.labelAr) === norm ||
        normalizeSearchText(r.labelEn) === norm
      ) {
        return r.code;
      }
    }
    if (norm.includes("تلف") || norm.includes("كسر") || norm.includes("damag")) return "damaged";
    if (norm.includes("منتهي") || norm.includes("صلاحي") || norm.includes("expir")) return "expired";
    if (norm.includes("سرق") || norm.includes("فقد") || norm.includes("loss") || norm.includes("shrink")) return "theft_loss";
    if (norm.includes("خطا") || norm.includes("ادخال") || norm.includes("error")) return "entry_error";
    if (norm.includes("بونص") || norm.includes("bonus") || norm.includes("مجاني")) return "unrecorded_bonus";
    if (norm.includes("فائض") || norm.includes("surplus")) return "stock_take_surplus";
    if (norm.includes("عجز") || norm.includes("shortage")) return "stock_take_shortage";
  }
  return Number(deltaBaseQty) > 0 ? "stock_take_surplus" : "stock_take_shortage";
}

export function formatStockTakeReason(rawReason = "", deltaBaseQty = 0, lang: "ar" | "en" = "ar") {
  const isEn = lang === "en";
  const code = resolveReasonCode(rawReason, deltaBaseQty);
  const found = STOCK_TAKE_REASON_CODES.find((r) => r.code === code) || STOCK_TAKE_REASON_CODES[0];
  return {
    code: found.code,
    label: isEn ? found.labelEn : found.labelAr,
    labelAr: found.labelAr,
    labelEn: found.labelEn,
  };
}

export function formatSignedDeltaWithUnits(deltaBaseQty: number, unitsRaw: any, lang: "ar" | "en" = "ar"): string {
  const d = round2(deltaBaseQty);
  if (Math.abs(d) <= 0.000001) return "0";
  const formatted = formatQtyWithUnits({ qty: Math.abs(d), units: unitsRaw }, unitsRaw, lang);
  return `${d > 0 ? "+" : "-"}${formatted}`;
}

export function buildSessionNumber(seq = 1, dateInput: Date | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const n = String(Math.max(1, Math.floor(Number(seq) || 1))).padStart(4, "0");
  return `ST-${y}${m}${day}-${n}`;
}

export function filterItemsByScope(
  inventory: InventoryItemRecord[] = [],
  scopeType: StockTakeScopeType | string = "full",
  scopeValue = "",
  branchFilter = "all",
  branches: any[] = [],
  now: Date = new Date()
): InventoryItemRecord[] {
  const list = Array.isArray(inventory) ? inventory : [];
  const scope = String(scopeType || "full").trim();
  const valNorm = normalizeSearchText(scopeValue || "");

  return list.filter((item) => {
    if (!item || item.archived_at) return false;
    if (!itemMatchesBranchFilter(item, branchFilter, branches)) return false;

    if (scope === "full" || scope === "custom") return true;
    const st = computeStockStatus(item, { now });
    if (scope === "controlled") {
      return [true, 1, "1", "true"].includes(item.isControlled as any);
    }
    if (scope === "expiring") {
      return st.expiryStatus.isExpired || st.expiryStatus.isExpiringSoon;
    }
    if (scope === "low") {
      return st.isOutOfStock || st.isLowStock;
    }
    if (scope === "cycle_category") {
      if (!valNorm) return true;
      const itemCatNorm = normalizeSearchText(item.category || "");
      const normLabel = normalizeSearchText(normalizeCategoryLabel(item.category || "", "ar"));
      const valLabelNorm = normalizeSearchText(normalizeCategoryLabel(scopeValue, "ar"));
      return itemCatNorm === valNorm || normLabel === valLabelNorm || itemCatNorm.includes(valNorm);
    }
    return true;
  });
}

export function resolveDraftActualBaseQty(item: any, draft: any = {}): number {
  const units = parseUnitsArray(item?.units);
  if (draft.batchCounts && typeof draft.batchCounts === "object" && Object.keys(draft.batchCounts).length > 0) {
    let sum = 0;
    for (const val of Object.values(draft.batchCounts) as any[]) {
      if (val && typeof val === "object") {
        sum += composeBaseQty(
          {
            boxes: Number(val.boxes) || 0,
            strips: Number(val.strips) || 0,
            pills: Number(val.pills) || 0,
          },
          units
        );
      } else {
        sum += Math.max(0, Number(val) || 0);
      }
    }
    return round2(sum);
  }
  if (draft.actualBaseQty !== undefined && draft.actualBaseQty !== null && draft.actualBaseQty !== "") {
    return round2(Math.max(0, Number(draft.actualBaseQty) || 0));
  }
  if (draft.actual !== undefined && draft.actual !== null && draft.actual !== "") {
    return round2(Math.max(0, Number(draft.actual) || 0));
  }
  return round2(
    composeBaseQty(
      {
        boxes: Number(draft.boxes) || 0,
        strips: Number(draft.strips) || 0,
        pills: Number(draft.pills) || 0,
      },
      units
    )
  );
}

export function computeStockTakeLineDiff(item: any, draft: any = {}, lang: "ar" | "en" = "ar") {
  const units = parseUnitsArray(item?.units);
  const mult = extractBoxMultiplier(units);
  const expectedBaseQty =
    draft.expectedQty !== undefined && draft.expectedQty !== null
      ? round2(draft.expectedQty)
      : round2(item?.qty || 0);
  const actualBaseQty =
    draft.dirty === false && draft.actualBaseQty == null && draft.boxes == null
      ? expectedBaseQty
      : resolveDraftActualBaseQty(item, draft);
  const deltaBaseQty = round2(actualBaseQty - expectedBaseQty);
  const batches = sortBatchesFefo(parseBatchesArray(item?.batches, item));
  const fallbackBoxCost = round2(item?.cost || 0);
  const fallbackUnitCost = mult > 0 ? round4(fallbackBoxCost / mult) : fallbackBoxCost;

  let weightedUnitCost = fallbackUnitCost;
  let costImpact = 0;

  if (deltaBaseQty < 0) {
    const shortageQty = Math.abs(deltaBaseQty);
    if (draft.batchCounts && typeof draft.batchCounts === "object" && batches.length > 0) {
      let totalLoss = 0;
      let countedShortage = 0;
      for (const b of batches) {
        const bAvail = round2(b.remaining ?? b.qty);
        const rawEntry = draft.batchCounts[b.id];
        if (rawEntry === undefined) continue;
        const bActual =
          typeof rawEntry === "object"
            ? composeBaseQty({ boxes: Number(rawEntry.boxes) || 0, strips: Number(rawEntry.strips) || 0, pills: Number(rawEntry.pills) || 0 }, units)
            : Math.max(0, Number(rawEntry) || 0);
        const bDelta = round2(bActual - bAvail);
        if (bDelta < 0) {
          const bBoxCost = Number(b.cost ?? item?.cost) || 0;
          const bUnitCost = mult > 0 ? bBoxCost / mult : bBoxCost;
          totalLoss += Math.abs(bDelta) * bUnitCost;
          countedShortage += Math.abs(bDelta);
        }
      }
      if (countedShortage > 0) {
        costImpact = round2(-totalLoss);
        weightedUnitCost = round4(totalLoss / countedShortage);
      } else {
        const res = deductBatchesFefo(batches, shortageQty, fallbackBoxCost, Number(item?.price) || 0, mult);
        costImpact = round2(-res.totalCost);
        weightedUnitCost = round4(res.weightedUnitCost / mult || fallbackUnitCost);
      }
    } else {
      const res = deductBatchesFefo(batches, shortageQty, fallbackBoxCost, Number(item?.price) || 0, mult);
      costImpact = round2(-res.totalCost);
      weightedUnitCost = shortageQty > 0 ? round4(res.totalCost / shortageQty) : fallbackUnitCost;
    }
  } else if (deltaBaseQty > 0) {
    costImpact = round2(deltaBaseQty * fallbackUnitCost);
    weightedUnitCost = fallbackUnitCost;
  }

  const variancePct =
    expectedBaseQty > 0
      ? round2((Math.abs(deltaBaseQty) / expectedBaseQty) * 100)
      : actualBaseQty > 0
        ? 100
        : 0;
  const isHighVariance =
    Math.abs(deltaBaseQty) > 0.0001 &&
    (variancePct >= HIGH_VARIANCE_PCT_THRESHOLD || Math.abs(costImpact) >= HIGH_VARIANCE_VALUE_THRESHOLD);
  const reasonInfo = formatStockTakeReason(draft.reasonCode || draft.reason || "", deltaBaseQty, lang);

  return {
    id: String(item?.id || draft.id || ""),
    name: String(item?.name || draft.name || ""),
    barcode: String(item?.barcode || ""),
    units,
    expectedBaseQty,
    actualBaseQty,
    deltaBaseQty,
    deltaFormatted: formatSignedDeltaWithUnits(deltaBaseQty, units, lang),
    variancePct,
    isHighVariance,
    weightedUnitCost,
    costImpact,
    absLossValue: deltaBaseQty < 0 ? round2(Math.abs(costImpact)) : 0,
    surplusValue: deltaBaseQty > 0 ? round2(costImpact) : 0,
    reasonCode: reasonInfo.code,
    reasonLabel: reasonInfo.label,
    notes: String(draft.notes || "").trim(),
    dirty: Boolean(draft.dirty),
    counted: Boolean(draft.counted || draft.dirty),
    batchCounts: draft.batchCounts || null,
  };
}

export function buildSessionSummary(lines: any[] = [], totalStockCostValue = 0) {
  const list = Array.isArray(lines) ? lines : [];
  let countedLines = 0;
  let changedLinesCount = 0;
  let shortageLinesCount = 0;
  let surplusLinesCount = 0;
  let totalShortageUnits = 0;
  let totalSurplusUnits = 0;
  let shortageCostValue = 0;
  let surplusCostValue = 0;
  let highVarianceLinesCount = 0;

  for (const line of list) {
    if (line.counted || line.dirty) countedLines += 1;
    const d = round2(line.deltaBaseQty ?? line.delta ?? 0);
    if (Math.abs(d) > 0.0001) {
      changedLinesCount += 1;
      if (line.isHighVariance) highVarianceLinesCount += 1;
      if (d < 0) {
        shortageLinesCount += 1;
        totalShortageUnits = round2(totalShortageUnits + Math.abs(d));
        shortageCostValue = round2(shortageCostValue + (Number(line.absLossValue) || Math.abs(Math.min(0, Number(line.costImpact) || 0))));
      } else {
        surplusLinesCount += 1;
        totalSurplusUnits = round2(totalSurplusUnits + d);
        surplusCostValue = round2(surplusCostValue + (Number(line.surplusValue) || Math.max(0, Number(line.costImpact) || 0)));
      }
    }
  }

  const netVarianceValue = round2(surplusCostValue - shortageCostValue);
  const baseVal = Number(totalStockCostValue) || 0;
  const shrinkagePct = baseVal > 0 ? round2((shortageCostValue / baseVal) * 100) : 0;

  return {
    totalLines: list.length,
    countedLines,
    changedLinesCount,
    shortageLinesCount,
    surplusLinesCount,
    highVarianceLinesCount,
    totalShortageUnits,
    totalSurplusUnits,
    shortageCostValue,
    surplusCostValue,
    netVarianceValue,
    shrinkagePct,
  };
}

export function normalizeStockAdjustmentRow(row: any = {}, lang: "ar" | "en" = "ar") {
  const rawQty = Number(row.qty || 0);
  const normReason = normalizeSearchText(row.reason || "");
  const looksSurplus =
    row.direction === "surplus" ||
    normReason.includes("فائض") ||
    normReason.includes("surplus") ||
    normReason.includes("بونص") ||
    normReason.includes("bonus") ||
    (rawQty > 0 && (normReason === "stock_take_surplus" || normReason === "فائض جرد"));
  const direction: "shortage" | "surplus" = looksSurplus ? "surplus" : "shortage";
  const absQty = round2(Math.abs(rawQty));
  const signedQty = direction === "surplus" ? absQty : -absQty;
  const reasonInfo = formatStockTakeReason(row.reasonCode || row.reason || "", signedQty, lang);

  return {
    id: String(row.id || ""),
    drug_id: String(row.drug_id || ""),
    drug_name: String(row.drug_name || ""),
    barcode: String(row.barcode || ""),
    direction,
    absQty,
    signedQty,
    unitCost: round4(row.cost || 0),
    lossValue: direction === "shortage" ? round2(row.loss_value || 0) : 0,
    surplusValue: direction === "surplus" ? round2(row.surplus_value || absQty * Number(row.cost || 0)) : 0,
    reasonCode: reasonInfo.code,
    reasonLabel: reasonInfo.label,
    rawReason: String(row.reason || ""),
    recorded_by: String(row.recorded_by || "System"),
    branch_id: row.branch_id ?? null,
    session_id: row.session_id || null,
    created_at: String(row.created_at || ""),
  };
}

export function computeShrinkageKpis(
  adjustments: any[] = [],
  inventory: InventoryItemRecord[] = [],
  sessions: any[] = [],
  lang: "ar" | "en" = "ar"
) {
  const adjList = Array.isArray(adjustments) ? adjustments : [];
  const invList = Array.isArray(inventory) ? inventory : [];
  const sessList = Array.isArray(sessions) ? sessions : [];

  let totalLossValue = 0;
  let totalSurplusValue = 0;
  let shortageEventsCount = 0;
  let surplusEventsCount = 0;
  const byDrug = new Map<string, { drugId: string; drugName: string; totalLoss: number; totalQty: number; count: number }>();

  for (const raw of adjList) {
    const row = normalizeStockAdjustmentRow(raw, lang);
    if (row.direction === "surplus") {
      surplusEventsCount += 1;
      totalSurplusValue = round2(totalSurplusValue + row.surplusValue);
    } else {
      shortageEventsCount += 1;
      totalLossValue = round2(totalLossValue + row.lossValue);
      const prev = byDrug.get(row.drug_id) || { drugId: row.drug_id, drugName: row.drug_name, totalLoss: 0, totalQty: 0, count: 0 };
      prev.totalLoss = round2(prev.totalLoss + row.lossValue);
      prev.totalQty = round2(prev.totalQty + row.absQty);
      prev.count += 1;
      byDrug.set(row.drug_id, prev);
    }
  }

  let totalInventoryCost = 0;
  for (const item of invList) {
    if (!item || item.archived_at) continue;
    const st = computeStockStatus(item);
    totalInventoryCost += st.costValue;
  }
  totalInventoryCost = round2(totalInventoryCost);

  const topLossDrugs = Array.from(byDrug.values())
    .sort((a, b) => b.totalLoss - a.totalLoss || b.totalQty - a.totalQty)
    .slice(0, 5);

  return {
    totalLossValue,
    totalSurplusValue,
    netShrinkageValue: round2(totalLossValue - totalSurplusValue),
    shortageEventsCount,
    surplusEventsCount,
    totalAdjustmentsCount: adjList.length,
    shrinkagePctOfStock: totalInventoryCost > 0 ? round2((totalLossValue / totalInventoryCost) * 100) : 0,
    activeDraftSessionsCount: sessList.filter((s) => s && s.status === "draft").length,
    postedSessionsCount: sessList.filter((s) => s && s.status === "posted").length,
    topLossDrugs,
  };
}

export function maskLineForBlindMode(line: any, blindMode = false, revealVariance = false) {
  if (!blindMode || revealVariance) return { ...line, expectedMasked: false };
  return {
    ...line,
    expectedBaseQty: null,
    deltaBaseQty: null,
    deltaFormatted: null,
    variancePct: null,
    costImpact: null,
    absLossValue: null,
    surplusValue: null,
    isHighVariance: false,
    expectedMasked: true,
  };
}

export function reconcileConflictLine(
  line: any,
  conflictItem: any,
  strategy: "keep_actual" | "adopt_current" | "shift_by_sale" = "keep_actual"
) {
  const curQty = round2(conflictItem?.currentQty ?? conflictItem?.qty ?? 0);
  const oldExpected = round2(conflictItem?.expectedQty ?? line?.expectedBaseQty ?? 0);
  const oldActual = round2(line?.actualBaseQty ?? curQty);
  let nextActual = oldActual;

  if (strategy === "adopt_current") {
    nextActual = curQty;
  } else if (strategy === "shift_by_sale") {
    const movementDuringCount = round2(curQty - oldExpected);
    nextActual = Math.max(0, round2(oldActual + movementDuringCount));
  } else {
    nextActual = oldActual;
  }

  return {
    ...line,
    expectedQty: curQty,
    expectedBaseQty: curQty,
    actual: nextActual,
    actualBaseQty: nextActual,
    newQty: nextActual,
    conflictResolved: true,
  };
}

export function buildCanonicalStockTakeCommand({
  eventId,
  action,
  targetId = null,
  payload = {},
  createdAt = null,
}: {
  eventId?: string;
  action: string;
  targetId?: string | null;
  payload?: Record<string, any>;
  createdAt?: string | null;
}) {
  return {
    eventId: String(eventId || `EVT-ST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`),
    action: String(action || "").trim().toUpperCase(),
    targetId: targetId ? String(targetId) : (payload?.sessionId ? String(payload.sessionId) : payload?.id ? String(payload.id) : null),
    payload: payload && typeof payload === "object" ? { ...payload } : {},
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function applyStockTakeCommandOptimistically(snapshot: any = {}, command: any = {}) {
  const invList = Array.isArray(snapshot.inventory) ? snapshot.inventory.map((i: any) => ({ ...i })) : [];
  const adjustments = Array.isArray(snapshot.stockAdjustments) ? snapshot.stockAdjustments.map((a: any) => ({ ...a })) : [];
  const movements = Array.isArray(snapshot.stockMovements) ? snapshot.stockMovements.map((m: any) => ({ ...m })) : [];
  const expenses = Array.isArray(snapshot.expenses) ? snapshot.expenses.map((e: any) => ({ ...e })) : [];
  const sessions = Array.isArray(snapshot.stockTakeSessions) ? snapshot.stockTakeSessions.map((s: any) => ({ ...s })) : [];

  const action = String(command.action || "").toUpperCase();
  const p = command.payload && typeof command.payload === "object" ? command.payload : {};
  const ts = command.createdAt || new Date().toISOString();
  const evId = command.eventId || `EVT-ST-${Date.now()}`;
  const targetId = command.targetId || p.sessionId || p.id;

  if (action === "CREATE_STOCK_TAKE_SESSION" || action === "UPDATE_STOCK_TAKE_SESSION" || action === "SAVE_STOCK_TAKE_SESSION") {
    const sessId = String(targetId || p.id || `ST-${evId}`);
    const idx = sessions.findIndex((s: any) => String(s.id) === sessId);
    const itemsArr = Array.isArray(p.items) ? p.items : (idx >= 0 ? safeJson(sessions[idx].items_json, []) : []);
    const summary = p.summary || buildSessionSummary(itemsArr);
    const record = {
      ...(idx >= 0 ? sessions[idx] : {}),
      id: sessId,
      session_number: p.session_number || (idx >= 0 ? sessions[idx].session_number : buildSessionNumber(sessions.length + 1, ts)),
      title: String(p.title || (idx >= 0 ? sessions[idx].title : "جلسة جرد فعلي")),
      scope_type: String(p.scope_type || p.scopeType || (idx >= 0 ? sessions[idx].scope_type : "full")),
      scope_value: String(p.scope_value ?? p.scopeValue ?? (idx >= 0 ? sessions[idx].scope_value : "")),
      branch_id: p.branch_id !== undefined ? p.branch_id : (idx >= 0 ? sessions[idx].branch_id : null),
      blind_mode: p.blind_mode !== undefined ? (p.blind_mode ? 1 : 0) : (p.blindMode ? 1 : (idx >= 0 ? sessions[idx].blind_mode : 0)),
      status: idx >= 0 && sessions[idx].status === "posted" ? "posted" : "draft",
      items_json: JSON.stringify(itemsArr),
      summary_json: JSON.stringify(summary),
      created_by: p.actorName || p.created_by || (idx >= 0 ? sessions[idx].created_by : "System"),
      created_at: idx >= 0 ? sessions[idx].created_at : ts,
      updated_at: ts,
      isPending: true,
    };
    if (idx >= 0) sessions[idx] = record;
    else sessions.unshift(record);
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses, stockTakeSessions: sessions };
  }

  if (action === "CANCEL_STOCK_TAKE_SESSION") {
    const idx = sessions.findIndex((s: any) => String(s.id) === String(targetId));
    if (idx >= 0 && sessions[idx].status !== "posted") {
      sessions[idx] = { ...sessions[idx], status: "cancelled", updated_at: ts };
    }
    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses, stockTakeSessions: sessions };
  }

  if (action === "STOCK_TAKE" || action === "POST_STOCK_TAKE_SESSION") {
    const rows = Array.isArray(p.items) ? p.items : Array.isArray(p.adjustments) ? p.adjustments : [];
    const postedLines: any[] = [];

    for (const [index, row] of rows.entries()) {
      const idx = invList.findIndex((i: any) => String(i.id) === String(row.id));
      if (idx < 0) continue;
      const cur = invList[idx];
      const before = round2(cur.qty);
      const actual = round2(row.actual ?? row.actualBaseQty ?? row.newQty ?? before);
      const diff = round2(before - actual);
      const mult = extractBoxMultiplier(cur.units);
      const curBatches = parseBatchesArray(cur.batches, cur);

      let nextBatches = curBatches;
      let loss = 0;
      let weightedUnitCost = mult > 0 ? round4((Number(cur.cost) || 0) / mult) : round4(cur.cost || 0);

      const hasBatchCounts =
        row.batchCounts &&
        ((Array.isArray(row.batchCounts) && row.batchCounts.length > 0) ||
          (!Array.isArray(row.batchCounts) && typeof row.batchCounts === "object" && Object.keys(row.batchCounts).length > 0));

      if (hasBatchCounts && curBatches.length > 0) {
        const updatedBatchList: any[] = [];
        const findBatchEntry = (b: any) => {
          if (Array.isArray(row.batchCounts)) {
            return row.batchCounts.find(
              (bc: any) =>
                bc &&
                ((bc.id && String(bc.id) === String(b.id)) ||
                  (String(bc.batch_number || "") === String(b.batch_number || "") &&
                    String(bc.expiry || "") === String(b.expiry || "")))
            );
          }
          return row.batchCounts[b.id];
        };
        for (const b of curBatches) {
          const rawEntry = findBatchEntry(b);
          const bAvail = round2(b.remaining ?? b.qty);
          if (rawEntry === undefined || rawEntry === null) {
            if (bAvail > 0) updatedBatchList.push(b);
            continue;
          }
          const bActual = typeof rawEntry === "object"
            ? (rawEntry.qty !== undefined || rawEntry.actual !== undefined
                ? Math.max(0, round2(rawEntry.qty ?? rawEntry.actual))
                : composeBaseQty({ boxes: Number(rawEntry.boxes) || 0, strips: Number(rawEntry.strips) || 0, pills: Number(rawEntry.pills) || 0 }, parseUnitsArray(cur.units)))
            : Math.max(0, round2(rawEntry));
          if (bActual < bAvail) {
            const bUnitCost = mult > 0 ? (Number(b.cost ?? cur.cost) || 0) / mult : (Number(b.cost ?? cur.cost) || 0);
            loss = round2(loss + (bAvail - bActual) * bUnitCost);
          }
          if (bActual > 0) {
            updatedBatchList.push({ ...b, qty: bActual, remaining: bActual });
          }
        }
        nextBatches = sortBatchesFefo(updatedBatchList);
        if (diff > 0 && loss > 0) weightedUnitCost = round4(loss / diff);
      } else if (diff > 0) {
        const res = deductBatchesFefo(curBatches, diff, Number(cur.cost) || 0, Number(cur.price) || 0, mult);
        nextBatches = res.nextBatches;
        loss = res.totalCost;
        weightedUnitCost = diff > 0 ? round4(res.totalCost / diff) : weightedUnitCost;
      } else if (diff < 0) {
        nextBatches = addOrMergeBatch(
          curBatches,
          {
            id: `BATCH-ST-${evId.slice(-6)}-${index}`,
            qty: Math.abs(diff),
            remaining: Math.abs(diff),
            cost: Number(cur.cost) || 0,
            price: Number(cur.price) || 0,
            expiry: cur.expiry || "",
            batch_number: cur.batch_number || "",
            createdAt: ts,
          },
          cur
        );
      }

      const fefoHead = nextBatches[0] || null;
      const updatedItem = {
        ...cur,
        qty: actual,
        batches: JSON.stringify(nextBatches),
        cost: fefoHead ? fefoHead.cost : cur.cost,
        price: fefoHead ? fefoHead.price : cur.price,
        expiry: fefoHead ? (fefoHead.expiry || cur.expiry) : cur.expiry,
      };
      invList[idx] = updatedItem;

      const reasonInfo = formatStockTakeReason(row.reasonCode || row.reason || "", -diff, "ar");
      postedLines.push({ ...row, id: cur.id, expectedBaseQty: before, actualBaseQty: actual, deltaBaseQty: -diff, absLossValue: loss });

      if (Math.abs(diff) > 0.0001) {
        const adjId = `ADJ-${evId}-${cur.id}`;
        if (!adjustments.some((a: any) => a.id === adjId)) {
          adjustments.unshift({
            id: adjId,
            drug_id: cur.id,
            drug_name: cur.name,
            barcode: cur.barcode || "",
            reason: row.notes ? `${reasonInfo.label} - ${row.notes}` : reasonInfo.label,
            reason_code: reasonInfo.code,
            qty: Math.abs(diff),
            direction: diff > 0 ? "shortage" : "surplus",
            cost: weightedUnitCost,
            loss_value: loss,
            recorded_by: p.actorName || "System",
            branch_id: cur.branch_id ?? null,
            session_id: targetId || null,
            created_at: ts,
          });
        }
        if (loss > 0 && !expenses.some((e: any) => e.id === `EXP-${evId}-${index}`)) {
          expenses.unshift({
            id: `EXP-${evId}-${index}`,
            category: "هدر وتلفيات",
            description: `عجز جرد: ${cur.name}`,
            notes: `${cur.name} (${reasonInfo.label})`,
            amount: loss,
            paymentMethod: "non_cash",
            branch_id: cur.branch_id ?? null,
            date: ts,
          });
        }
        if (!movements.some((m: any) => m.event_id === evId && m.drug_id === cur.id)) {
          movements.unshift({
            id: `SM-${evId}-${cur.id}`,
            drug_id: String(cur.id),
            drug_name: String(cur.name || ""),
            type: "stock_take",
            qty_before: before,
            qty_after: actual,
            delta: round2(actual - before),
            unit_cost: weightedUnitCost,
            batch_id: fefoHead?.id || "",
            batch_number: fefoHead?.batch_number || cur.batch_number || "",
            reference_id: targetId || evId,
            event_id: evId,
            actor_name: p.actorName || "System",
            notes: row.notes ? `${reasonInfo.label} - ${row.notes}` : reasonInfo.label,
            branch_id: cur.branch_id ?? null,
            created_at: ts,
          });
        }
      }
    }

    if (action === "POST_STOCK_TAKE_SESSION" && targetId) {
      const sIdx = sessions.findIndex((s: any) => String(s.id) === String(targetId));
      const summary = buildSessionSummary(postedLines);
      if (sIdx >= 0) {
        sessions[sIdx] = {
          ...sessions[sIdx],
          status: "posted",
          items_json: JSON.stringify(postedLines),
          summary_json: JSON.stringify(summary),
          posted_by: p.actorName || "System",
          posted_at: ts,
          updated_at: ts,
        };
      }
    }

    return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses, stockTakeSessions: sessions };
  }

  return { inventory: invList, stockAdjustments: adjustments, stockMovements: movements, expenses, stockTakeSessions: sessions };
}
