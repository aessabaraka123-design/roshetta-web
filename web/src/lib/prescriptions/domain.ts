/**
 * web/src/lib/prescriptions/domain.ts
 * Isomorphic Prescriptions Engine for Roshetta Pharmacy Cloud (Web TypeScript).
 * 100% Parity with Server CJS & Mobile JS domains.
 */

export const PRESCRIPTION_STATUSES = {
  DRAFT: "draft",
  PENDING: "pending",
  PARTIAL: "partially_dispensed",
  DISPENSED: "dispensed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type PrescriptionStatus = typeof PRESCRIPTION_STATUSES[keyof typeof PRESCRIPTION_STATUSES];

export interface DosageFrequency {
  id: string;
  ar: string;
  en: string;
}

export const DOSAGE_FREQUENCIES: DosageFrequency[] = [
  { id: "once_daily", ar: "مرة واحدة يومياً (كل 24 ساعة)", en: "Once daily (every 24 hrs)" },
  { id: "bid", ar: "مرتان يومياً (كل 12 ساعة)", en: "Twice daily (every 12 hrs)" },
  { id: "tid", ar: "3 مرات يومياً (كل 8 ساعات)", en: "3 times daily (every 8 hrs)" },
  { id: "qid", ar: "4 مرات يومياً (كل 6 ساعات)", en: "4 times daily (every 6 hrs)" },
  { id: "before_meals", ar: "قبل الأكل بنصف ساعة", en: "30 mins before meals" },
  { id: "after_meals", ar: "بعد الأكل مباشرة", en: "Immediately after meals" },
  { id: "bedtime", ar: "عند النوم", en: "At bedtime" },
  { id: "prn", ar: "عند اللزوم / عند الألم", en: "As needed (PRN)" },
];

export interface MedicationForm {
  id: string;
  ar: string;
  en: string;
}

export const MEDICATION_FORMS: MedicationForm[] = [
  { id: "tablets", ar: "أقراص", en: "Tablets" },
  { id: "capsules", ar: "كبسولات", en: "Capsules" },
  { id: "syrup", ar: "شراب", en: "Syrup" },
  { id: "suspension", ar: "معلق", en: "Suspension" },
  { id: "injection", ar: "حقن", en: "Injection" },
  { id: "drops", ar: "قطرة", en: "Drops" },
  { id: "ointment", ar: "مرهم", en: "Ointment" },
  { id: "cream", ar: "كريم", en: "Cream" },
  { id: "inhaler", ar: "بخاخ", en: "Inhaler" },
  { id: "suppository", ar: "تحاميل", en: "Suppository" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export const KNOWN_ALLERGY_MAP: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "augmentin", "amoclan", "penicillin", "curam", "clavamox", "piperacillin"],
  sulfa: ["sulfamethoxazole", "trimethoprim", "bactrim", "septrin", "sulfasalazine"],
  nsaid: ["ibuprofen", "aspirin", "diclofenac", "naproxen", "cataflam", "voltaren", "profinal", "brufen"],
  cephalosporin: ["ceftriaxone", "cefixime", "cephalexin", "cefuroxime", "suprax", "rocephin", "zinnat"],
};

export interface PrescribedItem {
  id?: string;
  name: string;
  active_ingredient?: string;
  form?: string;
  dosage?: string;
  frequency?: string;
  frequency_label?: string;
  duration?: string;
  instructions?: string;
  qty?: number;
  prescribed_qty?: number;
  dispensed_qty?: number;
  unit?: string;
  is_controlled?: boolean;
  notes?: string;
}

export interface DispensationRecord {
  dispensation_id: string;
  sale_id: string;
  refill_number: number;
  date: string;
  branch_id: string;
  branch_name: string;
  cashier_name: string;
  pharmacist_notes?: string;
  items: any[];
}

export interface Prescription {
  id: string;
  pharmacy_id: string;
  branch_id?: string;
  branch_name?: string;
  patient_id?: string;
  patient: string;
  patient_name?: string;
  patient_phone?: string;
  patient_age?: string | number;
  patient_gender?: string;
  patient_allergies?: string[] | string;
  doctor: string;
  doctor_name?: string;
  doctor_license?: string;
  doctor_specialty?: string;
  doctor_phone?: string;
  clinic_name?: string;
  date: string;
  expiry_date?: string;
  diagnosis?: string;
  notes?: string;
  attachment_url?: string;
  total_refills?: number;
  refills_used?: number;
  refill_interval_days?: number;
  status: PrescriptionStatus;
  items: PrescribedItem[] | string;
  dispensations?: DispensationRecord[] | string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface PrescriptionsKPIs {
  totalCount: number;
  pendingCount: number;
  partialCount: number;
  dispensedCount: number;
  cancelledCount: number;
  expiredCount: number;
  totalPrescribedItems: number;
  totalDispensedItems: number;
}

export function round2(val: number | string): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseJsonSafe<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

export function generatePrescriptionId(pharmacyId: string, sequenceOrRand?: number | string): string {
  const safePharm = String(pharmacyId || "PHARM");
  let hash = 0;
  for (let i = 0; i < safePharm.length; i++) {
    hash = (hash << 5) - hash + safePharm.charCodeAt(i);
  }
  const prefix = "PRX" + Math.abs(hash).toString(36).substring(0, 3).toUpperCase();
  if (typeof sequenceOrRand === "number") {
    return `${prefix}-${String(sequenceOrRand).padStart(4, "0")}`;
  }
  const token = String(sequenceOrRand || Math.random().toString(36).substring(2, 6)).toUpperCase();
  return `${prefix}-${token}`;
}

export function validatePrescription(prx: Partial<Prescription>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!prx) {
    errors.push("PRESCRIPTION_OBJECT_REQUIRED");
    return { valid: false, errors };
  }
  if (!prx.patient && !prx.patient_name) {
    errors.push("PATIENT_NAME_REQUIRED");
  }
  if (!prx.doctor && !prx.doctor_name) {
    errors.push("DOCTOR_NAME_REQUIRED");
  }
  const items = Array.isArray(prx.items) ? prx.items : parseJsonSafe<any[]>(prx.items, []);
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("AT_LEAST_ONE_MEDICATION_REQUIRED");
  } else {
    items.forEach((it, idx) => {
      if (!it.name || !String(it.name).trim()) {
        errors.push(`ITEM_${idx}_NAME_REQUIRED`);
      }
      const qty = Number(it.qty ?? it.prescribed_qty ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.push(`ITEM_${idx}_INVALID_QTY`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function isPrescriptionExpired(prx: Partial<Prescription>, asOfDate?: string): boolean {
  if (!prx || !prx.expiry_date) return false;
  const nowStr = asOfDate || new Date().toISOString().split("T")[0];
  return prx.expiry_date < nowStr;
}

export function canDispenseRefill(prx: Prescription, asOfDate?: string): { allowed: boolean; reason?: string; remainingRefills?: number; daysRemaining?: number } {
  if (!prx) return { allowed: false, reason: "PRESCRIPTION_NOT_FOUND" };
  if (prx.status === PRESCRIPTION_STATUSES.CANCELLED) {
    return { allowed: false, reason: "PRESCRIPTION_CANCELLED" };
  }
  if (isPrescriptionExpired(prx, asOfDate)) {
    return { allowed: false, reason: "PRESCRIPTION_EXPIRED" };
  }
  const totalRefills = Math.max(0, parseInt(String(prx.total_refills || 0), 10));
  const refillsUsed = Math.max(0, parseInt(String(prx.refills_used || 0), 10));
  if (refillsUsed > totalRefills) {
    return { allowed: false, reason: "ALL_REFILLS_EXHAUSTED" };
  }

  const intervalDays = Math.max(0, parseInt(String(prx.refill_interval_days || 0), 10));
  if (intervalDays > 0 && refillsUsed > 0) {
    const dispensations = Array.isArray(prx.dispensations)
      ? prx.dispensations
      : parseJsonSafe<DispensationRecord[]>(prx.dispensations, []);
    if (dispensations.length > 0) {
      const lastDisp = dispensations[dispensations.length - 1];
      const lastDate = lastDisp.date ? new Date(lastDisp.date).getTime() : 0;
      const nowDate = asOfDate ? new Date(asOfDate).getTime() : Date.now();
      const diffDays = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays < intervalDays) {
        return {
          allowed: false,
          reason: "REFILL_TOO_EARLY",
          daysRemaining: intervalDays - diffDays,
        };
      }
    }
  }

  return { allowed: true, remainingRefills: totalRefills - refillsUsed };
}

export function checkDrugAllergyWarnings(
  patientAllergies: string[] | string | undefined,
  prescribedItems: PrescribedItem[] | string | undefined
): Array<{ medicationName: string; allergy: string; severity: string; messageAr: string; messageEn: string }> {
  const warnings: Array<{ medicationName: string; allergy: string; severity: string; messageAr: string; messageEn: string }> = [];
  const allergies = Array.isArray(patientAllergies)
    ? patientAllergies
    : parseJsonSafe<string[]>(patientAllergies, (typeof patientAllergies === "string" ? patientAllergies.split(",").map(s => s.trim().toLowerCase()) : []));

  const items = Array.isArray(prescribedItems)
    ? prescribedItems
    : parseJsonSafe<PrescribedItem[]>(prescribedItems, []);

  if (!allergies || allergies.length === 0 || !items || items.length === 0) {
    return warnings;
  }

  const cleanAllergies = allergies.map(a => String(a).toLowerCase().trim()).filter(Boolean);

  for (const item of items) {
    const itemName = String(item.name || "").toLowerCase();
    const activeIng = String(item.active_ingredient || "").toLowerCase();

    for (const allergy of cleanAllergies) {
      let matched = false;
      let matchedTrigger = allergy;

      if (itemName.includes(allergy) || activeIng.includes(allergy)) {
        matched = true;
      }

      if (!matched) {
        for (const [group, members] of Object.entries(KNOWN_ALLERGY_MAP)) {
          if (allergy.includes(group)) {
            for (const member of members) {
              if (itemName.includes(member) || activeIng.includes(member)) {
                matched = true;
                matchedTrigger = `${group} (${member})`;
                break;
              }
            }
          }
          if (matched) break;
        }
      }

      if (matched) {
        warnings.push({
          medicationName: item.name,
          allergy: matchedTrigger,
          severity: "high",
          messageAr: `تحذير سريري عالي الخطورة: المريض يعاني من حساسية تجاه (${matchedTrigger}) والدواء الموصوف (${item.name}) يتعارض معها!`,
          messageEn: `High Clinical Alert: Patient has documented allergy to (${matchedTrigger}) which conflicts with prescribed (${item.name})!`,
        });
      }
    }
  }

  return warnings;
}

export function recordDispensation(prx: Prescription, dispensation: Partial<DispensationRecord>): Prescription {
  if (!prx) throw new Error("PRESCRIPTION_NOT_FOUND");
  const items = (Array.isArray(prx.items) ? prx.items : parseJsonSafe<PrescribedItem[]>(prx.items, [])).map(it => ({ ...it }));
  const dispensations = (Array.isArray(prx.dispensations) ? prx.dispensations : parseJsonSafe<DispensationRecord[]>(prx.dispensations, [])).map(d => ({ ...d }));

  const dispItems = Array.isArray(dispensation.items) ? dispensation.items : parseJsonSafe<any[]>(dispensation.items, []);

  let allItemsFulfilled = true;
  for (const pItem of items) {
    const matchingDisp = dispItems.find(
      d => (d.id && String(d.id) === String(pItem.id)) ||
           (d.name && String(d.name).toLowerCase() === String(pItem.name).toLowerCase())
    );
    if (matchingDisp) {
      const q = Number(matchingDisp.qty ?? matchingDisp.dispensedQty ?? matchingDisp.cartQty ?? 0);
      pItem.dispensed_qty = round2(Number(pItem.dispensed_qty || 0) + q);
    }
    const targetQty = Number(pItem.qty ?? pItem.prescribed_qty ?? 1);
    if (Number(pItem.dispensed_qty || 0) < targetQty) {
      allItemsFulfilled = false;
    }
  }

  const currentRefillsUsed = Math.max(0, parseInt(String(prx.refills_used || 0), 10));
  const totalRefills = Math.max(0, parseInt(String(prx.total_refills || 0), 10));
  const newRefillsUsed = currentRefillsUsed + 1;

  let newStatus: PrescriptionStatus = PRESCRIPTION_STATUSES.PARTIAL;
  if (allItemsFulfilled && newRefillsUsed >= (totalRefills + 1)) {
    newStatus = PRESCRIPTION_STATUSES.DISPENSED;
  } else if (!allItemsFulfilled && newRefillsUsed === 1) {
    newStatus = PRESCRIPTION_STATUSES.PARTIAL;
  }

  const newDispensationRecord: DispensationRecord = {
    dispensation_id: dispensation.dispensation_id || `DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sale_id: dispensation.sale_id || (dispensation as any).saleId || "",
    refill_number: currentRefillsUsed,
    date: dispensation.date || new Date().toISOString(),
    branch_id: dispensation.branch_id || (dispensation as any).branchId || prx.branch_id || "",
    branch_name: dispensation.branch_name || (dispensation as any).branchName || prx.branch_name || "الفرع الرئيسي",
    cashier_name: dispensation.cashier_name || (dispensation as any).cashierName || "الصيدلي",
    pharmacist_notes: dispensation.pharmacist_notes || (dispensation as any).notes || "",
    items: dispItems,
  };

  dispensations.push(newDispensationRecord);

  return {
    ...prx,
    status: newStatus,
    items,
    refills_used: newRefillsUsed,
    dispensations,
    updated_at: new Date().toISOString(),
  };
}

export function reverseDispensation(prx: Prescription, saleId: string): Prescription {
  if (!prx) throw new Error("PRESCRIPTION_NOT_FOUND");
  const dispensations = (Array.isArray(prx.dispensations) ? prx.dispensations : parseJsonSafe<DispensationRecord[]>(prx.dispensations, []));
  const targetIndex = dispensations.findIndex(d => String(d.sale_id) === String(saleId));
  if (targetIndex === -1) return prx;

  const targetDisp = dispensations[targetIndex];
  const items = (Array.isArray(prx.items) ? prx.items : parseJsonSafe<PrescribedItem[]>(prx.items, [])).map(it => ({ ...it }));

  for (const dispItem of (targetDisp.items || [])) {
    const matchingItem = items.find(
      it => (it.id && String(it.id) === String(dispItem.id)) ||
            (it.name && String(it.name).toLowerCase() === String(dispItem.name).toLowerCase())
    );
    if (matchingItem) {
      const q = Number(dispItem.qty ?? dispItem.dispensedQty ?? 0);
      matchingItem.dispensed_qty = Math.max(0, round2(Number(matchingItem.dispensed_qty || 0) - q));
    }
  }

  const updatedDispensations = dispensations.filter((_, idx) => idx !== targetIndex);
  const updatedRefillsUsed = Math.max(0, parseInt(String(prx.refills_used || 1), 10) - 1);

  let newStatus: PrescriptionStatus = PRESCRIPTION_STATUSES.PENDING;
  if (updatedDispensations.length > 0) {
    newStatus = PRESCRIPTION_STATUSES.PARTIAL;
  }

  return {
    ...prx,
    status: newStatus,
    items,
    refills_used: updatedRefillsUsed,
    dispensations: updatedDispensations,
    updated_at: new Date().toISOString(),
  };
}

export function calculatePrescriptionsKPIs(prescriptionsList: Prescription[]): PrescriptionsKPIs {
  let totalCount = 0;
  let pendingCount = 0;
  let partialCount = 0;
  let dispensedCount = 0;
  let cancelledCount = 0;
  let expiredCount = 0;
  let totalPrescribedItems = 0;
  let totalDispensedItems = 0;

  const todayStr = new Date().toISOString().split("T")[0];

  for (const prx of prescriptionsList || []) {
    if (!prx) continue;
    totalCount++;

    const isExp = isPrescriptionExpired(prx, todayStr);
    const st = prx.status || PRESCRIPTION_STATUSES.PENDING;

    if (st === PRESCRIPTION_STATUSES.CANCELLED) {
      cancelledCount++;
    } else if (isExp && st !== PRESCRIPTION_STATUSES.DISPENSED) {
      expiredCount++;
    } else if (st === PRESCRIPTION_STATUSES.DISPENSED) {
      dispensedCount++;
    } else if (st === PRESCRIPTION_STATUSES.PARTIAL) {
      partialCount++;
    } else {
      pendingCount++;
    }

    const items = Array.isArray(prx.items) ? prx.items : parseJsonSafe<PrescribedItem[]>(prx.items, []);
    for (const it of items) {
      const pQty = Number(it.qty ?? it.prescribed_qty ?? 0);
      const dQty = Number(it.dispensed_qty ?? 0);
      totalPrescribedItems += pQty;
      totalDispensedItems += dQty;
    }
  }

  return {
    totalCount,
    pendingCount,
    partialCount,
    dispensedCount,
    cancelledCount,
    expiredCount,
    totalPrescribedItems,
    totalDispensedItems,
  };
}

export function filterPrescriptions(prescriptionsList: Prescription[], filters: {
  query?: string;
  status?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
} = {}): Prescription[] {
  const {
    query = "",
    status = "all",
    branchId = "all",
    startDate = "",
    endDate = "",
  } = filters;

  const cleanQuery = query.trim().toLowerCase();

  return (prescriptionsList || []).filter((prx) => {
    if (!prx) return false;

    if (cleanQuery) {
      const idMatch = String(prx.id || "").toLowerCase().includes(cleanQuery);
      const patMatch = String(prx.patient || prx.patient_name || "").toLowerCase().includes(cleanQuery);
      const docMatch = String(prx.doctor || prx.doctor_name || "").toLowerCase().includes(cleanQuery);
      const phoneMatch = String(prx.patient_phone || "").toLowerCase().includes(cleanQuery);
      if (!idMatch && !patMatch && !docMatch && !phoneMatch) return false;
    }

    if (status && status !== "all") {
      if (status === "expired") {
        if (!isPrescriptionExpired(prx)) return false;
      } else if (prx.status !== status) {
        return false;
      }
    }

    if (branchId && branchId !== "all") {
      const pBranch = String(prx.branch_id || (prx as any).branchId || "");
      if (pBranch && pBranch !== String(branchId)) return false;
    }

    const pDate = String(prx.date || prx.created_at || "").split("T")[0];
    if (startDate && pDate < startDate) return false;
    if (endDate && pDate > endDate) return false;

    return true;
  });
}
