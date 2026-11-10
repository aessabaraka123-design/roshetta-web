"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import CustomerVoucherModal from "@/components/customers/CustomerVoucherModal";
import CustomerStatementModal from "@/components/customers/CustomerStatementModal";
import { API_BASE_URL } from "@/lib/config";
import { useStore } from "@/store";
import { authJsonFetcher, useCustomersList } from "@/lib/customers/api";
import {
  resolveBranchId,
  resolveBranchName,
  round2,
  type BranchRecord,
  type CustomerRecord,
} from "@/lib/customers/domain";

export default function CustomersPage() {
  const user = useStore((state) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

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

  const userFixedBranchId = useMemo(() => {
    if (!user || isGeneralManager || !user.branch) return null;
    return resolveBranchId(user.branch, activeBranches);
  }, [user, isGeneralManager, activeBranches]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const effectiveBranchId = userFixedBranchId || selectedBranchId;

  const { customers, isLoading, mutate: mutateCustomers } = useCustomersList(
    user?.pharmacy_id,
    effectiveBranchId
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "debt" | "credit" | "settled">("all");

  // Modals State
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [voucherModal, setVoucherModal] = useState<{
    open: boolean;
    mode: "payment" | "debit";
    customer: CustomerRecord | null;
  }>({ open: false, mode: "payment", customer: null });
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  const stats = useMemo(() => {
    let totalReceivables = 0;
    let totalStoreCredit = 0;
    let debtorsCount = 0;
    let creditHoldersCount = 0;

    for (const c of customers) {
      const bal = round2(c.debt || 0);
      if (bal > 0.005) {
        totalReceivables = round2(totalReceivables + bal);
        debtorsCount++;
      } else if (bal < -0.005) {
        totalStoreCredit = round2(totalStoreCredit + Math.abs(bal));
        creditHoldersCount++;
      }
    }

    return {
      totalCount: customers.length,
      totalReceivables,
      totalStoreCredit,
      debtorsCount,
      creditHoldersCount,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      const bal = round2(c.debt || 0);
      if (balanceFilter === "debt" && !(bal > 0.005)) return false;
      if (balanceFilter === "credit" && !(bal < -0.005)) return false;
      if (balanceFilter === "settled" && Math.abs(bal) > 0.005) return false;
      if (!q) return true;
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.phone || "").toLowerCase().includes(q) ||
        String(c.id || "").toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery, balanceFilter]);

  const refreshAllCustomerViews = (custId?: string) => {
    mutateCustomers();
    if (user?.pharmacy_id) {
      globalMutate(
        (key) =>
          typeof key === "string" &&
          (key.includes(`/customers`) || key.includes(`/sales`) || key.includes(`/shifts/current`)),
        undefined,
        { revalidate: true }
      );
      if (custId) {
        globalMutate(
          `${API_BASE_URL}/api/pharmacies/${encodeURIComponent(user.pharmacy_id)}/customers/${encodeURIComponent(custId)}/statement?lang=${language}`
        );
      }
    }
  };

  if (!user) return null;

  const activeBranchName =
    effectiveBranchId !== "all" ? resolveBranchName(effectiveBranchId, activeBranches, language) : "";

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Customers & Accounts Receivable" : "العملاء ودفتر الذمم"} backHref="/" />

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top Action & Branch Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-mint-line shadow-sm">
          <div>
            <h1 className="text-[22px] font-black text-primary">
              {isEn ? "Customers Ledger & Debt Vouchers" : "إدارة العملاء والذمم المالية"}
            </h1>
            <p className="text-[13px] font-medium text-ink-soft mt-0.5">
              {isEn
                ? "Unified real-time receivables, advance store credit & chronological account statements."
                : "متابعة موحدة للديون والرصيد الدائن وسندات القبض وكشوفات الحساب لحظياً مع الموبايل ونقطة البيع."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-primary text-white font-black text-[14px] hover:bg-primary/90 shadow-md flex items-center justify-center gap-2 shrink-0"
          >
            <span>+</span>
            <span>{isEn ? "Add Customer" : "إضافة عميل جديد"}</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
            <div className="text-[12px] font-bold text-ink-soft">{isEn ? "Total Customers" : "إجمالي العملاء"}</div>
            <div className="font-mono font-black text-[24px] text-primary mt-1">{stats.totalCount}</div>
          </div>

          <div className="bg-coral-pale/40 rounded-2xl p-4 border border-coral/20 shadow-xs">
            <div className="text-[12px] font-bold text-coral">{isEn ? "Total Debt Receivables" : "إجمالي الذمم المستحقة (لنا)"}</div>
            <div dir="ltr" className="font-mono font-black text-[22px] text-coral mt-1">
              {stats.totalReceivables.toFixed(2)} ₪
            </div>
            <div className="text-[11px] font-semibold text-ink-soft mt-0.5">
              {stats.debtorsCount} {isEn ? "accounts with debt" : "عملاء عليهم ذمم"}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-xs">
            <div className="text-[12px] font-bold text-emerald-700">{isEn ? "Advance Store Credit" : "أرصدة دائنة للعملاء (لهم)"}</div>
            <div dir="ltr" className="font-mono font-black text-[22px] text-emerald-700 mt-1">
              {stats.totalStoreCredit.toFixed(2)} ₪
            </div>
            <div className="text-[11px] font-semibold text-ink-soft mt-0.5">
              {stats.creditHoldersCount} {isEn ? "prepaid balances" : "عملاء برصيد متاح"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
            <div className="text-[12px] font-bold text-ink-soft">{isEn ? "Filtered Results" : "النتائج المعروضة"}</div>
            <div className="font-mono font-black text-[24px] text-teal mt-1">{filteredCustomers.length}</div>
          </div>
        </div>

        {/* Search, Balance Filters & Branch Pills */}
        <div className="bg-white rounded-3xl p-4 border border-mint-line space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={isEn ? "Search by customer name or phone..." : "ابحث باسم العميل أو رقم الجوال..."}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { id: "all" as const, ar: "الكل", en: "All" },
                { id: "debt" as const, ar: "عليهم ذمم", en: "Has Debt" },
                { id: "credit" as const, ar: "لهم رصيد دائن", en: "Store Credit" },
                { id: "settled" as const, ar: "خالص", en: "Settled" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setBalanceFilter(pill.id)}
                  className={`px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all border ${
                    balanceFilter === pill.id
                      ? "bg-primary text-white border-primary"
                      : "bg-bg text-ink-soft border-mint-line hover:bg-white"
                  }`}
                >
                  {isEn ? pill.en : pill.ar}
                </button>
              ))}
            </div>
          </div>

          {isGeneralManager && activeBranches.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-mint-line/60">
              <button
                type="button"
                onClick={() => setSelectedBranchId("all")}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                  selectedBranchId === "all"
                    ? "bg-teal text-white border-teal"
                    : "bg-bg text-ink-soft border-mint-line hover:text-ink"
                }`}
              >
                {isEn ? "All Branches" : "كل الفروع"}
              </button>
              {activeBranches.map((br) => (
                <button
                  key={br.id}
                  type="button"
                  onClick={() => setSelectedBranchId(String(br.id))}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold border transition-all ${
                    String(selectedBranchId) === String(br.id)
                      ? "bg-teal text-white border-teal"
                      : "bg-bg text-ink-soft border-mint-line hover:text-ink"
                  }`}
                >
                  🏪 {br.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customers Grid */}
        {isLoading && customers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-ink-soft font-bold border border-mint-line">
            {isEn ? "Loading customers..." : "جاري تحميل سجل العملاء..."}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-mint-line space-y-2">
            <div className="text-4xl">👥</div>
            <div className="text-[16px] font-black text-ink">
              {isEn ? "No matching customers" : "لا يوجد عملاء مطابقون للبحث"}
            </div>
            <p className="text-[13px] text-ink-soft">
              {isEn
                ? "Add your first customer or adjust search/branch filters."
                : "أضف عميلاً جديداً أو عدّل خيارات الفلترة لعرض الحسابات."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((c) => {
              const bal = round2(c.debt || 0);
              const isCredit = bal < -0.005;
              const isDebt = bal > 0.005;
              const branchTitle = c.branch_id
                ? resolveBranchName(c.branch_id, activeBranches, language)
                : isEn
                  ? "Shared"
                  : "عام للجميع";

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl p-5 border border-mint-line shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[17px] font-black text-ink truncate">{c.name}</h3>
                        <div className="text-[12px] font-mono text-ink-soft mt-0.5" dir="ltr">
                          {c.phone || (isEn ? "No phone" : "بدون جوال")}
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1.5 rounded-2xl text-center shrink-0 ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isDebt
                              ? "bg-coral-pale text-coral border border-coral/20"
                              : "bg-slate-100 text-ink-soft"
                        }`}
                      >
                        <div className="text-[10px] font-bold">
                          {isCredit
                            ? isEn
                              ? "Credit"
                              : "له رصيد"
                            : isDebt
                              ? isEn
                                ? "Owes"
                                : "عليه دين"
                              : isEn
                                ? "Settled"
                                : "خالص"}
                        </div>
                        <div dir="ltr" className="font-mono font-black text-[15px]">
                          {Math.abs(bal).toFixed(2)} ₪
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-bold text-ink-soft">
                      <span className="bg-bg px-2.5 py-1 rounded-lg border border-mint-line/70">🏪 {branchTitle}</span>
                      {c.lastVisit && (
                        <span className="bg-bg px-2.5 py-1 rounded-lg border border-mint-line/70">🕒 {c.lastVisit}</span>
                      )}
                    </div>

                    {c.notes && (
                      <p className="text-[12px] text-ink-soft mt-2 line-clamp-2 bg-bg/60 rounded-xl px-3 py-1.5">
                        {c.notes}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-mint-line/70">
                    <button
                      type="button"
                      onClick={() => setVoucherModal({ open: true, mode: "payment", customer: c })}
                      className="py-2 px-3 rounded-xl bg-teal text-white text-[12px] font-black hover:bg-teal/90"
                    >
                      💰 {isEn ? "Pay / Credit" : "سند قبض"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatementCustomerId(c.id)}
                      className="py-2 px-3 rounded-xl bg-primary-pale text-primary text-[12px] font-black hover:bg-primary hover:text-white transition-all"
                    >
                      📄 {isEn ? "Statement" : "كشف حساب"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoucherModal({ open: true, mode: "debit", customer: c })}
                      className="py-1.5 px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[12px] font-bold hover:bg-amber-100"
                    >
                      ➕ {isEn ? "Manual Debt" : "دين يدوي"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/customers/${encodeURIComponent(c.id)}`)}
                      className="py-1.5 px-3 rounded-xl bg-bg text-ink-soft border border-mint-line text-[12px] font-bold hover:text-ink"
                    >
                      ↗️ {isEn ? "Full Page" : "صفحة العميل"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCustomer(null);
        }}
        pharmacyId={user.pharmacy_id}
        branches={activeBranches}
        initialCustomer={editingCustomer}
        defaultBranchId={effectiveBranchId}
        isGeneralManager={isGeneralManager}
        cashierName={user.managerName || user.name || ""}
        lang={language}
        onSaved={(cid) => refreshAllCustomerViews(cid)}
      />

      {/* Payment / Manual Debt Voucher Modal */}
      <CustomerVoucherModal
        open={voucherModal.open}
        onClose={() => setVoucherModal({ open: false, mode: "payment", customer: null })}
        mode={voucherModal.mode}
        customer={voucherModal.customer}
        pharmacyId={user.pharmacy_id}
        pharmacyName={pharmacyName}
        branchId={effectiveBranchId !== "all" ? effectiveBranchId : null}
        branchName={activeBranchName}
        cashierName={user.managerName || user.name || ""}
        lang={language}
        onCompleted={() => refreshAllCustomerViews(voucherModal.customer?.id)}
      />

      {/* Unified Account Statement Modal */}
      <CustomerStatementModal
        customerId={statementCustomerId}
        pharmacyId={user.pharmacy_id}
        pharmacyName={pharmacyName}
        branches={activeBranches}
        canManageCustomer={canDeleteCustomer}
        lang={language}
        onClose={() => setStatementCustomerId(null)}
        onOpenVoucher={(mode, cust) => setVoucherModal({ open: true, mode, customer: cust })}
        onEditCustomer={(cust) => {
          setEditingCustomer(cust);
          setFormOpen(true);
        }}
        onDeleted={() => refreshAllCustomerViews()}
      />
    </main>
  );
}
