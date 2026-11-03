"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import AppBar from "@/components/AppBar";
import toast from "react-hot-toast";

import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import {
  DEFAULT_STAFF_ROLES,
  getRoleDisplayName,
  normalizeRoleForBackend,
  StaffRoleItem,
} from "@/data/roles";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BranchesAndStaff() {
  const user = useStore((state: any) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
    else if (user.role !== "manager") {
      toast.error(language === 'en' ? 'You do not have permission to access this page' : "ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router, language]);

  const [activeTab, setActiveTab] = useState<"branches" | "staff">("branches");

  // Modals state
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const [newBranch, setNewBranch] = useState({ name: "", manager: "" });
  const [newStaff, setNewStaff] = useState({
    name: "",
    branch: "",
    role: "pharmacist",
    phone: "",
    password: "123",
    controlledMedsAccess: false,
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Custom roles management from pharmacy data
  const [customRoles, setCustomRoles] = useState<StaffRoleItem[]>([]);
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [newCustomRoleName, setNewCustomRoleName] = useState("");

  const { data: branchesData, mutate: mutateBranches } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const branches = branchesData?.branches || [];

  const { data: staffData, mutate: mutateStaff } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/staff`
      : null,
    fetcher,
  );
  const staff = staffData?.staff || [];

  // Load pharmacy-custom roles from local persistence
  useEffect(() => {
    if (typeof window !== "undefined" && user?.pharmacy_id) {
      try {
        const saved = localStorage.getItem(`roshetta_roles_${user.pharmacy_id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setCustomRoles(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load custom roles:", e);
      }
    }
  }, [user?.pharmacy_id]);

  // Dynamically assemble available roles from:
  // 1. System default roles dataset
  // 2. Roles returned from server API (staffData.roles)
  // 3. Custom roles created by the pharmacy
  // 4. Any existing roles present in staff database records
  const availableRoles = useMemo<StaffRoleItem[]>(() => {
    const list: StaffRoleItem[] = [...DEFAULT_STAFF_ROLES];
    const seen = new Set(list.map((r) => r.id.toLowerCase()));

    // 1. Roles from server API
    if (Array.isArray(staffData?.roles)) {
      for (const r of staffData.roles) {
        const id = typeof r === "string" ? r : r.id;
        if (id && !seen.has(id.toLowerCase())) {
          seen.add(id.toLowerCase());
          list.push(
            typeof r === "string"
              ? {
                  id,
                  name_ar: getRoleDisplayName(id, "ar"),
                  name_en: getRoleDisplayName(id, "en"),
                }
              : r
          );
        }
      }
    }

    // 2. Pharmacy custom roles
    for (const r of customRoles) {
      if (r?.id && !seen.has(r.id.toLowerCase())) {
        seen.add(r.id.toLowerCase());
        list.push(r);
      }
    }

    // 3. Any distinct role already in existing staff records
    if (Array.isArray(staff)) {
      for (const s of staff) {
        const sRole = String(s.role || "").trim();
        if (sRole && !seen.has(sRole.toLowerCase())) {
          seen.add(sRole.toLowerCase());
          list.push({
            id: sRole,
            name_ar: getRoleDisplayName(sRole, "ar"),
            name_en: getRoleDisplayName(sRole, "en"),
          });
        }
      }
    }

    return list;
  }, [staffData?.roles, customRoles, staff]);

  // Match any role alias / localized string to an available role ID
  const resolveRoleId = (roleStr?: string): string => {
    if (!roleStr) return availableRoles[0]?.id || "pharmacist";
    const r = String(roleStr).trim();
    const lower = r.toLowerCase();
    const match = availableRoles.find(
      (item) =>
        item.id.toLowerCase() === lower ||
        item.name_ar === r ||
        item.name_en.toLowerCase() === lower
    );
    if (match) return match.id;
    return r;
  };

  const handleAddCustomRole = () => {
    const trimmed = newCustomRoleName.trim();
    if (!trimmed) {
      toast.error(language === 'en' ? 'Enter role title' : "يرجى كتابة المسمى الوظيفي");
      return;
    }
    const exists = availableRoles.some(
      (r) => r.id.toLowerCase() === trimmed.toLowerCase() || r.name_ar === trimmed
    );
    if (!exists) {
      const newItem: StaffRoleItem = {
        id: trimmed,
        name_ar: trimmed,
        name_en: trimmed,
      };
      const updated = [...customRoles, newItem];
      setCustomRoles(updated);
      if (typeof window !== "undefined" && user?.pharmacy_id) {
        try {
          localStorage.setItem(`roshetta_roles_${user.pharmacy_id}`, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setNewStaff((prev) => ({ ...prev, role: trimmed }));
    setNewCustomRoleName("");
    setShowCustomRoleInput(false);
    toast.success(language === 'en' ? 'New role added!' : "تمت إضافة المسمى الوظيفي بنجاح!");
  };

  const handleAdd = () => {
    if (activeTab === "branches") {
      setShowAddBranchModal(true);
    } else {
      setShowCustomRoleInput(false);
      setEditingStaffId(null);
      setNewStaff({
        name: "",
        branch: branches.length > 0 ? branches[0].name : "",
        role: availableRoles[0]?.id || "pharmacist",
        phone: "",
        password: "",
        controlledMedsAccess: false,
      });
      setShowAddStaffModal(true);
    }
  };

  const handleSaveBranch = async () => {
    if (!newBranch.name) return toast.error(language === 'en' ? 'Enter branch name' : "أدخل اسم الفرع");

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/branches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newBranch.name,
            addr: newBranch.manager,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(language === 'en' ? 'Branch added successfully!' : "تم إضافة الفرع بنجاح!");
        setShowAddBranchModal(false);
        setNewBranch({ name: "", manager: "" });
        mutateBranches();
      } else {
        toast.error(data.error || (language === 'en' ? 'Add failed' : "فشل الإضافة"));
      }
    } catch (e) {
      toast.error(language === 'en' ? 'Connection error' : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStaff = async () => {
    if (!newStaff.name) return toast.error(language === 'en' ? 'Enter staff name' : "أدخل اسم الموظف");

    setIsLoading(true);
    try {
      const url = editingStaffId
        ? `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${editingStaffId}`
        : `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff`;

      const payloadRole = normalizeRoleForBackend(newStaff.role);

      const res = await fetch(url, {
        method: editingStaffId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaff.name,
          email: (newStaff.phone || "").trim().toLowerCase(),
          phone: (newStaff.phone || "").trim(),
          password: newStaff.password,
          role: payloadRole,
          branch: newStaff.branch,
          controlledMedsAccess: newStaff.controlledMedsAccess ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          editingStaffId ? (language === 'en' ? 'Staff edited successfully!' : "تم تعديل الموظف بنجاح!") : (language === 'en' ? 'Staff added successfully!' : "تم إضافة الموظف بنجاح!"),
        );
        setShowAddStaffModal(false);
        setEditingStaffId(null);
        setNewStaff({
          name: "",
          branch: branches.length > 0 ? branches[0].name : "",
          role: availableRoles[0]?.id || "pharmacist",
          phone: "",
          password: "",
          controlledMedsAccess: false,
        });
        mutateStaff();
      } else {
        toast.error(data.error || (language === 'en' ? 'Save failed' : "فشل الحفظ"));
      }
    } catch (e) {
      toast.error(language === 'en' ? 'Connection error' : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaff = (emp: any) => {
    setShowCustomRoleInput(false);
    setEditingStaffId(emp.id);
    setNewStaff({
      name: emp.name || "",
      branch: emp.branch || (branches.length > 0 ? branches[0].name : ""),
      role: resolveRoleId(emp.role),
      phone: emp.phone || emp.email || "",
      password: emp.password || "",
      controlledMedsAccess: Boolean(emp.controlledMedsAccess),
    });
    setShowAddStaffModal(true);
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        toast.success(language === 'en' ? 'Staff deleted' : "تم حذف الموظف");
        mutateStaff();
      } else {
        toast.error(language === 'en' ? 'Delete failed' : "فشل الحذف");
      }
    } catch (e) {
      toast.error(language === 'en' ? 'Connection error' : "خطأ في الاتصال");
    }
  };

  const executeDeleteStaff = handleDeleteStaff;

  return (
    <>
      <AppBar title={language === 'en' ? 'Branches and Staff' : "الفروع والموظفين"} backHref="/more" />
      <main className="max-w-4xl mx-auto p-4 pb-24 mt-4 relative">
        <div className="flex bg-mint-line/30 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("branches")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "branches" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {language === 'en' ? 'Branch Management' : "إدارة الفروع"}
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "staff" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {language === 'en' ? 'Staff' : "الموظفين"}
          </button>
        </div>

        {activeTab === "branches" ? (
          <div className="space-y-4">
            <button
              onClick={handleAdd}
              className="w-full bg-primary-pale text-primary border border-primary/20 font-bold py-3 rounded-xl mb-2 flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {language === 'en' ? 'Add New Branch' : "إضافة فرع جديد"}
            </button>

            {branches.map((branch: any) => {
              const bStaff = staff.filter((s: any) => s.branch === branch.name);
              return (
                <div
                  key={branch.id}
                  className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-bold text-primary text-[16px] mb-1 flex items-center gap-2">
                      {branch.name}
                      <span
                        className={`w-2 h-2 rounded-full ${branch.status === "نشط" ? "bg-teal" : "bg-coral"}`}
                      ></span>
                    </h3>
                    <div className="text-[13px] text-ink-soft font-semibold">
                      {language === 'en' ? 'Address/Manager: ' : "العنوان/المدير: "}{branch.addr || (language === 'en' ? 'Not specified' : "غير محدد")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[20px] font-black text-ink">
                      {bStaff.length}
                    </div>
                    <div className="text-[11px] text-ink-soft">{language === 'en' ? 'Staff' : "موظفين"}</div>
                  </div>
                </div>
              );
            })}
            {branches.length === 0 && (
              <div className="text-center py-10 text-ink-soft text-[15px]">
                {language === 'en' ? 'No branches registered' : "لا يوجد فروع مسجلة"}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={handleAdd}
              className="w-full bg-primary-pale text-primary border border-primary/20 font-bold py-3 rounded-xl mb-2 flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              {language === 'en' ? 'Add New Staff' : "إضافة موظف جديد"}
            </button>

            {staff.map((emp: any) => (
              <div
                key={emp.id}
                className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-primary font-bold text-[18px]">
                  {emp.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-ink text-[15px]">{emp.name}</h3>
                  <div className="text-[13px] text-ink-soft font-semibold flex items-center gap-2 mt-0.5">
                    <span className="text-primary font-bold">
                      {getRoleDisplayName(emp.role, language)}
                    </span> •{" "}
                    <span>{emp.branch}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditStaff(emp)}
                    className="text-ink-soft hover:text-teal font-bold text-[12px] bg-bg px-4 py-1.5 rounded-full transition-colors"
                  >
                    {language === 'en' ? 'Edit' : "تعديل"}
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(emp.id)}
                    className="text-ink-soft hover:text-coral font-bold text-[12px] bg-bg px-4 py-1.5 rounded-full transition-colors"
                  >
                    {language === 'en' ? 'Delete' : "حذف"}
                  </button>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center py-10 text-ink-soft text-[15px]">
                {language === 'en' ? 'No staff registered' : "لا يوجد موظفين مسجلين"}
              </div>
            )}
          </div>
        )}

        {/* Add Branch Modal */}
        {showAddBranchModal && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[20px] font-black text-primary">
                  {language === 'en' ? 'Add New Branch' : "إضافة فرع جديد"}
                </h3>
                <button
                  onClick={() => setShowAddBranchModal(false)}
                  className="text-ink-soft hover:text-coral transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === 'en' ? 'Branch Name' : "اسم الفرع"}
                  </label>
                  <input
                    type="text"
                    value={newBranch.name}
                    onChange={(e) =>
                      setNewBranch({ ...newBranch, name: e.target.value })
                    }
                    placeholder={language === 'en' ? 'Example: Tal Al-Hawa Branch' : "مثال: فرع تل الهوى"}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === 'en' ? 'Address or Manager' : "العنوان أو المدير"}
                  </label>
                  <input
                    type="text"
                    value={newBranch.manager}
                    onChange={(e) =>
                      setNewBranch({ ...newBranch, manager: e.target.value })
                    }
                    placeholder={language === 'en' ? 'Responsible Manager Name or Address' : "اسم المدير المسؤول أو العنوان"}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleSaveBranch}
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all mt-4 disabled:opacity-50"
                >
                  {isLoading ? (language === 'en' ? 'Saving...' : "جاري الحفظ...") : (language === 'en' ? 'Save and Add' : "حفظ وإضافة")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Staff Modal */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[20px] font-black text-primary">
                  {editingStaffId ? (language === 'en' ? 'Edit Staff Details' : "تعديل بيانات الموظف") : (language === 'en' ? 'Add New Staff' : "إضافة موظف جديد")}
                </h3>
                <button
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-ink-soft hover:text-coral transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === 'en' ? 'Staff Name' : "اسم الموظف"}
                  </label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    placeholder={language === 'en' ? 'Full Name' : "الاسم الرباعي"}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      {language === 'en' ? 'Branch' : "الفرع"}
                    </label>
                    <select
                      value={newStaff.branch}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, branch: e.target.value })
                      }
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    >
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[14px] font-bold text-ink">
                        {language === 'en' ? 'Role / Job' : "الدور / الوظيفة"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomRoleInput(!showCustomRoleInput)}
                        className="text-[12px] text-teal font-bold hover:underline"
                      >
                        {showCustomRoleInput
                          ? (language === 'en' ? 'Select from list' : 'اختر من القائمة')
                          : (language === 'en' ? '+ Custom Role' : '+ مسمى جديد')}
                      </button>
                    </div>

                    {showCustomRoleInput ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCustomRoleName}
                          onChange={(e) => setNewCustomRoleName(e.target.value)}
                          placeholder={language === 'en' ? 'Enter role title' : "اكتب المسمى الوظيفي"}
                          className="flex-1 bg-bg border border-mint-line rounded-xl p-3 text-[14px] focus:outline-none focus:border-primary"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomRole();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomRole}
                          className="bg-primary text-white text-[13px] font-bold px-3 py-2 rounded-xl hover:bg-teal transition-colors"
                        >
                          {language === 'en' ? 'Add' : "إضافة"}
                        </button>
                      </div>
                    ) : (
                      <select
                        value={resolveRoleId(newStaff.role)}
                        onChange={(e) => {
                          if (e.target.value === "__add_new__") {
                            setShowCustomRoleInput(true);
                          } else {
                            setNewStaff({ ...newStaff, role: e.target.value });
                          }
                        }}
                        className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary font-medium"
                      >
                        {availableRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {language === 'en' ? r.name_en : r.name_ar}
                          </option>
                        ))}
                        <option value="__add_new__" className="text-teal font-bold">
                          {language === 'en' ? '+ Add New Job Title...' : '+ إضافة مسمى وظيفي جديد...'}
                        </option>
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === 'en' ? 'Mobile Number (Login Username)' : "رقم الجوال (اسم المستخدم للدخول)"}
                  </label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                    placeholder="05X XXX XXXX"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    {language === 'en' ? 'Password' : "كلمة المرور"}
                  </label>
                  <input
                    type="text"
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    placeholder={language === 'en' ? 'Initial Staff Password' : "كلمة المرور المبدئية للموظف"}
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                    dir="ltr"
                  />
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    checked={newStaff.controlledMedsAccess}
                    onChange={(e) => setNewStaff({ ...newStaff, controlledMedsAccess: e.target.checked })}
                    className="w-5 h-5 accent-teal cursor-pointer"
                  />
                  <div>
                    <label className="block text-[14px] font-bold text-teal">
                      {language === 'en' ? 'Controlled Meds Selling Authority' : "صلاحية بيع أدوية المراقبة (المخدرة)"}
                    </label>
                    <span className="text-[11px] text-ink-soft">{language === 'en' ? 'Allows staff to add these meds to invoice' : "يسمح للموظف بإضافة هذه الأدوية للفاتورة"}</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveStaff}
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all mt-4 disabled:opacity-50"
                >
                  {isLoading
                    ? (language === 'en' ? 'Saving...' : "جاري الحفظ...")
                    : editingStaffId
                      ? (language === 'en' ? 'Save Changes' : "حفظ التعديلات")
                      : (language === 'en' ? 'Add Staff' : "إضافة الموظف")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
