"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import AppBar from "@/components/AppBar";
import CustomerFormModal from "@/components/customers/CustomerFormModal";
import CustomerVoucherModal from "@/components/customers/CustomerVoucherModal";
import CustomerStatementModal from "@/components/customers/CustomerStatementModal";
import { API_BASE_URL } from "@/lib/config";
import { useStore } from "@/store";
import { authJsonFetcher, useCustomersList } from "@/lib/customers/api";
import {
  getActiveBranches,
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
    return getActiveBranches(branchesData?.branches || []);
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
    let settledCount = 0;

    for (const c of customers) {
      const bal = round2(c.debt || 0);
      if (bal > 0.005) {
        totalReceivables = round2(totalReceivables + bal);
        debtorsCount++;
      } else if (bal < -0.005) {
        totalStoreCredit = round2(totalStoreCredit + Math.abs(bal));
        creditHoldersCount++;
      } else {
        settledCount++;
      }
    }

    return {
      totalCount: customers.length,
      totalReceivables,
      totalStoreCredit,
      debtorsCount,
      creditHoldersCount,
      settledCount,
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !user) return null;

  const activeBranchName =
    effectiveBranchId !== "all" ? resolveBranchName(effectiveBranchId, activeBranches, language) : "";

  const getInitials = (rawName: string) => {
    const parts = String(rawName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "؟";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  const hasActiveFilter = Boolean(searchQuery.trim() || balanceFilter !== "all");

  return (
    <main className="w-full pb-24">
      <AppBar title={isEn ? "Customers & Accounts Receivable" : "العملاء ودفتر الذمم"} backHref="/" />

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        {/* Clean Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-black text-primary tracking-tight">
                {isEn ? "Customers & Receivables" : "العملاء والذمم المالية"}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white border border-mint-line text-ink-soft">
                🏪 {activeBranchName || (isEn ? "All Branches" : "جميع الفروع")}
              </span>
            </div>
            <p className="text-[13px] font-medium text-ink-soft mt-0.5">
              {isEn
                ? "Unified receivables, advance store credit, payment vouchers, and chronological statements."
                : "متابعة موحدة للذمم، الأرصدة الدائنة، سندات القبض وكشوفات الحساب لحظياً."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary/90 shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
          >
            <span className="text-[16px] leading-none">+</span>
            <span>{isEn ? "Add Customer" : "عميل جديد"}</span>
          </button>
        </div>

        {/* 4-Card KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
            <div className="text-[12px] font-bold text-ink-soft">{isEn ? "Total Customers" : "إجمالي العملاء"}</div>
            <div className="font-mono font-black text-[22px] text-primary mt-1">{stats.totalCount}</div>
            <div className="text-[11px] font-medium text-ink-soft mt-0.5">
              {activeBranchName || (isEn ? "All active branches" : "على مستوى الفروع")}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-coral/25 shadow-xs">
            <div className="text-[12px] font-bold text-coral">{isEn ? "Total Receivables" : "إجمالي الذمم (لنا)"}</div>
            <div dir="ltr" className="font-mono font-black text-[21px] text-coral mt-1 text-start">
              {stats.totalReceivables.toFixed(2)} ₪
            </div>
            <div className="text-[11px] font-semibold text-ink-soft mt-0.5">
              {stats.debtorsCount} {isEn ? "accounts with debt" : "عميل عليهم دين"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs">
            <div className="text-[12px] font-bold text-emerald-700">{isEn ? "Advance Store Credit" : "أرصدة دائنة (لهم)"}</div>
            <div dir="ltr" className="font-mono font-black text-[21px] text-emerald-700 mt-1 text-start">
              {stats.totalStoreCredit.toFixed(2)} ₪
            </div>
            <div className="text-[11px] font-semibold text-ink-soft mt-0.5">
              {stats.creditHoldersCount} {isEn ? "prepaid accounts" : "عميل برصيد متاح"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-xs">
            <div className="text-[12px] font-bold text-ink-soft">{isEn ? "Settled Accounts" : "الحسابات الصافية"}</div>
            <div className="font-mono font-black text-[22px] text-primary mt-1">{stats.settledCount}</div>
            <div className="text-[11px] font-medium text-ink-soft mt-0.5">
              {isEn ? `Showing ${filteredCustomers.length} in view` : `المعروض حالياً: ${filteredCustomers.length}`}
            </div>
          </div>
        </div>

        {/* Unified Search, Status Pills & Branch Selector */}
        <div className="bg-white rounded-2xl p-3 border border-mint-line shadow-xs flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-bg/60 border border-mint-line rounded-xl px-3 py-2 focus-within:border-primary focus-within:bg-white transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-soft shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search by name, phone, or ID..." : "ابحث باسم العميل، رقم الجوال أو الرمز..."}
              className="w-full bg-transparent outline-none text-[14px] text-ink placeholder:text-ink-soft/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-ink-soft hover:text-ink text-[12px] font-bold px-1.5"
                title={isEn ? "Clear" : "مسح"}
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all" as const, ar: "الكل", en: "All", count: stats.totalCount },
              { id: "debt" as const, ar: "عليهم ذمم", en: "Debt", count: stats.debtorsCount },
              { id: "credit" as const, ar: "لهم رصيد", en: "Credit", count: stats.creditHoldersCount },
              { id: "settled" as const, ar: "خالص", en: "Settled", count: stats.settledCount },
            ].map((pill) => {
              const active = balanceFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setBalanceFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors border flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-white border-primary"
                      : "bg-bg/70 text-ink-soft border-mint-line hover:bg-bg hover:text-ink"
                  }`}
                >
                  <span>{isEn ? pill.en : pill.ar}</span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                      active ? "bg-white/20 text-white" : "bg-white text-ink-soft"
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}

            {isGeneralManager && activeBranches.length > 0 && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                aria-label={isEn ? "Filter by branch" : "فلترة حسب الفرع"}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold border border-mint-line bg-bg/70 text-ink outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">{isEn ? "All Branches" : "كل الفروع"}</option>
                {activeBranches.map((br) => (
                  <option key={br.id} value={String(br.id)}>
                    🏪 {br.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Scannable Customer List */}
        {isLoading && customers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center text-ink-soft font-bold shadow-xs">
            {isEn ? "Loading customers..." : "جاري تحميل سجل العملاء..."}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-mint-line p-12 text-center shadow-xs space-y-2.5">
            <div className="text-4xl">👥</div>
            <div className="text-[16px] font-black text-ink">
              {isEn ? "No matching customers" : "لا يوجد عملاء مطابقون للبحث"}
            </div>
            <p className="text-[13px] text-ink-soft max-w-md mx-auto">
              {isEn
                ? "Add a new customer or clear active search and balance filters."
                : "أضف عميلاً جديداً أو أعد ضبط خيارات البحث والفلترة لعرض الحسابات."}
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setBalanceFilter("all");
                }}
                className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-primary-pale text-primary text-[12px] font-bold hover:bg-primary hover:text-white transition-colors"
              >
                {isEn ? "Reset Filters" : "عرض جميع العملاء"}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-mint-line shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-bg/50 border-b border-mint-line flex items-center justify-between text-[12px] font-bold text-ink-soft">
              <span>
                {isEn
                  ? `Showing ${filteredCustomers.length} of ${stats.totalCount} accounts`
                  : `عرض ${filteredCustomers.length} من أصل ${stats.totalCount} عميل`}
              </span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setBalanceFilter("all");
                  }}
                  className="text-primary hover:underline"
                >
                  {isEn ? "Clear filters" : "مسح الفلتر"}
                </button>
              )}
            </div>

            <div className="divide-y divide-mint-line/80">
              {filteredCustomers.map((c) => {
                const bal = round2(c.debt || 0);
                const isCredit = bal < -0.005;
                const isDebt = bal > 0.005;
                const branchTitle = c.branch_id
                  ? resolveBranchName(c.branch_id, activeBranches, language)
                  : isEn
                    ? "Shared"
                    : "عام للجميع";

                const avatarStyle = isDebt
                  ? "bg-coral-pale text-coral border border-coral/20"
                  : isCredit
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-primary-pale text-primary border border-mint-line";

                const statusPillStyle = isDebt
                  ? "bg-coral-pale text-coral border-coral/25"
                  : isCredit
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-ink-soft border-mint-line";

                const statusLabel = isCredit
                  ? isEn
                    ? "Store Credit"
                    : "له رصيد"
                  : isDebt
                    ? isEn
                      ? "Receivable"
                      : "عليه دين"
                    : isEn
                      ? "Settled"
                      : "خالص";

                return (
                  <div
                    key={c.id}
                    className="px-4 py-3.5 hover:bg-primary-pale/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Identity & Metadata (Click opens statement drawer) */}
                    <button
                      type="button"
                      onClick={() => setStatementCustomerId(c.id)}
                      className="flex items-center gap-3.5 min-w-0 flex-1 text-start group"
                    >
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-black text-[13px] ${avatarStyle}`}>
                        {getInitials(c.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-bold text-ink truncate group-hover:text-primary transition-colors">
                            {c.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-bg text-ink-soft border border-mint-line/80 text-[11px] font-semibold shrink-0">
                            {branchTitle}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[12px] text-ink-soft">
                          <span dir="ltr" className="font-mono">
                            {c.phone || (isEn ? "No phone" : "بدون جوال")}
                          </span>
                          {c.lastVisit && (
                            <>
                              <span className="text-mint-line">•</span>
                              <span>🕒 {c.lastVisit}</span>
                            </>
                          )}
                          {c.notes && (
                            <>
                              <span className="text-mint-line">•</span>
                              <span className="truncate max-w-[260px] text-ink-soft/80">{c.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Balance Pill + Compact Actions */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 shrink-0">
                      <div className={`px-3 py-1 rounded-xl border flex items-center gap-2 ${statusPillStyle}`}>
                        <span className="text-[11px] font-bold">{statusLabel}</span>
                        <span dir="ltr" className="font-mono font-black text-[14px]">
                          {Math.abs(bal).toFixed(2)} ₪
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setVoucherModal({ open: true, mode: "payment", customer: c })}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white text-[12px] font-bold transition-colors"
                        >
                          {isEn ? "Receipt" : "سند قبض"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoucherModal({ open: true, mode: "debit", customer: c })}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-600 hover:text-white text-[12px] font-bold transition-colors"
                        >
                          {isEn ? "+ Debt" : "+ دين"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatementCustomerId(c.id)}
                          className="px-3 py-1.5 rounded-lg bg-primary-pale text-primary hover:bg-primary hover:text-white text-[12px] font-bold transition-colors"
                        >
                          {isEn ? "Statement" : "كشف الحساب"}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/customers/${encodeURIComponent(c.id)}`)}
                          title={isEn ? "Open full customer page" : "فتح صفحة العميل المستقلة"}
                          aria-label={isEn ? "Open full customer page" : "فتح صفحة العميل المستقلة"}
                          className="p-1.5 rounded-lg bg-bg/70 text-ink-soft border border-mint-line hover:text-primary hover:bg-white transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M7 17L17 7M7 7h10v10" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
