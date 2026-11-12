"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import MasterCatalogModal, { MASTER_DRUGS_COUNT, type MasterDrug } from "@/components/MasterCatalogModal";
import InventoryFormModal, { type InventoryFormInitialDraft } from "@/components/inventory/InventoryFormModal";
import { canManageInventory, getActiveBranches } from "@/lib/inventory/domain";
import { useInventoryData, usePharmacyBranches } from "@/lib/inventory/api";
import { useStore } from "@/store";

export default function AddItemPage() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [draft, setDraft] = useState<InventoryFormInitialDraft | null>(null);

  useEffect(() => {
    if (!user && typeof window !== "undefined" && !localStorage.getItem("roshetta_user")) {
      router.replace("/login");
    }
  }, [user, router]);

  const { branches } = usePharmacyBranches(user?.pharmacy_id);
  const activeBranches = getActiveBranches(branches);
  const { inventory } = useInventoryData(user?.pharmacy_id);

  if (!user) return null;

  if (!canManageInventory(user?.role)) {
    return (
      <main className="w-full pb-20">
        <AppBar title={isEn ? "Add Inventory Item" : "إضافة صنف"} backHref="/inventory" />
        <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-3xl border border-mint-line text-center font-bold text-coral">
          {isEn ? "Manager or Branch Manager permissions are required." : "يتطلب هذا القسم صلاحيات مدير الصيدلية أو مدير الفرع."}
        </div>
      </main>
    );
  }

  const handleSelectFromCatalog = (drug: MasterDrug) => {
    const unitsList: any[] = [{ name: drug.defaultUnit || "علبة", count: 1, price: 0 }];
    if (drug.hasSubUnit && Number(drug.sub1Count) > 1) {
      if (drug.hasSubUnit2 && Number(drug.sub2Count) > 1) {
        const s2 = Number(drug.sub2Count);
        const s1 = Number(drug.sub1Count);
        unitsList[0].count = s1 * s2;
        unitsList.push({ name: drug.sub1Name || "شريط", count: s2, price: 0 });
        unitsList.push({ name: drug.sub2Name || "حبة", count: 1, price: 0 });
      } else {
        const s1 = Number(drug.sub1Count);
        unitsList[0].count = s1;
        unitsList.push({ name: drug.sub1Name || "شريط", count: 1, price: 0 });
      }
    }
    setDraft({
      name: drug.name,
      scientificName: drug.scientificName,
      barcode: drug.barcode,
      category: drug.category,
      isControlled: Boolean(drug.isControlled),
      units: unitsList,
    });
    setCatalogOpen(false);
  };

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Add New Medicine / Item" : "إضافة صنف دوائي جديد"} backHref="/inventory" />

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
          <div>
            <h2 className="text-[16px] font-black text-primary">
              {isEn ? "Unified Multi-Unit & FEFO Item Form" : "نموذج الصنف الموحد (وحدات، باركود، صلاحية)"}
            </h2>
            <p className="text-[12px] text-ink-soft font-medium">
              {isEn ? "Import specs directly from the master drug database or enter manually." : "يمكنك استيراد بيانات أي دواء مباشرة من الكتالوج الدوائي الموحد."}
            </p>
          </div>
          <button
            onClick={() => setCatalogOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-primary-pale text-primary font-black text-[13px] hover:bg-primary hover:text-white transition-colors"
          >
            📚 {isEn ? `Browse Catalog (${MASTER_DRUGS_COUNT})` : `الاستيراد من الكتالوج (${MASTER_DRUGS_COUNT})`}
          </button>
        </div>

        <InventoryFormModal
          mode="page"
          initialDraft={draft}
          pharmacyId={user.pharmacy_id}
          userRole={user.role}
          userBranch={user.branch}
          branches={branches}
          language={language}
          onSaved={(_, keepOpen) => {
            if (!keepOpen) router.push("/inventory");
          }}
        />
      </div>

      <MasterCatalogModal
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        inventory={inventory}
        pharmacyId={user.pharmacy_id}
        branches={activeBranches}
        onSelectDrug={handleSelectFromCatalog}
        onItemAdded={() => router.push("/inventory")}
      />
    </main>
  );
}
