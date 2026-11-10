"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import AppBar from "@/components/AppBar";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import CustomerVoucherModal from "@/components/customers/CustomerVoucherModal";
import CustomerStatementModal from "@/components/customers/CustomerStatementModal";
import { API_BASE_URL } from "@/lib/config";
import { useStore } from "@/store";
import { authJsonFetcher } from "@/lib/customers/api";
import { resolveBranchId, resolveBranchName, type BranchRecord, type CustomerRecord } from "@/lib/customers/domain";

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const customerId = Array.isArray(rawId) ? rawId[0] : rawId || "";

  const user = useStore((state) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";

  const isGeneralManager = Boolean(user && ["manager", "owner", "admin"].includes(user.role || ""));
  const canDeleteCustomer = Boolean(user && ["manager", "owner", "branchManager", "admin"].includes(user.role || ""));

  const { data: pharmacyData } = useSWR(
    user ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}` : null,
    authJsonFetcher
  );
  const pharmacyName = pharmacyData?.pharmacy?.name || user?.pharmacyName || (isEn ? "Roshetta Pharmacy" : "صيدلية روشتة");

  const { data: branchesData } = useSWR(
    user ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/branches` : null,
    authJsonFetcher
  );
  const activeBranches: BranchRecord[] = useMemo(() => {
    const raw = branchesData?.branches || [];
    return raw.filter((b: any) => !["مؤرشف", "archived", "deleted"].includes(String(b.status || "")));
  }, [branchesData]);

  const userBranchId = useMemo(() => {
    if (!user || isGeneralManager || !user.branch) return null;
    return resolveBranchId(user.branch, activeBranches);
  }, [user, isGeneralManager, activeBranches]);

  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [voucherModal, setVoucherModal] = useState<{
    open: boolean;
    mode: "payment" | "debit";
    customer: CustomerRecord | null;
  }>({ open: false, mode: "payment", customer: null });

  const refreshStatement = () => {
    if (!user?.pharmacy_id) return;
    globalMutate(
      (key) => typeof key === "string" && (key.includes("/customers") || key.includes("/sales") || key.includes("/shifts/current")),
      undefined,
      { revalidate: true }
    );
  };

  if (!user) return null;

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Customer Account Statement" : "ملف وكشف حساب العميل"} backHref="/customers" />

      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <CustomerStatementModal
          inline
          customerId={decodeURIComponent(customerId)}
          pharmacyId={user.pharmacy_id}
          pharmacyName={pharmacyName}
          branches={activeBranches}
          canManageCustomer={canDeleteCustomer}
          lang={language}
          onOpenVoucher={(mode, cust) => setVoucherModal({ open: true, mode, customer: cust })}
          onEditCustomer={(cust) => setEditingCustomer(cust)}
          onDeleted={() => router.replace("/customers")}
        />
      </div>

      <CustomerFormModal
        open={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        pharmacyId={user.pharmacy_id}
        branches={activeBranches}
        initialCustomer={editingCustomer}
        isGeneralManager={isGeneralManager}
        cashierName={user.managerName || user.name || ""}
        lang={language}
        onSaved={() => refreshStatement()}
      />

      <CustomerVoucherModal
        open={voucherModal.open}
        onClose={() => setVoucherModal({ open: false, mode: "payment", customer: null })}
        mode={voucherModal.mode}
        customer={voucherModal.customer}
        pharmacyId={user.pharmacy_id}
        pharmacyName={pharmacyName}
        branchId={userBranchId}
        branchName={userBranchId ? resolveBranchName(userBranchId, activeBranches, language) : ""}
        cashierName={user.managerName || user.name || ""}
        lang={language}
        onCompleted={() => refreshStatement()}
      />
    </main>
  );
}
