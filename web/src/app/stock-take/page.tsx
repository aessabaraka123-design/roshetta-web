"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppBar from "@/components/AppBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import SearchBar from "@/components/SearchBar";
import { WasteAdjustmentModal } from "@/components/inventory/InventoryActionModals";
import { ConflictResolutionModal, type ConflictStrategy } from "@/components/stock-take/ConflictResolutionModal";
import { SessionSetupModal } from "@/components/stock-take/SessionSetupModal";
import {
  canManageInventory,
  canViewCosts,
  composeBaseQty,
  decomposeBaseQty,
  extractBoxMultiplier,
  findUnitByBarcode,
  formatQtyWithUnits,
  getCategoryList,
  normalizeSearchText,
  parseBatchesArray,
  parseUnitsArray,
  resolveBranchName,
  round2,
  safeJson,
  type InventoryItemRecord,
} from "@/lib/inventory/domain";
import {
  submitStockTakeItems,
  useInventoryData,
  usePharmacyBranches,
  useStockAdjustmentsData,
} from "@/lib/inventory/api";
import {
  STOCK_TAKE_REASON_CODES,
  STOCK_TAKE_SCOPES,
  buildSessionSummary,
  computeShrinkageKpis,
  computeStockTakeLineDiff,
  formatSignedDeltaWithUnits,
  normalizeStockAdjustmentRow,
  reconcileConflictLine,
  type StockTakeScopeType,
} from "@/lib/stock-take/domain";
import {
  cancelStockTakeSession,
  createStockTakeSession,
  postStockTakeSession,
  updateStockTakeSession,
  useStockTakeSessionsData,
} from "@/lib/stock-take/api";
import { exportStockTakeVarianceExcel, printStockTakeCountSheet } from "@/lib/stock-take/export";
import {
  StockTakeTransportError,
  readStockTakeLocalSnapshot,
  removeStockTakeLocalSnapshot,
  saveStockTakeLocalSnapshot,
  type StockTakeConflictItem,
} from "@/lib/stock-take/transport";
import { useStore } from "@/store";

interface BatchCountEntry {
  batch_number: string;
  expiry: string;
  qty: number;
  cost: number;
}

interface CountDraft {
  itemId: string;
  boxes: number;
  strips: number;
  pills: number;
  counted: boolean;
  reasonCode: string;
  notes: string;
  batchCounts: BatchCountEntry[];
  expectedSnapshot: number;
}

export default function StockTakePage() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const pharmacyId = user?.pharmacy_id ? String(user.pharmacy_id) : "";
  const canManage = canManageInventory(user?.role);
  const canCount = canManage || user?.role === "pharmacist";
  const showCosts = canViewCosts(user?.role);

  const { inventory, isLoading: invLoading, mutate: mutateInv } = useInventoryData(pharmacyId);
  const { adjustments, mutate: mutateAdj } = useStockAdjustmentsData(pharmacyId);
  const { branches } = usePharmacyBranches(pharmacyId);
  const {
    sessions,
    shrinkageKpis: serverKpis,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useStockTakeSessionsData(pharmacyId, language);

  const [tab, setTab] = useState<"sessions" | "count" | "history">(canManage ? "sessions" : "count");
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [scanBarcode, setScanBarcode] = useState("");
  const [countFilter, setCountFilter] = useState<"all" | "pending" | "diff" | "high">("all");
  const [blindModeLocal, setBlindModeLocal] = useState<boolean>(!canManage);
  const [revealVariance, setRevealVariance] = useState<boolean>(false);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, CountDraft>>({});
  const [draftLoadedKey, setDraftLoadedKey] = useState<string>("");

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [wasteItem, setWasteItem] = useState<InventoryItemRecord | null>(null);
  const [conflicts, setConflicts] = useState<StockTakeConflictItem[] | null>(null);
  const [conflictLineMap, setConflictLineMap] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [confirmCancelSessionId, setConfirmCancelSessionId] = useState<string | null>(null);
  const [pendingZeroVarianceLines, setPendingZeroVarianceLines] = useState<any[] | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const activeItems = useMemo(() => inventory.filter((i) => !i.archived_at), [inventory]);
  const inventoryMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of activeItems) map.set(String(item.id), item);
    return map;
  }, [activeItems]);

  const categories = useMemo(() => {
    const base = getCategoryList(language).map((c) => c.label);
    const dynamic = Array.from(new Set(activeItems.map((i) => String(i.category || "").trim()).filter(Boolean)));
    return Array.from(new Set([...dynamic, ...base]));
  }, [activeItems, language]);

  const openDraftSessions = useMemo(
    () => sessions.filter((s: any) => s.status === "draft"),
    [sessions]
  );

  // Auto-select first open draft session when entering count or when pharmacist opens page
  useEffect(() => {
    if (!activeSessionId && openDraftSessions.length > 0) {
      setActiveSessionId(String(openDraftSessions[0].id));
    }
  }, [activeSessionId, openDraftSessions]);

  const activeSession = useMemo(
    () => sessions.find((s: any) => String(s.id) === String(activeSessionId)) || null,
    [sessions, activeSessionId]
  );

  const isSessionBlind = useMemo(() => {
    if (!canManage) return true;
    if (activeSession) return Boolean(activeSession.blind_mode);
    return blindModeLocal;
  }, [canManage, activeSession, blindModeLocal]);

  const maskNumbersNow = isSessionBlind && (!canManage || !revealVariance);

  // Hydrate drafts whenever pharmacyId or activeSession changes
  useEffect(() => {
    if (!pharmacyId) return;
    const storageKey = activeSession ? `draft_${activeSession.id}` : "draft_quick";
    if (draftLoadedKey === storageKey) return;

    const localSaved = readStockTakeLocalSnapshot<Record<string, CountDraft>>(pharmacyId, storageKey, {});
    if (activeSession) {
      const serverLines = safeJson<any[]>(activeSession.items_json, []);
      const hydrated: Record<string, CountDraft> = {};
      for (const line of serverLines) {
        const item = inventoryMap.get(String(line.id));
        const units = item?.units || line.units;
        const actualBase =
          line.actualQty !== null && line.actualQty !== undefined
            ? Number(line.actualQty)
            : Number(line.expectedQty ?? item?.qty ?? 0);
        const decomp = decomposeBaseQty(actualBase, units);
        hydrated[String(line.id)] = {
          itemId: String(line.id),
          boxes: decomp.boxes,
          strips: decomp.strips,
          pills: decomp.pills,
          counted: Boolean(line.counted),
          reasonCode: line.reasonCode || line.reason || "count_adjustment",
          notes: line.notes || "",
          batchCounts: Array.isArray(line.batchCounts) ? line.batchCounts : [],
          expectedSnapshot: Number(line.expectedQty ?? item?.qty ?? 0),
        };
      }
      // Prefer locally unsaved dirty edits if timestamps exist
      setDrafts({ ...hydrated, ...localSaved });
    } else {
      setDrafts(localSaved);
    }
    setRevealVariance(false);
    setDraftLoadedKey(storageKey);
  }, [pharmacyId, activeSession, inventoryMap, draftLoadedKey]);

  // Persist drafts to localStorage
  useEffect(() => {
    if (!pharmacyId || !draftLoadedKey) return;
    saveStockTakeLocalSnapshot(pharmacyId, draftLoadedKey, drafts);
  }, [pharmacyId, draftLoadedKey, drafts]);

  const sessionScopeItems = useMemo(() => {
    if (activeSession) {
      const serverLines = safeJson<any[]>(activeSession.items_json, []);
      const mapLines = new Map<string, any>();
      for (const l of serverLines) mapLines.set(String(l.id), l);
      const fromInv = serverLines
        .map((l) => {
          const live = inventoryMap.get(String(l.id));
          return live ? { ...live, __sessionExpected: l.expectedQty } : { id: l.id, name: l.name, barcode: l.barcode, qty: l.expectedQty ?? 0, units: l.units, cost: l.weightedUnitCost ?? 0, __sessionExpected: l.expectedQty };
        });
      return fromInv;
    }
    return activeItems;
  }, [activeSession, activeItems, inventoryMap]);

  const getDraftForItem = (item: any): CountDraft => {
    const existing = drafts[String(item.id)];
    if (existing) return existing;
    const baseQty = Number(item.__sessionExpected ?? item.qty ?? 0);
    const decomp = decomposeBaseQty(baseQty, item.units);
    return {
      itemId: String(item.id),
      boxes: decomp.boxes,
      strips: decomp.strips,
      pills: decomp.pills,
      counted: false,
      reasonCode: "count_adjustment",
      notes: "",
      batchCounts: [],
      expectedSnapshot: baseQty,
    };
  };

  const updateItemDraft = (item: any, patch: Partial<CountDraft>) => {
    const id = String(item.id);
    setDrafts((prev) => {
      const cur = prev[id] || getDraftForItem(item);
      return {
        ...prev,
        [id]: { ...cur, ...patch, counted: patch.counted !== undefined ? patch.counted : true },
      };
    });
  };

  const updateBatchDraftQty = (item: any, batch: any, nextBatchQty: number) => {
    const existingBatches = parseBatchesArray(item.batches, item);
    const id = String(item.id);
    const cur = drafts[id] || getDraftForItem(item);
    const curMap = new Map<string, BatchCountEntry>();
    for (const b of existingBatches) {
      curMap.set(`${b.batch_number}__${b.expiry}`, {
        batch_number: b.batch_number,
        expiry: b.expiry,
        qty: Number(b.qty || 0),
        cost: Number(b.cost ?? item.cost ?? item.purchase_price ?? 0),
      });
    }
    for (const prevB of cur.batchCounts || []) {
      curMap.set(`${prevB.batch_number}__${prevB.expiry}`, prevB);
    }
    curMap.set(`${batch.batch_number}__${batch.expiry}`, {
      batch_number: batch.batch_number,
      expiry: batch.expiry,
      qty: Math.max(0, Math.round(nextBatchQty)),
      cost: Number(batch.cost ?? item.cost ?? item.purchase_price ?? 0),
    });
    const nextBatchCounts = Array.from(curMap.values());
    const sumQty = nextBatchCounts.reduce((acc, b) => acc + Number(b.qty || 0), 0);
    const decomp = decomposeBaseQty(sumQty, item.units);
    updateItemDraft(item, {
      boxes: decomp.boxes,
      strips: decomp.strips,
      pills: decomp.pills,
      batchCounts: nextBatchCounts,
      counted: true,
    });
  };

  // Compute all lines with unified domain engine
  const computedLines = useMemo(() => {
    return sessionScopeItems.map((item) => {
      const draft = drafts[String(item.id)] || getDraftForItem(item);
      const expectedQty =
        activeSession && draft.expectedSnapshot !== undefined && draft.expectedSnapshot !== null
          ? draft.expectedSnapshot
          : Number(item.qty || 0);
      const itemForDiff = { ...item, qty: expectedQty };
      const lineDiff = computeStockTakeLineDiff(
        itemForDiff,
        {
          boxes: draft.boxes,
          strips: draft.strips,
          pills: draft.pills,
          counted: draft.counted,
          reasonCode: draft.reasonCode,
          notes: draft.notes,
          batchCounts: draft.batchCounts,
          units: item.units,
        },
        language
      );
      return { ...lineDiff, item, draft };
    });
  }, [sessionScopeItems, drafts, activeSession, language]);

  const totalStockCostValue = useMemo(
    () =>
      activeItems.reduce((sum, it: any) => {
        const boxMult = extractBoxMultiplier(it.units);
        const unitCost = boxMult > 1 && Number(it.cost) > 0 ? Number(it.cost) / boxMult : Number(it.cost || it.purchase_price || 0);
        return sum + Math.max(0, Number(it.qty || 0)) * unitCost;
      }, 0),
    [activeItems]
  );

  const liveSummary = useMemo(
    () => buildSessionSummary(computedLines, totalStockCostValue),
    [computedLines, totalStockCostValue]
  );

  const visibleLines = useMemo(() => {
    const q = normalizeSearchText(search);
    return computedLines.filter((line) => {
      if (q) {
        const matchSearch =
          normalizeSearchText(line.name).includes(q) ||
          normalizeSearchText(line.item?.scientificName).includes(q) ||
          String(line.barcode || "").includes(search.trim());
        if (!matchSearch) return false;
      }
      if (countFilter === "pending") return !line.counted;
      if (countFilter === "diff") return !maskNumbersNow && line.deltaBaseQty !== 0;
      if (countFilter === "high") return !maskNumbersNow && line.isHighVariance;
      return true;
    });
  }, [computedLines, search, countFilter, maskNumbersNow]);

  // USB / Keyboard Barcode Scan-to-Increment
  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanBarcode.trim();
    if (!code) return;

    let matchedLine: any = null;
    let tierName: "box" | "strip" | "pill" = "box";
    let tierIdx = 0;

    for (const line of computedLines) {
      const hit = findUnitByBarcode(line.item, code);
      if (hit && hit.matched) {
        matchedLine = line;
        tierIdx = Number(hit.unitIndex || 0);
        const nameLower = String(hit.unitName || "").toLowerCase();
        const units = parseUnitsArray(line.item.units);
        if (units.length === 1 || (tierIdx === units.length - 1 && units.length >= 3)) {
          tierName = units.length === 1 ? "box" : "pill";
        } else if (tierIdx === 0) {
          tierName = "box";
        } else if (tierIdx === 1 && units.length >= 3) {
          tierName = "strip";
        } else if (nameLower.includes("strip") || nameLower.includes("شريط")) {
          tierName = "strip";
        } else {
          tierName = "pill";
        }
        break;
      }
    }

    if (!matchedLine) {
      toast.error(isEn ? `Barcode not found in scope: ${code}` : `لم يتم العثور على الباركود ضمن النطاق: ${code}`);
      setScanBarcode("");
      return;
    }

    const cur = drafts[String(matchedLine.id)] || getDraftForItem(matchedLine.item);
    // If never counted yet and Blind Mode, start physical scan count from 0 + 1; otherwise increment current count
    const baseDraft: CountDraft =
      !cur.counted && isSessionBlind
        ? { ...cur, boxes: 0, strips: 0, pills: 0, counted: true }
        : { ...cur, counted: true };

    const nextDraft: CountDraft = {
      ...baseDraft,
      boxes: tierName === "box" ? baseDraft.boxes + 1 : baseDraft.boxes,
      strips: tierName === "strip" ? baseDraft.strips + 1 : baseDraft.strips,
      pills: tierName === "pill" ? baseDraft.pills + 1 : baseDraft.pills,
      counted: true,
    };

    updateItemDraft(matchedLine.item, nextDraft);
    setSearch(matchedLine.name || code);
    setScanBarcode("");
    toast.success(
      isEn
        ? `+1 scanned: ${matchedLine.name}`
        : `تم عدّ +1: ${matchedLine.name}`
    );
    scanInputRef.current?.focus();
  };

  const buildPayloadLines = (overrideLines?: any[]) => {
    const src = overrideLines || computedLines;
    return src.map((l) => ({
      id: l.id,
      actual: Number(l.actualBaseQty ?? l.actualQty ?? 0),
      actualQty: Number(l.actualBaseQty ?? l.actualQty ?? 0),
      expectedQty: Number(l.expectedBaseQty ?? l.expectedQty ?? 0),
      counted: Boolean(l.counted),
      reason: l.reasonCode || "count_adjustment",
      reasonCode: l.reasonCode || "count_adjustment",
      notes: l.notes || "",
      batchCounts: Array.isArray(l.batchCounts) && l.batchCounts.length > 0 ? l.batchCounts : l.draft?.batchCounts || [],
    }));
  };

  const handleSaveDraftToServer = async () => {
    if (!activeSession || !pharmacyId) return;
    setSavingDraft(true);
    try {
      await updateStockTakeSession(
        pharmacyId,
        activeSession.id,
        {
          items: buildPayloadLines(),
          blindMode: isSessionBlind,
        },
        language
      );
      await mutateSessions();
      toast.success(isEn ? "Draft synced to server" : "تمت مزامنة مسودة الجرد مع السيرفر");
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to sync draft" : "فشل حفظ المسودة"));
    } finally {
      setSavingDraft(false);
    }
  };

  const executePostSession = async (overrideLines?: any[]) => {
    if (!canManage || !pharmacyId || !activeSession) return;
    const payloadItems = buildPayloadLines(overrideLines);
    setSubmitting(true);
    try {
      await postStockTakeSession(
        pharmacyId,
        activeSession.id,
        { items: payloadItems },
        language
      );
      removeStockTakeLocalSnapshot(pharmacyId, `draft_${activeSession.id}`);
      setActiveSessionId("");
      setDraftLoadedKey("");
      await Promise.all([mutateInv(), mutateAdj(), mutateSessions()]);
      toast.success(isEn ? "Stock take session posted" : "تم اعتماد وترحيل جلسة الجرد بنجاح");
      setTab("sessions");
    } catch (err: any) {
      if (err instanceof StockTakeTransportError && err.status === 409 && err.conflicts?.length) {
        const map: Record<string, any> = {};
        for (const l of overrideLines || computedLines) map[String(l.id)] = l;
        setConflictLineMap(map);
        setConflicts(err.conflicts);
        return;
      }
      toast.error(err?.message || (isEn ? "Failed to post session" : "فشل ترحيل الجلسة"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostSession = async (overrideLines?: any[], skipZeroCheck = false) => {
    if (!canManage || !pharmacyId) return;
    const countedChanged = (overrideLines || computedLines).filter(
      (l) => l.counted || l.deltaBaseQty !== 0
    );

    if (activeSession) {
      if (countedChanged.length === 0 && !skipZeroCheck) {
        setPendingZeroVarianceLines(overrideLines || computedLines);
        return;
      }
      await executePostSession(overrideLines);
      return;
    }

    // Quick Instant Mode (without saved draft session) -> create & post or call /stock-take
    const diffs = computedLines.filter((l) => l.deltaBaseQty !== 0);
    if (diffs.length === 0) {
      toast.error(isEn ? "No differences detected" : "لا توجد أي تعديلات في الكميات لحفظها.");
      return;
    }

    setSubmitting(true);
    try {
      await submitStockTakeItems(
        pharmacyId,
        diffs.map((d) => ({
          id: d.id,
          actual: d.actualBaseQty,
          expectedQty: d.expectedBaseQty,
          reasonCode: d.reasonCode,
          reason: d.reasonCode,
          notes: d.notes,
          batchCounts: d.draft?.batchCounts || [],
        })) as any,
        language
      );
      removeStockTakeLocalSnapshot(pharmacyId, "draft_quick");
      setDrafts({});
      setDraftLoadedKey("");
      await Promise.all([mutateInv(), mutateAdj(), mutateSessions()]);
      toast.success(isEn ? "Quick stock take posted" : "تم اعتماد الجرد الفوري بنجاح");
      setTab("history");
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to post stock take" : "تعذر اعتماد الجرد"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveConflicts = async (strategies: Record<string, ConflictStrategy>) => {
    if (!conflicts) return;
    const conflictById = new Map<string, StockTakeConflictItem>();
    for (const c of conflicts) conflictById.set(String(c.id), c);

    const updatedLines = computedLines.map((line) => {
      const conflict = conflictById.get(String(line.id));
      if (!conflict) return line;
      const strat = strategies[String(line.id)] || "shift_by_sale";
      const patched = reconcileConflictLine(conflictLineMap[String(line.id)] || line, conflict, strat);
      return {
        ...line,
        actualBaseQty: patched.actualBaseQty ?? patched.actualQty,
        expectedBaseQty: patched.expectedBaseQty ?? patched.expectedQty,
        counted: true,
        notes: patched.notes || line.notes,
      };
    });

    // Also update local UI drafts so inputs reflect reconciled counts
    setDrafts((prev) => {
      const next = { ...prev };
      for (const line of updatedLines) {
        if (!conflictById.has(String(line.id))) continue;
        const units = line.item?.units;
        const decomp = decomposeBaseQty(line.actualBaseQty, units);
        next[String(line.id)] = {
          ...(next[String(line.id)] || getDraftForItem(line.item)),
          boxes: decomp.boxes,
          strips: decomp.strips,
          pills: decomp.pills,
          counted: true,
          expectedSnapshot: line.expectedBaseQty,
          notes: line.notes || "",
        };
      }
      return next;
    });

    setConflicts(null);
    await handlePostSession(updatedLines);
  };

  const handleCreateSession = async (opts: {
    title: string;
    scopeType: StockTakeScopeType;
    scopeValue: string;
    branchId: string;
    blindMode: boolean;
    notes: string;
    items: any[];
  }) => {
    if (!pharmacyId) return;
    setSubmitting(true);
    try {
      const res = await createStockTakeSession(
        pharmacyId,
        {
          title: opts.title,
          scopeType: opts.scopeType,
          scopeValue: opts.scopeValue,
          branchId: opts.branchId || null,
          blindMode: opts.blindMode,
          notes: opts.notes,
          items: opts.items.map((it) => ({
            id: it.id,
            expectedQty: Number(it.qty || 0),
          })),
        },
        language
      );
      await mutateSessions();
      const createdId = res?.data?.session?.id;
      if (createdId) {
        setActiveSessionId(String(createdId));
        setDraftLoadedKey("");
      }
      setShowSetupModal(false);
      setTab("count");
      toast.success(isEn ? "Stock take session started" : "تم فتح جلسة الجرد بنجاح");
    } catch (err: any) {
      toast.error(err?.message || (isEn ? "Failed to create session" : "تعذر إنشاء الجلسة"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSession = (sessionId: string) => {
    if (!pharmacyId) return;
    setConfirmCancelSessionId(sessionId);
  };

  const confirmCancelSession = async () => {
    if (!pharmacyId || !confirmCancelSessionId) return;
    const sessionId = confirmCancelSessionId;
    setSubmitting(true);
    try {
      await cancelStockTakeSession(pharmacyId, sessionId, language);
      if (String(activeSessionId) === String(sessionId)) {
        setActiveSessionId("");
        setDraftLoadedKey("");
      }
      setConfirmCancelSessionId(null);
      await mutateSessions();
      toast.success(isEn ? "Session cancelled" : "تم إلغاء الجلسة");
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel session");
    } finally {
      setSubmitting(false);
    }
  };

  const shrinkageKpis = useMemo(
    () => serverKpis || computeShrinkageKpis(adjustments, activeItems, sessions, language),
    [serverKpis, adjustments, activeItems, sessions, language]
  );

  const normalizedAdjustments = useMemo(
    () => adjustments.map((a: any) => normalizeStockAdjustmentRow(a, language)),
    [adjustments, language]
  );

  if (!canCount) {
    return (
      <div className="min-h-screen bg-bg">
        <AppBar title={isEn ? "Stock Take & Shrinkage" : "الجرد والتوالف"} />
        <div className="p-8 max-w-xl mx-auto text-center">
          <div className="bg-white rounded-[24px] p-8 border border-mint-line shadow-sm">
            <h2 className="text-[18px] font-black text-ink mb-2">
              {isEn ? "Access Restricted" : "صلاحية غير متاحة"}
            </h2>
            <p className="text-[13px] font-bold text-ink-soft">
              {isEn
                ? "Stock take is limited to pharmacy managers and authorized pharmacists."
                : "قسم الجرد متاح لمدير الصيدلية أو الصيدلي المناوب على جلسات الجرد المفتوحة."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <AppBar
        title={isEn ? "Stock Take & Shrinkage Management" : "الجرد والتوالف وتحليل الفاقد"}
      />

      <main className="p-4 lg:p-6 max-w-[1440px] mx-auto space-y-5">
        {/* Top Bar: Tabs & Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setTab("sessions")}
                className={`px-4 py-2 rounded-[14px] text-[13px] font-black transition-all ${
                  tab === "sessions" ? "bg-primary text-white shadow-sm" : "bg-white text-ink-soft border border-mint-line"
                }`}
              >
                📊 {isEn ? "Sessions & Shrinkage" : "الجلسات وتحليل الفاقد"} ({sessions.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab("count")}
              className={`px-4 py-2 rounded-[14px] text-[13px] font-black transition-all ${
                tab === "count" ? "bg-primary text-white shadow-sm" : "bg-white text-ink-soft border border-mint-line"
              }`}
            >
              📋 {isEn ? "Active Count" : "شاشة العدّ النشطة"}
              {activeSession ? ` (${activeSession.session_number})` : ""}
            </button>
            {canManage && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`px-4 py-2 rounded-[14px] text-[13px] font-black transition-all ${
                  tab === "history" ? "bg-coral text-white shadow-sm" : "bg-white text-ink-soft border border-mint-line"
                }`}
              >
                🧾 {isEn ? "Adjustments Ledger" : "سجل التوالف والفروقات"} ({normalizedAdjustments.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="px-4 py-2 rounded-[14px] bg-emerald-600 text-white text-[13px] font-black hover:bg-emerald-700 shadow-sm"
              >
                + {isEn ? "New Stock Take Session" : "جلسة جرد جديدة"}
              </button>
            )}
          </div>
        </div>

        {/* ───────── TAB 1: SESSIONS & SHRINKAGE KPIs ───────── */}
        {tab === "sessions" && canManage && (
          <div className="space-y-5">
            {/* Shrinkage Analytics KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {showCosts && (
                <>
                  <div className="bg-white rounded-[20px] p-4 border border-mint-line shadow-sm">
                    <div className="text-[11px] font-bold text-ink-soft">
                      {isEn ? "Total Shrinkage / Waste Loss" : "إجمالي خسائر التوالف والعجز"}
                    </div>
                    <div className="text-[20px] font-black font-mono text-coral mt-1">
                      {round2(shrinkageKpis?.totalLossValue ?? 0).toFixed(2)} ₪
                    </div>
                  </div>
                  <div className="bg-white rounded-[20px] p-4 border border-mint-line shadow-sm">
                    <div className="text-[11px] font-bold text-ink-soft">
                      {isEn ? "Total Surplus Found" : "إجمالي الفائض المكتشف"}
                    </div>
                    <div className="text-[20px] font-black font-mono text-emerald-600 mt-1">
                      +{round2(shrinkageKpis?.totalSurplusValue ?? 0).toFixed(2)} ₪
                    </div>
                  </div>
                  <div className="bg-white rounded-[20px] p-4 border border-mint-line shadow-sm">
                    <div className="text-[11px] font-bold text-ink-soft">
                      {isEn ? "Shrinkage % of Inventory" : "نسبة الفاقد من المخزون"}
                    </div>
                    <div className="text-[20px] font-black font-mono text-ink mt-1">
                      {round2(shrinkageKpis?.shrinkagePctOfStock ?? 0).toFixed(2)}%
                    </div>
                  </div>
                </>
              )}
              <div className="bg-white rounded-[20px] p-4 border border-mint-line shadow-sm">
                <div className="text-[11px] font-bold text-ink-soft">
                  {isEn ? "Stock Take Sessions" : "جلسات الجرد"}
                </div>
                <div className="text-[20px] font-black font-mono text-primary mt-1">
                  {shrinkageKpis?.postedCount ?? 0}{" "}
                  <span className="text-[12px] text-ink-soft font-bold">
                    {isEn ? "posted" : "معتمدة"} / {shrinkageKpis?.draftCount ?? 0}{" "}
                    {isEn ? "draft" : "مفتوحة"}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason & Top Loss Insights */}
            {showCosts && (shrinkageKpis?.byReason?.length > 0 || shrinkageKpis?.topLossDrugs?.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-[22px] p-4 border border-mint-line shadow-sm">
                  <h3 className="text-[13px] font-black text-ink mb-3">
                    {isEn ? "Shrinkage by Reason" : "توزيع الفروقات والتوالف حسب السبب"}
                  </h3>
                  <div className="space-y-2">
                    {(shrinkageKpis?.byReason || []).slice(0, 5).map((r: any) => (
                      <div key={r.reasonCode} className="flex items-center justify-between text-[12px] py-1.5 border-b border-mint-line/60 last:border-0">
                        <span className="font-bold text-ink">{r.label} ({r.count})</span>
                        <span className="font-mono font-black text-coral">
                          -{round2(r.lossValue).toFixed(2)} ₪
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-[22px] p-4 border border-mint-line shadow-sm">
                  <h3 className="text-[13px] font-black text-ink mb-3">
                    {isEn ? "Highest Shrinkage Items" : "الأصناف الأعلى فقداً وتلفاً"}
                  </h3>
                  <div className="space-y-2">
                    {(shrinkageKpis?.topLossDrugs || []).slice(0, 5).map((d: any) => (
                      <div key={d.drug_id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-mint-line/60 last:border-0">
                        <span className="font-bold text-ink">{d.drug_name} ({d.events})</span>
                        <span className="font-mono font-black text-coral">
                          -{round2(d.lossValue).toFixed(2)} ₪
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sessions List */}
            <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-x-auto">
              {sessionsLoading && sessions.length === 0 ? (
                <div className="p-10 text-center text-ink-soft font-bold">
                  {isEn ? "Loading sessions..." : "جارٍ تحميل جلسات الجرد..."}
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-10 text-center space-y-3">
                  <div className="font-bold text-ink-soft">
                    {isEn
                      ? "No stock take sessions yet. Start a synchronized draft session or count directly."
                      : "لا توجد جلسات جرد محفوظة بعد. يمكنك فتح جلسة جرد جديدة متزامنة مع الموبايل أو العدّ المباشر."}
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSetupModal(true)}
                      className="px-4 py-2 rounded-[12px] bg-primary text-white text-[13px] font-black"
                    >
                      + {isEn ? "New Session" : "فتح جلسة جرد"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSessionId("");
                        setDraftLoadedKey("");
                        setTab("count");
                      }}
                      className="px-4 py-2 rounded-[12px] bg-bg border border-mint-line text-ink text-[13px] font-bold"
                    >
                      {isEn ? "Quick Count" : "عدّ فوري بدون جلسة"}
                    </button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-bg/80 text-ink-soft text-[12px] font-black border-b border-mint-line">
                      <th className="p-3.5 text-start">{isEn ? "Session #" : "رقم الجلسة"}</th>
                      <th className="p-3.5 text-start">{isEn ? "Title & Scope" : "العنوان والنطاق"}</th>
                      <th className="p-3.5 text-center">{isEn ? "Status" : "الحالة"}</th>
                      <th className="p-3.5 text-center">{isEn ? "Progress" : "التقدم"}</th>
                      {showCosts && <th className="p-3.5 text-center">{isEn ? "Net Impact" : "الأثر المالي"}</th>}
                      <th className="p-3.5 text-center">{isEn ? "Actions" : "إجراءات"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: any) => {
                      const sum = safeJson<any>(s.summary_json, {});
                      const lines = safeJson<any[]>(s.items_json, []);
                      const scopeMeta = STOCK_TAKE_SCOPES.find((sc) => sc.code === s.scope_type);
                      const statusColor =
                        s.status === "posted"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.status === "cancelled"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-100 text-amber-800";
                      const statusLabel =
                        s.status === "posted"
                          ? isEn ? "Posted" : "معتمدة"
                          : s.status === "cancelled"
                            ? isEn ? "Cancelled" : "ملغاة"
                            : isEn ? "Draft" : "مسودة مفتوحة";

                      return (
                        <tr key={s.id} className="border-b border-mint-line hover:bg-bg/40">
                          <td className="p-3.5">
                            <div className="font-mono font-black text-primary">{s.session_number}</div>
                            <div className="text-[11px] text-ink-soft">
                              {String(s.created_at || "").slice(0, 16).replace("T", " ")}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-black text-ink">{s.title}</div>
                            <div className="text-[11px] text-ink-soft flex flex-wrap gap-1.5 mt-0.5">
                              <span>{isEn ? scopeMeta?.labelEn || s.scope_type : scopeMeta?.labelAr || s.scope_type}</span>
                              {s.branch_id && (
                                <span>• {resolveBranchName(branches, s.branch_id, "", language)}</span>
                              )}
                              {Boolean(s.blind_mode) && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                  🔒 {isEn ? "Blind" : "أعمى"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono text-[12px]">
                            <span className="font-black">{sum.countedLines ?? sum.countedCount ?? 0}/{sum.totalLines ?? sum.totalItems ?? lines.length}</span>
                            {s.status === "posted" && (
                              <div className="text-[11px] text-ink-soft">
                                {sum.changedLinesCount ?? sum.discrepancyCount ?? 0} {isEn ? "diff" : "فروقات"}
                              </div>
                            )}
                          </td>
                          {showCosts && (
                            <td className="p-3.5 text-center font-mono font-black">
                              {s.status === "posted" ? (
                                <span className={(sum.netVarianceValue || 0) < 0 ? "text-coral" : (sum.netVarianceValue || 0) > 0 ? "text-emerald-600" : "text-ink-soft"}>
                                  {(sum.netVarianceValue || 0) > 0 ? "+" : ""}
                                  {round2(sum.netVarianceValue ?? 0).toFixed(2)} ₪
                                </span>
                              ) : (
                                <span className="text-ink-soft">—</span>
                              )}
                            </td>
                          )}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {s.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSessionId(String(s.id));
                                    setDraftLoadedKey("");
                                    setTab("count");
                                  }}
                                  className="px-3 py-1.5 rounded-[10px] bg-primary text-white text-[11px] font-black"
                                >
                                  {isEn ? "Continue" : "متابعة العدّ"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  exportStockTakeVarianceExcel({
                                    sessionNumber: s.session_number,
                                    title: s.title,
                                    lines,
                                    summary: sum,
                                    showCosts,
                                    language,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-[10px] bg-bg border border-mint-line text-[11px] font-bold text-ink"
                              >
                                Excel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  printStockTakeCountSheet({
                                    sessionNumber: s.session_number,
                                    title: s.title,
                                    lines,
                                    blindMode: Boolean(s.blind_mode) && s.status === "draft",
                                    language,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-[10px] bg-bg border border-mint-line text-[11px] font-bold text-ink"
                              >
                                🖨️
                              </button>
                              {s.status === "draft" && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelSession(s.id)}
                                  className="px-2.5 py-1.5 rounded-[10px] bg-coral/10 text-coral text-[11px] font-bold"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ───────── TAB 2: ACTIVE COUNT SCREEN ───────── */}
        {tab === "count" && (
          <div className="space-y-4">
            {/* Session Selector + Blind Mode Controls */}
            <div className="bg-white rounded-[20px] p-4 border border-mint-line shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {openDraftSessions.length > 0 && (
                  <select
                    value={activeSessionId}
                    onChange={(e) => {
                      setActiveSessionId(e.target.value);
                      setDraftLoadedKey("");
                    }}
                    className="px-3.5 py-2 rounded-[12px] bg-bg border border-mint-line text-[13px] font-black text-ink outline-none"
                  >
                    {canManage && <option value="">{isEn ? "Quick Count (All Items)" : "عدّ فوري مباشر (جميع الأصناف)"}</option>}
                    {openDraftSessions.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.session_number} — {s.title}
                      </option>
                    ))}
                  </select>
                )}

                {!activeSession && canManage && (
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-amber-50 border border-amber-200 text-[12px] font-black text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blindModeLocal}
                      onChange={(e) => setBlindModeLocal(e.target.checked)}
                      className="accent-amber-600"
                    />
                    🔒 {isEn ? "Blind Mode" : "وضع الجرد الأعمى"}
                  </label>
                )}

                {isSessionBlind && canManage && (
                  <button
                    type="button"
                    onClick={() => setRevealVariance((v) => !v)}
                    className={`px-3 py-1.5 rounded-[12px] text-[12px] font-black border ${
                      revealVariance
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-bg border-mint-line text-ink-soft"
                    }`}
                  >
                    {revealVariance
                      ? isEn ? "👁️ Hiding Variances: OFF" : "👁️ إخفاء الدفتري (معاينة الفروقات مفعّلة)"
                      : isEn ? "👁️ Reveal Variances for Review" : "👁️ معاينة الدفتري والفروقات للمراجعة"}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printStockTakeCountSheet({
                      sessionNumber: activeSession?.session_number,
                      title: activeSession?.title,
                      lines: computedLines,
                      blindMode: maskNumbersNow,
                      language,
                    })
                  }
                  className="px-3 py-1.5 rounded-[12px] bg-bg border border-mint-line text-[12px] font-bold text-ink hover:bg-bg/80"
                >
                  🖨️ {isEn ? "Print Sheet" : "طباعة كشف العدّ"}
                </button>
                {!maskNumbersNow && (
                  <button
                    type="button"
                    onClick={() =>
                      exportStockTakeVarianceExcel({
                        sessionNumber: activeSession?.session_number,
                        title: activeSession?.title,
                        lines: computedLines,
                        summary: liveSummary,
                        showCosts,
                        language,
                      })
                    }
                    className="px-3 py-1.5 rounded-[12px] bg-bg border border-mint-line text-[12px] font-bold text-ink hover:bg-bg/80"
                  >
                    📥 Excel
                  </button>
                )}
              </div>
            </div>

            {!canManage && !activeSession && (
              <div className="bg-white rounded-[24px] p-10 text-center border border-mint-line shadow-sm text-ink-soft font-bold">
                {isEn
                  ? "No open draft stock take session right now. Wait for the pharmacy manager to start a session."
                  : "لا توجد جلسة جرد مفتوحة حالياً. يرجى انتظار مدير الصيدلية لفتح جلسة جرد."}
              </div>
            )}

            {(canManage || activeSession) && (
              <>
                {/* Barcode Scan-to-Increment + Search + Filter Chips */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                  <form onSubmit={handleBarcodeScan} className="lg:col-span-4 flex gap-2">
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanBarcode}
                      onChange={(e) => setScanBarcode(e.target.value)}
                      placeholder={isEn ? "Scan barcode (+1 auto-increment)..." : "امسح الباركود للعدّ السريع (+1)..."}
                      className="flex-1 px-3.5 py-2.5 rounded-[14px] bg-white border border-primary/40 text-[13px] font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2.5 rounded-[14px] bg-primary text-white text-[12px] font-black"
                    >
                      +1
                    </button>
                  </form>

                  <div className="lg:col-span-4">
                    <SearchBar
                      value={search}
                      onChange={setSearch}
                      placeholder={isEn ? "Search drug name or barcode..." : "ابحث بالاسم أو الباركود..."}
                    />
                  </div>

                  <div className="lg:col-span-4 flex flex-wrap gap-1.5 justify-end">
                    {(
                      [
                        { id: "all", ar: "الكل", en: "All" },
                        { id: "pending", ar: "لم يُعدّ", en: "Uncounted" },
                        ...(!maskNumbersNow
                          ? [
                              { id: "diff", ar: "بها فروقات", en: "Variances" },
                              { id: "high", ar: "فارق مرتفع", en: "High Variance" },
                            ]
                          : []),
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCountFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-[10px] text-[12px] font-bold border ${
                          countFilter === f.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-white border-mint-line text-ink-soft"
                        }`}
                      >
                        {isEn ? f.en : f.ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Summary Header + Save/Post Actions */}
                <div className="bg-white rounded-[22px] p-4 border border-mint-line shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-5">
                    <div>
                      <span className="text-[11px] font-bold text-ink-soft block">
                        {isEn ? "Count Progress" : "نسبة الإنجاز"}
                      </span>
                      <span className="text-[16px] font-black font-mono text-ink">
                        {liveSummary.countedLines} / {liveSummary.totalLines}
                      </span>
                    </div>
                    {!maskNumbersNow && (
                      <>
                        <div>
                          <span className="text-[11px] font-bold text-ink-soft block">
                            {isEn ? "Discrepancies" : "الأصناف المختلفة"}
                          </span>
                          <span className="text-[16px] font-black font-mono text-amber-600">
                            {liveSummary.changedLinesCount}
                          </span>
                        </div>
                        {showCosts && (
                          <div>
                            <span className="text-[11px] font-bold text-ink-soft block">
                              {isEn ? "Net Financial Impact" : "صافي الأثر المالي"}
                            </span>
                            <span className={`text-[16px] font-black font-mono ${liveSummary.netVarianceValue < 0 ? "text-coral" : liveSummary.netVarianceValue > 0 ? "text-emerald-600" : "text-ink"}`}>
                              {liveSummary.netVarianceValue > 0 ? "+" : ""}
                              {round2(liveSummary.netVarianceValue).toFixed(2)} ₪
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {maskNumbersNow && (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[12px] font-black">
                        🔒 {isEn ? "Blind Count Active — Book Qty Masked" : "وضع الجرد الأعمى مفعل — الرصيد الدفتري مخفي"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeSession && (
                      <button
                        type="button"
                        disabled={savingDraft}
                        onClick={handleSaveDraftToServer}
                        className="px-4 py-2.5 rounded-[14px] bg-bg border border-mint-line text-ink text-[13px] font-black hover:bg-bg/80 disabled:opacity-50"
                      >
                        {savingDraft
                          ? isEn ? "Syncing..." : "جارٍ المزامنة..."
                          : isEn ? "Save Draft to Cloud" : "حفظ مسودة للسيرفر"}
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handlePostSession()}
                        className="px-5 py-2.5 rounded-[14px] bg-primary text-white text-[13px] font-black hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                      >
                        {submitting
                          ? isEn ? "Posting..." : "جارٍ الاعتماد..."
                          : activeSession
                            ? isEn ? "Post Session & Reconcile" : "اعتماد وترحيل الجلسة"
                            : isEn ? "Post Stock Take" : "اعتماد الجرد الفوري"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Counting Table */}
                <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-x-auto">
                  {invLoading && activeItems.length === 0 ? (
                    <div className="p-12 text-center font-bold text-ink-soft">
                      {isEn ? "Loading inventory..." : "جارٍ تحميل الأصناف..."}
                    </div>
                  ) : visibleLines.length === 0 ? (
                    <div className="p-12 text-center font-bold text-ink-soft">
                      {isEn ? "No matching items." : "لا توجد أصناف مطابقة."}
                    </div>
                  ) : (
                    <table className="w-full text-[13px] border-collapse">
                      <thead>
                        <tr className="bg-bg/80 text-ink-soft text-[12px] font-black border-b border-mint-line">
                          <th className="p-3.5 text-start">{isEn ? "Item" : "الصنف"}</th>
                          <th className="p-3.5 text-center">{isEn ? "Expected" : "الدفتري"}</th>
                          <th className="p-3.5 text-center">{isEn ? "Boxes | Strips | Pills" : "علبة | شريط | حبة"}</th>
                          <th className="p-3.5 text-center">{isEn ? "Variance" : "الفرق"}</th>
                          <th className="p-3.5 text-center">{isEn ? "Reason & Notes" : "السبب والملاحظة"}</th>
                          {canManage && <th className="p-3.5 text-center">{isEn ? "Waste" : "تالف"}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLines.map((line) => {
                          const item = line.item;
                          const units = parseUnitsArray(item.units);
                          const hasStrips = units.length >= 3;
                          const hasPills = units.length >= 2;
                          const draft = line.draft;
                          const batches = parseBatchesArray(item.batches, item);
                          const batchExpanded = Boolean(expandedBatches[line.id]);
                          const diffColor =
                            line.deltaBaseQty < 0
                              ? "text-coral"
                              : line.deltaBaseQty > 0
                                ? "text-emerald-600"
                                : "text-ink-soft";

                          return (
                            <React.Fragment key={line.id}>
                              <tr className={`border-b border-mint-line ${line.counted ? "bg-emerald-50/20" : ""}`}>
                                <td className="p-3.5">
                                  <div className="font-black text-ink flex items-center gap-1.5">
                                    <span>{line.name}</span>
                                    {line.counted && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-black">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-ink-soft font-mono mt-0.5 flex flex-wrap gap-2">
                                    <span>{line.barcode || "—"}</span>
                                    {batches.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedBatches((prev) => ({
                                            ...prev,
                                            [line.id]: !prev[line.id],
                                          }))
                                        }
                                        className="text-primary font-bold underline"
                                      >
                                        {batchExpanded
                                          ? isEn ? "Hide Batches" : "إخفاء التشغيلات"
                                          : isEn ? `Batches (${batches.length})` : `التشغيلات (${batches.length})`}
                                      </button>
                                    )}
                                  </div>
                                </td>

                                <td className="p-3.5 text-center font-mono text-[12px] font-bold">
                                  {maskNumbersNow ? (
                                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-black">
                                      🔒 {isEn ? "Masked" : "مخفي"}
                                    </span>
                                  ) : (
                                    formatQtyWithUnits({ qty: line.expectedBaseQty, units }, units, language)
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      value={draft.boxes}
                                      onChange={(e) => updateItemDraft(item, { boxes: Math.max(0, Number(e.target.value) || 0) })}
                                      className="w-16 px-2 py-1.5 rounded-[10px] bg-bg border border-mint-line text-center font-mono font-black outline-none focus:border-primary"
                                      title={isEn ? "Boxes" : "علب"}
                                    />
                                    {hasStrips && (
                                      <input
                                        type="number"
                                        min={0}
                                        value={draft.strips}
                                        onChange={(e) => updateItemDraft(item, { strips: Math.max(0, Number(e.target.value) || 0) })}
                                        className="w-14 px-2 py-1.5 rounded-[10px] bg-bg border border-mint-line text-center font-mono font-bold outline-none focus:border-primary"
                                        title={isEn ? "Strips" : "أشرطة"}
                                      />
                                    )}
                                    {hasPills && (
                                      <input
                                        type="number"
                                        min={0}
                                        value={draft.pills}
                                        onChange={(e) => updateItemDraft(item, { pills: Math.max(0, Number(e.target.value) || 0) })}
                                        className="w-14 px-2 py-1.5 rounded-[10px] bg-bg border border-mint-line text-center font-mono font-bold outline-none focus:border-primary"
                                        title={isEn ? "Pills / Smallest" : "حبة"}
                                      />
                                    )}
                                  </div>
                                </td>

                                <td className="p-3.5 text-center">
                                  {maskNumbersNow ? (
                                    <span className="text-[11px] text-ink-soft font-bold">🔒</span>
                                  ) : (
                                    <div>
                                      <div className={`font-black font-mono text-[12px] ${diffColor}`}>
                                        {formatSignedDeltaWithUnits(line.deltaBaseQty, units, language)}
                                      </div>
                                      {showCosts && line.deltaBaseQty !== 0 && (
                                        <div className={`text-[11px] font-mono font-bold ${diffColor}`}>
                                          {line.costImpact > 0 ? "+" : ""}
                                          {round2(line.costImpact).toFixed(2)} ₪
                                        </div>
                                      )}
                                      {line.isHighVariance && (
                                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-coral/10 text-coral text-[10px] font-black">
                                          ⚠️ {round2(line.variancePct).toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="p-3.5">
                                  <div className="flex flex-col gap-1 min-w-[160px]">
                                    <select
                                      value={draft.reasonCode || "count_adjustment"}
                                      onChange={(e) => updateItemDraft(item, { reasonCode: e.target.value })}
                                      className="px-2 py-1 rounded-[8px] bg-bg border border-mint-line text-[11px] font-bold outline-none"
                                    >
                                      {STOCK_TAKE_REASON_CODES.map((rc) => (
                                        <option key={rc.code} value={rc.code}>
                                          {isEn ? rc.labelEn : rc.labelAr}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={draft.notes}
                                      onChange={(e) => updateItemDraft(item, { notes: e.target.value })}
                                      placeholder={isEn ? "Note..." : "ملاحظة..."}
                                      className="px-2 py-1 rounded-[8px] bg-bg border border-mint-line text-[11px] outline-none"
                                    />
                                  </div>
                                </td>

                                {canManage && (
                                  <td className="p-3.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setWasteItem(item)}
                                      className="px-2.5 py-1.5 rounded-[10px] bg-coral/10 text-coral text-[11px] font-black hover:bg-coral/20"
                                    >
                                      🗑️ {isEn ? "Waste" : "تالف"}
                                    </button>
                                  </td>
                                )}
                              </tr>

                              {/* Optional Expandable Batch-level Count */}
                              {batchExpanded && batches.length > 0 && (
                                <tr className="bg-primary/[0.03] border-b border-mint-line">
                                  <td colSpan={canManage ? 6 : 5} className="px-6 py-3">
                                    <div className="text-[11px] font-black text-primary mb-2">
                                      {isEn ? "Batch / Lot Physical Count (Base Units)" : "عدّ التشغيلات التفصيلي (بالوحدة الصغرى):"}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {batches.map((b) => {
                                        const matchEntry = (draft.batchCounts || []).find(
                                          (bc) => bc.batch_number === b.batch_number && bc.expiry === b.expiry
                                        );
                                        const val = matchEntry ? matchEntry.qty : Number(b.qty || 0);
                                        return (
                                          <div
                                            key={`${b.batch_number}_${b.expiry}`}
                                            className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-[10px] border border-mint-line"
                                          >
                                            <div className="text-[11px]">
                                              <div className="font-mono font-black text-ink">{b.batch_number}</div>
                                              <div className="text-ink-soft">
                                                EXP: {b.expiry || "—"} {!maskNumbersNow && `• (${b.qty})`}
                                              </div>
                                            </div>
                                            <input
                                              type="number"
                                              min={0}
                                              value={val}
                                              onChange={(e) =>
                                                updateBatchDraftQty(item, b, Math.max(0, Number(e.target.value) || 0))
                                              }
                                              className="w-20 px-2 py-1 rounded-[8px] bg-bg border border-mint-line text-center font-mono font-black text-[12px]"
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ───────── TAB 3: ADJUSTMENTS & VARIANCE LEDGER ───────── */}
        {tab === "history" && canManage && (
          <div className="bg-white rounded-[24px] border border-mint-line shadow-sm overflow-x-auto">
            {normalizedAdjustments.length === 0 ? (
              <div className="p-12 text-center font-bold text-ink-soft">
                {isEn ? "No adjustments recorded yet." : "لا توجد تسويات أو توالف مسجلة حتى الآن."}
              </div>
            ) : (
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-bg/80 text-ink-soft text-[12px] font-black border-b border-mint-line">
                    <th className="p-3.5 text-start">{isEn ? "Date" : "التاريخ"}</th>
                    <th className="p-3.5 text-start">{isEn ? "Drug" : "الصنف"}</th>
                    <th className="p-3.5 text-start">{isEn ? "Reason" : "السبب"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Direction" : "النوع"}</th>
                    <th className="p-3.5 text-center">{isEn ? "Qty (Base)" : "الكمية"}</th>
                    {showCosts && <th className="p-3.5 text-center">{isEn ? "Financial Impact" : "الأثر المالي"}</th>}
                    <th className="p-3.5 text-start">{isEn ? "By" : "بواسطة"}</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedAdjustments.map((adj: any) => {
                    const isSurplus = adj.direction === "surplus";
                    const item = inventoryMap.get(String(adj.drug_id));
                    const qtyText = item?.units
                      ? formatSignedDeltaWithUnits(isSurplus ? adj.absQty : -adj.absQty, item.units, language)
                      : `${isSurplus ? "+" : "-"}${adj.absQty}`;
                    return (
                      <tr key={adj.id} className="border-b border-mint-line hover:bg-bg/40">
                        <td className="p-3.5 font-mono text-[11px] text-ink-soft">
                          {String(adj.created_at || "").slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="p-3.5">
                          <div className="font-black text-ink">{adj.drug_name}</div>
                          {adj.notes && <div className="text-[11px] text-ink-soft">{adj.notes}</div>}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isSurplus ? "bg-emerald-100 text-emerald-700" : "bg-coral/10 text-coral"}`}>
                            {adj.reasonLabel}
                          </span>
                        </td>
                        <td className="p-3.5 text-center text-[11px] font-black">
                          {isSurplus ? (isEn ? "Surplus" : "فائض") : isEn ? "Shortage" : "عجز / تلف"}
                        </td>
                        <td className={`p-3.5 text-center font-mono font-bold ${isSurplus ? "text-emerald-600" : "text-coral"}`}>
                          {qtyText}
                        </td>
                        {showCosts && (
                          <td className={`p-3.5 text-center font-mono font-black ${isSurplus ? "text-emerald-600" : "text-coral"}`}>
                            {isSurplus
                              ? `+${round2(adj.surplusValue).toFixed(2)} ₪`
                              : `-${round2(adj.lossValue).toFixed(2)} ₪`}
                          </td>
                        )}
                        <td className="p-3.5 text-[12px] text-ink">{adj.recorded_by || "System"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {showSetupModal && (
        <SessionSetupModal
          inventory={activeItems}
          branches={branches}
          categories={categories}
          userRole={user?.role}
          userBranch={user?.branch}
          language={language}
          submitting={submitting}
          onConfirm={handleCreateSession}
          onClose={() => setShowSetupModal(false)}
        />
      )}

      {conflicts && conflicts.length > 0 && (
        <ConflictResolutionModal
          conflicts={conflicts}
          inventoryMap={inventoryMap}
          language={language}
          submitting={submitting}
          onResolve={handleResolveConflicts}
          onClose={() => setConflicts(null)}
        />
      )}

      <WasteAdjustmentModal
        item={wasteItem}
        pharmacyId={pharmacyId}
        userName={user?.name || "المدير"}
        userRole={user?.role}
        language={language}
        onClose={() => setWasteItem(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmCancelSessionId)}
        title={isEn ? "Cancel Stock Take Session" : "تأكيد إلغاء جلسة الجرد"}
        message={isEn ? "Cancel this open draft session?" : "هل أنت متأكد من إلغاء مسودة جلسة الجرد هذه؟"}
        confirmLabel={isEn ? "Cancel Session" : "تأكيد الإلغاء"}
        cancelLabel={isEn ? "Back" : "تراجع"}
        tone="danger"
        loading={submitting}
        onConfirm={confirmCancelSession}
        onClose={() => setConfirmCancelSessionId(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingZeroVarianceLines)}
        title={isEn ? "Confirm 100% Match" : "اعتماد الجلسة بدون فروقات"}
        message={
          isEn
            ? "No variances detected. Close & post session as 100% matched?"
            : "لا توجد فروقات مسجلة. هل تريد اعتماد الجلسة وترحيلها كمطابقة 100%؟"
        }
        confirmLabel={isEn ? "Post Session" : "اعتماد وترحيل"}
        cancelLabel={isEn ? "Cancel" : "إلغاء"}
        tone="primary"
        loading={submitting}
        onConfirm={async () => {
          const lines = pendingZeroVarianceLines;
          setPendingZeroVarianceLines(null);
          if (lines) await executePostSession(lines);
        }}
        onClose={() => setPendingZeroVarianceLines(null)}
      />
    </div>
  );
}
