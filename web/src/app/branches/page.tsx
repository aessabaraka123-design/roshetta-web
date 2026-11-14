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
import {
  useStaffData,
  addStaff,
  editStaff,
  deleteStaff,
  toggleStaffStatus,
} from "@/lib/staff/api";
import {
  normalizeRole,
  isStaffActive,
  canActorManageStaff,
  validateStaffInput,
  getRoleDisplayName,
  CANONICAL_ROLES,
  type StaffRecord,
} from "@/lib/staff/domain";

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

  // Staff Modals & State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFilterTab, setStaffFilterTab] = useState<"active" | "suspended">("active");
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<StaffRecord | null>(null);
  const [staffDeleteLoading, setStaffDeleteLoading] = useState(false);
  const [staffFormError, setStaffFormError] = useState("");
  const [staffFormData, setStaffFormData] = useState({
    name: "",
    branch: "",
    role: "pharmacist",
    phone: "",
    email: "",
    password: "",
    salary: 0,
    active: 1,
    controlledMedsAccess: false,
    avatar: "",
  });
  const [staffSaving, setStaffSaving] = useState(false);

  // Data Hooks
  const { branches, quota, isLoading: branchesLoading, mutate: mutateBranches } = useBranchesData(
    user?.pharmacy_id,
    { includeArchived: true }
  );

  const {
    staff,
    quota: staffQuota,
    isLoading: staffLoading,
    mutate: mutateStaff,
  } = useStaffData(user?.pharmacy_id);

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

  // Active & Suspended Staff
  const activeStaff = useMemo(() => staff.filter(isStaffActive), [staff]);
  const suspendedStaff = useMemo(() => staff.filter((s) => !isStaffActive(s)), [staff]);

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
    const list = staffFilterTab === "active" ? activeStaff : suspendedStaff;
    const q = staffSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s: StaffRecord) =>
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.branch && s.branch.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [staffFilterTab, activeStaff, suspendedStaff, staffSearch]);

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
  const handleOpenAddStaff = () => {
    if (!staffQuota.allowed) {
      toast.error(
        isEn
          ? `Plan staff limit reached (${staffQuota.maxStaff} staff members). Upgrade your plan to add more.`
          : `تم الوصول للحد الأقصى للموظفين في باقتك (${staffQuota.maxStaff} موظفين). يرجى الترقية لإضافة موظف جديد.`
      );
      return;
    }
    setEditingStaffId(null);
    setStaffFormData({
      name: "",
      branch: activeBranches.length > 0 ? activeBranches[0].name : "",
      role: "pharmacist",
      phone: "",
      email: "",
      password: "",
      salary: 0,
      active: 1,
      controlledMedsAccess: false,
      avatar: "",
    });
    setStaffFormError("");
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = (emp: StaffRecord) => {
    setEditingStaffId(emp.id);
    const cleanEmpBranch = String(emp.branch || "").trim();
    const matchedBranch = activeBranches.find(
      (b) => String(b.name || "").trim() === cleanEmpBranch || String(b.id) === cleanEmpBranch
    );
    const branchName = matchedBranch
      ? matchedBranch.name
      : activeBranches.length > 0
      ? activeBranches[0].name
      : cleanEmpBranch;

    setStaffFormData({
      name: emp.name || "",
      branch: branchName,
      role: normalizeRole(emp.role),
      phone: emp.phone || "",
      email: emp.email || "",
      password: "",
      salary: Number(emp.salary) || 0,
      active: isStaffActive(emp) ? 1 : 0,
      controlledMedsAccess: Boolean(emp.controlledMedsAccess),
      avatar: emp.avatar || "",
    });
    setStaffFormError("");
    setShowAddStaffModal(true);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.error(isEn ? "Please select a valid image file" : "يرجى اختيار ملف صورة صالح");
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setStaffFormData((prev) => ({ ...prev, avatar: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStaff = async () => {
    if (!user?.pharmacy_id) return;
    const validation = validateStaffInput(staffFormData, staff, editingStaffId);
    if (!validation.ok) {
      const firstErr = Object.values(validation.errors)[0];
      setStaffFormError(firstErr);
      return toast.error(firstErr);
    }

    setStaffSaving(true);
    setStaffFormError("");
    try {
      if (editingStaffId) {
        await editStaff(user.pharmacy_id, editingStaffId, validation.cleanData, language);
        toast.success(isEn ? "Staff member updated successfully" : "تم تعديل بيانات الموظف بنجاح");
      } else {
        await addStaff(user.pharmacy_id, validation.cleanData, language);
        toast.success(isEn ? "Staff member added successfully" : "تمت إضافة الموظف بنجاح");
      }
      setShowAddStaffModal(false);
      mutateStaff();
    } catch (err: any) {
      setStaffFormError(err.message || (isEn ? "Operation failed" : "تعذر حفظ بيانات الموظف"));
      toast.error(err.message || (isEn ? "Operation failed" : "تعذر حفظ بيانات الموظف"));
    } finally {
      setStaffSaving(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!user?.pharmacy_id || !staffDeleteTarget) return;
    setStaffDeleteLoading(true);
    try {
      await deleteStaff(user.pharmacy_id, staffDeleteTarget.id, language);
      toast.success(isEn ? "Staff member removed successfully" : "تم حذف الموظف بنجاح");
      setStaffDeleteTarget(null);
      mutateStaff();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Operation failed" : "تعذر حذف الموظف"));
    } finally {
      setStaffDeleteLoading(false);
    }
  };

  const handleToggleStaffStatus = async (emp: StaffRecord) => {
    if (!user?.pharmacy_id) return;
    const targetActive = !isStaffActive(emp);
    try {
      await toggleStaffStatus(user.pharmacy_id, emp.id, targetActive, language);
      toast.success(
        targetActive
          ? (isEn ? "Staff member activated successfully" : "تم تفعيل حساب الموظف بنجاح")
          : (isEn ? "Staff member suspended" : "تم إيقاف حساب الموظف")
      );
      mutateStaff();
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Action failed" : "تعذر تغيير حالة الموظف"));
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
            {/* Subscription Staff Quota Banner */}
            <div className="bg-white rounded-3xl p-5 border border-mint-line shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[18px]">👥</span>
                  <h2 className="text-[16px] font-black text-ink">
                    {isEn ? "Staff Subscription Quota" : "سعة الموظفين في الباقة"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-primary-pale text-primary">
                    {staffQuota.activeCount} / {staffQuota.maxStaff} {isEn ? "Active Staff" : "موظفين نشطين"}
                  </span>
                </div>
                <p className="text-[12px] text-ink-soft font-medium mt-1">
                  {isEn
                    ? `Current plan supports up to ${staffQuota.maxStaff} active staff members.`
                    : `باقتك الحالية تدعم حتى ${staffQuota.maxStaff} موظفين نشطين مع صلاحيات دقيقة.`}
                </p>
                <div className="w-full md:w-64 bg-bg rounded-full h-2 mt-2 overflow-hidden border border-mint-line">
                  <div
                    className={`h-full rounded-full transition-all ${
                      staffQuota.remaining === 0 ? "bg-amber" : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, (staffQuota.activeCount / staffQuota.maxStaff) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {!staffQuota.allowed && (
                  <Link
                    href="/upgrade-plan"
                    className="px-4 py-2.5 rounded-xl bg-amber-pale border border-amber text-ink font-black text-[12px] hover:bg-amber/20 transition-colors"
                  >
                    ⚡ {isEn ? "Upgrade Plan" : "ترقية الباقة"}
                  </Link>
                )}
                <button
                  onClick={handleOpenAddStaff}
                  disabled={!staffQuota.allowed}
                  className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-primary text-white font-black text-[13px] shadow-md shadow-primary/20 hover:bg-primary-light disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  <span>{isEn ? "Add Staff" : "إضافة موظف جديد"}</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="bg-white rounded-2xl p-4 border border-mint-line shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStaffFilterTab("active")}
                  className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                    staffFilterTab === "active"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg text-ink-soft hover:text-ink"
                  }`}
                >
                  {isEn ? "Active Staff" : "الموظفون النشطون"} ({activeStaff.length})
                </button>
                <button
                  onClick={() => setStaffFilterTab("suspended")}
                  className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all ${
                    staffFilterTab === "suspended"
                      ? "bg-primary text-white shadow-sm"
                      : "bg-bg text-ink-soft hover:text-ink"
                  }`}
                >
                  {isEn ? "Suspended Staff" : "الموقوفون"} ({suspendedStaff.length})
                </button>
              </div>

              <div className="flex-1 min-w-[220px] max-w-md">
                <SearchBar
                  value={staffSearch}
                  onChange={setStaffSearch}
                  placeholder={isEn ? "Search staff by name, role, branch, phone..." : "ابحث باسم الموظف، الفرع، الهاتف، أو المسمى..."}
                />
              </div>
            </div>

            {/* Staff Cards List */}
            {staffLoading ? (
              <div className="p-12 text-center font-bold text-ink-soft bg-white rounded-3xl border border-mint-line">
                {isEn ? "Loading staff..." : "جاري تحميل قائمة الموظفين..."}
              </div>
            ) : displayedStaff.length === 0 ? (
              <div className="p-12 text-center font-bold text-ink-soft bg-white rounded-3xl border border-mint-line">
                {isEn ? "No staff records match your filter." : "لا يوجد موظفون مطابقون للبحث أو الفلتر."}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedStaff.map((emp: StaffRecord) => {
                  const active = isStaffActive(emp);
                  const isCurrentSelf = user && (String(user.id) === String(emp.id) || String(user.email).toLowerCase() === String(emp.email || "").toLowerCase());

                  return (
                    <div
                      key={emp.id}
                      className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary-pale text-primary font-black text-[16px] flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            String(emp.name || "ST")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .substring(0, 2)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-ink text-[15px]">{emp.name}</h4>
                            {isCurrentSelf && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black">
                                👤 {isEn ? "Current Account" : "حسابك الحالي"}
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                active ? "bg-emerald-50 text-emerald-700" : "bg-coral-pale text-coral"
                              }`}
                            >
                              {active ? (isEn ? "Active" : "نشط") : (isEn ? "Suspended" : "موقوف")}
                            </span>
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
                            {emp.salary ? (
                              <>
                                <span>•</span>
                                <span className="font-mono">₪{Number(emp.salary).toLocaleString("ar-EG-u-nu-latn")}</span>
                              </>
                            ) : null}
                          </div>
                          {(emp.phone || (emp.email && emp.email.includes("@"))) && (
                            <div className="text-[11px] text-ink-soft/80 flex items-center gap-2 mt-0.5 font-mono">
                              {emp.phone && <span dir="ltr">📞 {emp.phone}</span>}
                              {emp.phone && emp.email && emp.email.includes("@") && <span>•</span>}
                              {emp.email && emp.email.includes("@") && <span>✉️ {emp.email}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-mint-line/30">
                        <button
                          onClick={() => handleOpenEditStaff(emp)}
                          className="px-3 py-1.5 rounded-xl bg-bg hover:bg-mint-line text-ink font-bold text-[12px] transition-colors"
                        >
                          ✏️ {isEn ? "Edit" : "تعديل"}
                        </button>
                        {!isCurrentSelf && (
                          <>
                            <button
                              onClick={() => handleToggleStaffStatus(emp)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[12px] transition-colors ${
                                active
                                  ? "bg-amber-pale text-amber hover:bg-amber hover:text-white"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              {active ? (isEn ? "Suspend" : "إيقاف") : (isEn ? "Activate" : "تفعيل")}
                            </button>
                            <button
                              onClick={() => setStaffDeleteTarget(emp)}
                              className="px-3 py-1.5 rounded-xl bg-coral-pale hover:bg-coral hover:text-white text-coral font-bold text-[12px] transition-colors"
                            >
                              🗑 {isEn ? "Delete" : "حذف"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-mint-line animate-fade-in-up space-y-4 max-h-[90vh] overflow-y-auto">
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

              {staffFormError && (
                <div className="p-3 rounded-xl bg-coral-pale border border-coral/30 text-coral text-[12px] font-bold">
                  ⚠️ {staffFormError}
                </div>
              )}

              <div className="space-y-3">
                {/* Employee Photo / Avatar Picker */}
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-bg border border-mint-line/70">
                  <div className="w-14 h-14 rounded-2xl bg-primary-pale text-primary font-black text-[18px] flex items-center justify-center overflow-hidden shrink-0 border border-primary/20">
                    {staffFormData.avatar ? (
                      <img src={staffFormData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{staffFormData.name ? staffFormData.name[0]?.toUpperCase() : "👤"}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="block text-[12px] font-bold text-ink">
                      {isEn ? "Staff Profile Photo" : "صورة الموظف الشخصية"}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-black hover:bg-teal transition-colors shadow-sm shadow-primary/20">
                        <span>📷</span>
                        <span>{staffFormData.avatar ? (isEn ? "Change Photo" : "تغيير الصورة") : (isEn ? "Upload Photo" : "رفع صورة")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>
                      {Boolean(staffFormData.avatar) && (
                        <button
                          type="button"
                          onClick={() => setStaffFormData((prev) => ({ ...prev, avatar: "" }))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-coral-pale text-coral text-[11px] font-black hover:bg-coral/20 transition-colors"
                        >
                          <span>✕</span>
                          <span>{isEn ? "Remove" : "إزالة"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

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
                      {staffFormData.branch && !activeBranches.some(b => String(b.name || '').trim() === String(staffFormData.branch || '').trim()) && (
                        <option value={staffFormData.branch}>
                          {staffFormData.branch}
                        </option>
                      )}
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
                      value={staffFormData.role}
                      onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary"
                    >
                      {CANONICAL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {getRoleDisplayName(r, language)}
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
                    {isEn ? "Email" : "البريد الإلكتروني"}
                  </label>
                  <input
                    type="email"
                    value={staffFormData.email}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    placeholder="staff@example.com"
                    dir="ltr"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[13px] font-bold text-ink focus:outline-none focus:border-primary text-start"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-ink mb-1.5">
                    {isEn ? "Monthly Salary (ILS)" : "الراتب الشهري (شيكل)"}
                  </label>
                  <input
                    type="number"
                    value={staffFormData.salary || ""}
                    onChange={(e) => setStaffFormData({ ...staffFormData, salary: Number(e.target.value) || 0 })}
                    placeholder="0"
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
                    placeholder={editingStaffId ? (isEn ? "Leave empty to keep current" : "اتركه فارغاً للاحتفاظ بكلمة المرور الحالية") : (isEn ? "Password for login" : "كلمة المرور للدخول (6 خانات على الأقل)")}
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

        {/* Confirm Archive Branch Dialog */}
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

        {/* Confirm Delete Staff Dialog */}
        <ConfirmDialog
          isOpen={Boolean(staffDeleteTarget)}
          title={isEn ? "Delete Staff Member" : "تأكيد حذف الموظف"}
          message={
            staffDeleteTarget
              ? isEn
                ? `Are you sure you want to delete staff member "${staffDeleteTarget.name}"?`
                : `هل أنت متأكد من حذف الموظف "${staffDeleteTarget.name}" نهائياً من الصيدلية؟`
              : ""
          }
          confirmLabel={isEn ? "Delete Staff" : "حذف الموظف"}
          cancelLabel={isEn ? "Cancel" : "إلغاء"}
          tone="danger"
          loading={staffDeleteLoading}
          onConfirm={handleConfirmDeleteStaff}
          onClose={() => setStaffDeleteTarget(null)}
        />
      </main>
    </>
  );
}
