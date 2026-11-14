"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useSWR from "swr";
import AppBar from "@/components/AppBar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import SearchBar from "@/components/SearchBar";
import { API_BASE_URL } from "@/lib/config";
import { useStore } from "@/store";
import {
  DEFAULT_STAFF_ROLES,
  getRoleDisplayName,
  normalizeRoleForBackend,
} from "@/data/roles";
import {
  isBranchActive,
  isMainBranch,
  countActiveBranches,
  canAddBranch,
  validateBranchInput,
  type BranchRecord,
} from "@/lib/branches/domain";
import {
  useBranchesData,
  addBranch,
  editBranch,
  archiveBranch,
  restoreBranch,
} from "@/lib/branches/api";

const staffFetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BranchesAndStaff() {
  const user = useStore((state: any) => state.user);
  const language = (useStore((state: any) => state.language) || "ar") as "ar" | "en";
  const isEn = language === "en";
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    } else if (user.role !== "manager" && user.role !== "owner") {
      toast.error(isEn ? "You do not have permission to access this page" : "ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router, isEn]);

  const [activeMainTab, setActiveMainTab] = useState<"branches" | "staff">("branches");
  const [branchFilterTab, setBranchFilterTab] = useState<"active" | "archived">("active");
  const [branchSearch, setBranchSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  // Branch Modals
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [branchFormData, setBranchFormData] = useState({ name: "", addr: "", phone: "" });
  const [branchFormError, setBranchFormError] = useState("");
  const [branchSaving, setBranchSaving] = useState(false);

  // Archive Confirm
  const [archiveTarget, setArchiveTarget] = useState<BranchRecord | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Staff Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    branch: "",
    role: "pharmacist",
    phone: "",
    email: "",
    password: "",
    controlledMedsAccess: false,
  });
  const [staffSaving, setStaffSaving] = useState(false);

  // Data Hooks
  const { branches, quota, isLoading: branchesLoading, mutate: mutateBranches } = useBranchesData(
    user?.pharmacy_id,
    { includeArchived: true }
  );

  const { data: staffData, mutate: mutateStaff } = useSWR(
    user ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/staff` : null,
    staffFetcher
  );
  const staff = staffData?.staff || [];

  // Active branches count & quota resolution
  const activeCount = useMemo(() => countActiveBranches(branches), [branches]);
  const activeBranches = useMemo(() => branches.filter(isBranchActive), [branches]);
  const archivedBranches = useMemo(() => branches.filter((b) => !isBranchActive(b)), [branches]);

  const effectiveQuota = useMemo(() => {
    if (quota) return quota;
    return {
      maxBranches: 2,
      activeCount,
      allowed: activeCount < 2,
      subscriptionType: "monthly",
    };
  }, [quota, activeCount]);

  const canAddMoreBranches = effectiveQuota.allowed;

  // Filtered lists
  const displayedBranches = useMemo(() => {
    const list = branchFilterTab === "active" ? activeBranches : archivedBranches;
    const q = branchSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.addr && b.addr.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  }, [branchFilterTab, activeBranches, archivedBranches, branchSearch]);

  const displayedStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s: any) =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.branch && s.branch.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [staff, staffSearch]);

  // Branch Handlers
  const handleOpenAddBranch = () => {
    if (!canAddMoreBranches) {
      toast.error(
        isEn
          ? `Plan branch limit reached (${effectiveQuota.maxBranches} branches). Upgrade your plan to add more.`
          : `تم الوصول للحد الأقصى للفروع في باقتك (${effectiveQuota.maxBranches} فروع). يرجى الترقية لإضافة فروع جديدة.`
      );
      return;
    }
    setEditingBranch(null);
    setBranchFormData({ name: "", addr: "", phone: "" });
    setBranchFormError("");
    setBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: BranchRecord) => {
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name || "",
      addr: branch.addr || "",
      phone: branch.phone || "",
    });
    setBranchFormError("");
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!user?.pharmacy_id) return;
    const validation = validateBranchInput(branchFormData, branches, editingBranch ? editingBranch.id : null);
    if (!validation.ok) {
      setBranchFormError(validation.message || (isEn ? "Invalid branch details" : "بيانات الفرع غير صالحة"));
      return;
    }

    setBranchSaving(true);
    setBranchFormError("");
    try {
      if (editingBranch) {
        await editBranch(user.pharmacy_id, editingBranch.id, branchFormData, language);
        toast.success(isEn ? "Branch updated successfully" : "تم تحديث بيانات الفرع بنجاح");
      } else {
        await addBranch(user.pharmacy_id, branchFormData, language);
        toast.success(isEn ? "Branch added successfully" : "تمت إضافة الفرع بنجاح");
      }
      setBranchModalOpen(false);
      mutateBranches();
    } catch (err: any) {
      setBranchFormError(err.message || (isEn ? "Operation failed" : "تعذر حفظ الفرع"));
      toast.error(err.message || (isEn ? "Operation failed" : "تعذر حفظ الفرع"));
    } finally {
      setBranchSaving(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!user?.pharmacy_id || !archiveTarget) return;
    setArchiveLoading(true);
    try {
      await archiveBranch(user.pharmacy_id, archiveTarget.id, language);
      toast.success(isEn ? "Branch moved to archive cleanly" : "تمت أرشفة الفرع مع حفظ كافة السجلات السابقة");
      setArchiveTarget(null);
      mutateBranches();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Archive failed" : "تعذر أرشفة الفرع"));
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRestore = async (branch: BranchRecord) => {
    if (!user?.pharmacy_id) return;
    try {
      await restoreBranch(user.pharmacy_id, branch.id, language);
      toast.success(isEn ? "Branch restored to active state" : "تمت استعادة الفرع للعمل بنجاح");
      mutateBranches();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Restore failed" : "تعذر استعادة الفرع"));
    }
  };

  // Staff Handlers
  const resolveRoleId = (roleStr?: string): string => {
    if (!roleStr) return "pharmacist";
    const r = String(roleStr).trim().toLowerCase();
    if (r === "branchmanager" || r === "branch_manager" || r === "مدير فرع" || r === "branch manager") {
      return "branchManager";
    }
    if (r === "cashier" || r === "كاشير") return "cashier";
    return "pharmacist";
  };

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffFormData({
      name: "",
      branch: activeBranches.length > 0 ? activeBranches[0].name : "",
      role: "pharmacist",
      phone: "",
      email: "",
      password: "",
      controlledMedsAccess: false,
    });
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = (emp: any) => {
    setEditingStaffId(emp.id);
    const rawEmail = (emp.email || "").trim();
    const rawPhone = (emp.phone || "").trim();
    const isEmail = rawEmail.includes("@");
    let phone = rawPhone;
    let email = rawEmail;
    if (!phone && /^[0-9+\-\s]{7,}$/.test(rawEmail)) {
      phone = rawEmail;
      email = "";
    } else if (!email && isEmail) {
      email = rawEmail;
    }

    setStaffFormData({
      name: emp.name || "",
      branch: emp.branch || (activeBranches.length > 0 ? activeBranches[0].name : ""),
      role: resolveRoleId(emp.role),
      phone,
      email,
      password: emp.password || "",
      controlledMedsAccess: Boolean(emp.controlledMedsAccess),
    });
    setShowAddStaffModal(true);
  };

  const handleSaveStaff = async () => {
    if (!staffFormData.name) {
      return toast.error(isEn ? "Enter staff name" : "أدخل اسم الموظف");
    }
    setStaffSaving(true);
    try {
      const url = editingStaffId
        ? `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${editingStaffId}`
        : `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff`;

      const payloadRole = normalizeRoleForBackend(staffFormData.role);
      const cleanEmail = (staffFormData.email || "").trim().toLowerCase();
      const cleanPhone = (staffFormData.phone || "").trim();

      const res = await fetch(url, {
        method: editingStaffId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: staffFormData.name,
          email: cleanEmail || cleanPhone,
          phone: cleanPhone,
          password: staffFormData.password,
          role: payloadRole,
          branch: staffFormData.branch,
          controlledMedsAccess: staffFormData.controlledMedsAccess ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          editingStaffId
            ? (isEn ? "Staff updated successfully" : "تم تعديل الموظف بنجاح")
            : (isEn ? "Staff added successfully" : "تمت إضافة الموظف بنجاح")
        );
        setShowAddStaffModal(false);
        mutateStaff();
      } else {
        toast.error(data.error || (isEn ? "Save failed" : "فشل الحفظ"));
      }
    } catch {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setStaffSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(isEn ? "Staff removed" : "تم حذف الموظف");
        mutateStaff();
      } else {
        toast.error(isEn ? "Delete failed" : "فشل الحذف");
      }
    } catch {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    }
  };

  if (!user) return null;

  return (
    <>
      <AppBar title={isEn ? "Branches & Staff Management" : "إدارة الفروع والموظفين"} backHref="/more" />
      <main className="max-w-5xl mx-auto p-4 md:p-6 pb-24 mt-2 relative space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-mint-line/30 rounded-2xl p-1.5 shadow-sm">
          <button
            onClick={() => setActiveMainTab("branches")}
            className={`flex-1 py-3 rounded-xl text-[14px] font-black transition-all flex items-center justify-center gap-2 ${
              activeMainTab === "branches" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>🏢</span>
            <span>{isEn ? "Branch Management" : "إدارة الفروع"}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-primary-pale text-primary font-black">
              {activeBranches.length}
            </span>
          </button>
          <button
            onClick={() => setActiveMainTab("staff")}
            className={`flex-1 py-3 rounded-xl text-[14px] font-black transition-all flex items-center justify-center gap-2 ${
              activeMainTab === "staff" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"
            }`}
          >
            <span>👥</span>
            <span>{isEn ? "Staff Members" : "الموظفين وفريق العمل"}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-bg text-ink font-bold">
              {staff.length}
            </span>
          </button>
        </div>

        {activeMainTab === "branches" ? (
          <div className="space-y-6">
            {/* Subscription Branch Quota Card */}
            <div className="bg-white rounded-3xl p-5 border border-mint-line shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-black text-primary">
                    {isEn ? "Subscription Branch Entitlement" : "سقف الفروع في باقة الاشتراك"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black">
                    {effectiveQuota.subscriptionType === "monthly"
                      ? isEn ? "Monthly Plan (Max 2 Branches)" : "الباقة الشهرية (فرعان كحد أقصى)"
                      : effectiveQuota.subscriptionType === "trial" || effectiveQuota.subscriptionType === "free"
                        ? isEn ? "Free Trial (1 Branch)" : "التجريبية (فرع واحد)"
                        : isEn ? "Annual/Lifetime (Unlimited)" : "سنوية / مدى الحياة (غير محدود)"}
                  </span>
                </div>
                <div className="text-[12px] text-ink-soft font-medium">
                  {canAddMoreBranches
                    ? isEn
                      ? `You have used ${effectiveQuota.activeCount} of ${effectiveQuota.maxBranches} permitted active branches.`
                      : `استخدمت ${effectiveQuota.activeCount} من أصل ${effectiveQuota.maxBranches} فروع نشطة مسموحة في باقتك.`
                    : isEn
                      ? `Branch limit reached (${effectiveQuota.activeCount} / ${effectiveQuota.maxBranches}). Upgrade to unlock more branches.`
                      : `بلغت الحد الأقصى لباقة اشتراكك (${effectiveQuota.activeCount} / ${effectiveQuota.maxBranches}). يمكنك ترقية الباقة لفتح فروع إضافية.`}
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full max-w-md h-2 rounded-full bg-bg overflow-hidden mt-2">
                  <div
                    className={`h-full transition-all rounded-full ${
                      !canAddMoreBranches ? "bg-amber" : "bg-primary"
                    }`}
                    style={{
                      width: `${Math.min(100, (effectiveQuota.activeCount / Math.max(1, effectiveQuota.maxBranches)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {!canAddMoreBranches && (
                  <Link
                    href="/upgrade-plan"
                    className="px-4 py-2.5 rounded-xl bg-amber-pale border border-amber text-ink font-black text-[12px] hover:bg-amber/20 transition-colors"
                  >
                    ⚡ {isEn ? "Upgrade Plan" : "ترقية الباقة"}
                  </Link>
                )}
                <button
                  onClick={handleOpenAddBranch}
                  disabled={!canAddMoreBranches}
                  className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-primary text-white font-black text-[13px] shadow-md shadow-primary/20 hover:bg-primary-light disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  <span>{isEn ? "Add Branch" : "إضافة فرع جديد"}</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBranchFilterTab("active")}
                  className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                    branchFilterTab === "active"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg text-ink-soft hover:text-ink"
                  }`}
                >
                  {isEn ? "Active Branches" : "الفروع النشطة"} ({activeBranches.length})
                </button>
                <button
                  onClick={() => setBranchFilterTab("archived")}
                  className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                    branchFilterTab === "archived"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg text-ink-soft hover:text-ink"
                  }`}
                >
                  {isEn ? "Archived Branches" : "الأرشيف"} ({archivedBranches.length})
                </button>
              </div>

              <div className="flex-1 min-w-[220px] max-w-md">
                <SearchBar
                  value={branchSearch}
                  onChange={setBranchSearch}
                  placeholder={isEn ? "Search branch by name, address, phone..." : "ابحث باسم الفرع، العنوان، أو الهاتف..."}
                />
              </div>
            </div>

            {/* Branches Roster Cards */}
            {branchesLoading ? (
              <div className="p-12 text-center font-bold text-ink-soft bg-white rounded-3xl border border-mint-line">
                {isEn ? "Loading branches..." : "جاري تحميل الفروع..."}
              </div>
            ) : displayedBranches.length === 0 ? (
              <div className="p-12 text-center font-bold text-ink-soft bg-white rounded-3xl border border-mint-line space-y-2">
                <div>{isEn ? "No branches match your filter." : "لا توجد فروع مطابقة للبحث أو الفلتر."}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedBranches.map((branch) => {
                  const bStaff = staff.filter((s: any) => s.branch === branch.name || s.branch_id === branch.id);
                  const isMain = isMainBranch(branch);
                  const active = isBranchActive(branch);

                  return (
                    <div
                      key={branch.id}
                      className="bg-white border border-mint-line rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-primary text-[17px]">{branch.name}</h3>
                            {isMain && (
                              <span className="px-2 py-0.5 rounded-full bg-primary-pale text-primary text-[10px] font-black">
                                🏛 {isEn ? "Headquarters" : "المقر الرئيسي"}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                active ? "bg-emerald-50 text-emerald-700" : "bg-amber-pale text-amber"
                              }`}
                            >
                              {active ? (isEn ? "Active" : "نشط") : (isEn ? "Archived" : "مؤرشف")}
                            </span>
                          </div>

                          <div className="text-[12px] text-ink-soft font-semibold flex items-center gap-2">
                            <span>📍</span>
                            <span>{branch.addr || (isEn ? "Address not specified" : "العنوان غير محدد")}</span>
                          </div>

                          {branch.phone && (
                            <div className="text-[12px] text-ink-soft font-mono flex items-center gap-2">
                              <span>📞</span>
                              <span dir="ltr">{branch.phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-center px-3 py-2 rounded-2xl bg-bg border border-mint-line/50">
                          <div className="text-[18px] font-black text-primary font-mono">{bStaff.length}</div>
                          <div className="text-[10px] text-ink-soft font-bold">{isEn ? "Staff" : "موظف"}</div>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-mint-line/40">
                        {active ? (
                          <>
                            <button
                              onClick={() => handleOpenEditBranch(branch)}
                              className="px-3 py-1.5 rounded-xl bg-bg text-ink text-[12px] font-bold hover:bg-primary hover:text-white transition-colors"
                            >
                              ✏️ {isEn ? "Edit" : "تعديل"}
                            </button>
                            <button
                              onClick={() => setArchiveTarget(branch)}
                              className="px-3 py-1.5 rounded-xl bg-coral-pale text-coral text-[12px] font-black hover:bg-coral hover:text-white transition-colors"
                            >
                              📦 {isEn ? "Archive" : "أرشفة"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(branch)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-[12px] font-black hover:bg-emerald-700 transition-colors"
                          >
                            ↩️ {isEn ? "Restore Branch" : "استعادة الفرع"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Staff Management Tab */
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
              <div className="flex-1 min-w-[220px]">
                <SearchBar
                  value={staffSearch}
                  onChange={setStaffSearch}
                  placeholder={isEn ? "Search staff by name, role, branch, phone..." : "ابحث باسم الموظف، الفرع، الهاتف، أو المسمى..."}
                />
              </div>
              <button
                onClick={handleOpenAddStaff}
                className="px-4 py-2.5 rounded-xl bg-primary text-white font-black text-[13px] shadow-sm hover:bg-primary-light transition-all flex items-center gap-2"
              >
                <span>+</span>
                <span>{isEn ? "Add New Staff" : "إضافة موظف جديد"}</span>
              </button>
            </div>

            <div className="space-y-3">
              {displayedStaff.map((emp: any) => (
                <div
                  key={emp.id}
                  className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary-pale text-primary font-black text-[16px] flex items-center justify-center">
                    {String(emp.name || "ST")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-ink text-[15px]">{emp.name}</h4>
                      {Boolean(emp.controlledMedsAccess) && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-pale text-amber text-[10px] font-black">
                          🛡 {isEn ? "Controlled Meds Access" : "صلاحية المراقبة"}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-soft font-semibold flex items-center gap-2 mt-0.5">
                      <span className="text-primary font-black">{getRoleDisplayName(emp.role, language)}</span>
                      <span>•</span>
                      <span>{emp.branch || (isEn ? "Unassigned" : "غير محدد")}</span>
                    </div>
                    {(emp.phone || (emp.email && emp.email.includes("@"))) && (
                      <div className="text-[11px] text-ink-soft/80 flex items-center gap-2 mt-0.5 font-mono">
                        {emp.phone && <span dir="ltr">{emp.phone}</span>}
                        {emp.phone && emp.email && emp.email.includes("@") && <span>•</span>}
                        {emp.email && emp.email.includes("@") && <span>{emp.email}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditStaff(emp)}
                      className="px-3 py-1.5 rounded-xl bg-bg hover:bg-mint-line text-ink font-bold text-[12px] transition-colors"
                    >
                      {isEn ? "Edit" : "تعديل"}
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(emp.id)}
                      className="px-3 py-1.5 rounded-xl bg-coral-pale hover:bg-coral hover:text-white text-coral font-bold text-[12px] transition-colors"
                    >
                      {isEn ? "Delete" : "حذف"}
                    </button>
                  </div>
                </div>
              ))}
              {displayedStaff.length === 0 && (
                <div className="text-center py-12 text-ink-soft font-bold bg-white rounded-3xl border border-mint-line">
                  {isEn ? "No staff records found." : "لا يوجد موظفين مسجلين."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add / Edit Branch Modal */}
        {branchModalOpen && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-mint-line animate-fade-in-up space-y-4">
              <div className="flex justify-between items-center border-b border-mint-line/40 pb-3">
                <h3 className="text-[18px] font-black text-primary">
                  {editingBranch
                    ? isEn ? "Edit Branch Details" : "تعديل بيانات الفرع"
                    : isEn ? "Add New Branch" : "إضافة فرع جديد"}
                </h3>
                <button
                  onClick={() => setBranchModalOpen(false)}
                  className="text-ink-soft hover:text-coral transition-colors font-bold text-[18px]"
                >
                  ✕
                </button>
              </div>

              {branchFormError && (
                <div className="p-3 rounded-xl bg-coral-pale border border-coral/30 text-coral text-[12px] font-bold">
                  ⚠️ {branchFormError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Branch Name *" : "اسم الفرع *"}
                  </label>
                  <input
                    type="text"
                    value={branchFormData.name}
                    onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                    placeholder={isEn ? "e.g. Al-Rimal Branch" : "مثال: فرع الرمال، فرع النصر..."}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Branch Address / Location" : "عنوان الفرع أو المقر"}
                  </label>
                  <input
                    type="text"
                    value={branchFormData.addr}
                    onChange={(e) => setBranchFormData({ ...branchFormData, addr: e.target.value })}
                    placeholder={isEn ? "e.g. Omar Al-Mukhtar St." : "مثال: شارع عمر المختار، بجوار المسجد..."}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Branch Contact Phone" : "رقم هاتف الفرع"}
                  </label>
                  <input
                    type="text"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    placeholder="059X XXX XXX"
                    dir="ltr"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary text-start"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBranchModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-bg text-ink font-black text-[13px] hover:bg-mint-line transition-colors"
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveBranch}
                  disabled={branchSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-[13px] shadow-md shadow-primary/20 hover:bg-teal disabled:opacity-50 transition-all"
                >
                  {branchSaving ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Branch" : "حفظ الفرع")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Staff Modal */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-mint-line animate-fade-in-up space-y-4">
              <div className="flex justify-between items-center border-b border-mint-line/40 pb-3">
                <h3 className="text-[18px] font-black text-primary">
                  {editingStaffId
                    ? isEn ? "Edit Staff Details" : "تعديل بيانات الموظف"
                    : isEn ? "Add New Staff" : "إضافة موظف جديد"}
                </h3>
                <button
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-ink-soft hover:text-coral transition-colors font-bold text-[18px]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Staff Name *" : "اسم الموظف *"}
                  </label>
                  <input
                    type="text"
                    value={staffFormData.name}
                    onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                    placeholder={isEn ? "Full Name" : "الاسم الرباعي"}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-bold text-ink mb-1.5">
                      {isEn ? "Branch" : "الفرع المخصص"}
                    </label>
                    <select
                      value={staffFormData.branch}
                      onChange={(e) => setStaffFormData({ ...staffFormData, branch: e.target.value })}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                    >
                      {activeBranches.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-ink mb-1.5">
                      {isEn ? "Role" : "المسمى الوظيفي"}
                    </label>
                    <select
                      value={resolveRoleId(staffFormData.role)}
                      onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                    >
                      {DEFAULT_STAFF_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {isEn ? r.name_en : r.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Mobile / Username" : "رقم الجوال (اسم الدخول)"}
                  </label>
                  <input
                    type="text"
                    value={staffFormData.phone}
                    onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    placeholder="059X XXX XXX"
                    dir="ltr"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary text-start"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Password" : "كلمة المرور"}
                  </label>
                  <input
                    type="text"
                    value={staffFormData.password}
                    onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                    placeholder={isEn ? "Leave empty to keep current" : "كلمة المرور للدخول"}
                    dir="ltr"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary text-start"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="controlledAccessCheck"
                    checked={staffFormData.controlledMedsAccess}
                    onChange={(e) => setStaffFormData({ ...staffFormData, controlledMedsAccess: e.target.checked })}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                  <label htmlFor="controlledAccessCheck" className="text-[13px] font-bold text-ink cursor-pointer">
                    {isEn ? "Controlled Meds Access Authorization" : "صلاحية بيع أدوية المراقبة (المخدرة)"}
                  </label>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-3 rounded-xl bg-bg text-ink font-black text-[13px] hover:bg-mint-line transition-colors"
                >
                  {isEn ? "Cancel" : "إلغاء"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveStaff}
                  disabled={staffSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-black text-[13px] shadow-md shadow-primary/20 hover:bg-teal disabled:opacity-50 transition-all"
                >
                  {staffSaving ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Staff" : "حفظ الموظف")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Archive Dialog */}
        <ConfirmDialog
          isOpen={Boolean(archiveTarget)}
          title={isEn ? "Archive Branch" : "تأكيد أرشفة الفرع"}
          message={
            archiveTarget
              ? isEn
                ? `Are you sure you want to archive "${archiveTarget.name}"? Past sales and inventory records will remain safely preserved in the ledger.`
                : `هل أنت متأكد من أرشفة الفرع "${archiveTarget.name}"؟ ستبقى كافة سجلات المبيعات والمخزون التاريخية محفوظة في النظام بأمان دون مساس.`
              : ""
          }
          confirmLabel={isEn ? "Archive Branch" : "أرشفة الفرع"}
          cancelLabel={isEn ? "Cancel" : "إلغاء"}
          tone="danger"
          loading={archiveLoading}
          onConfirm={handleConfirmArchive}
          onClose={() => setArchiveTarget(null)}
        />
      </main>
    </>
  );
}
