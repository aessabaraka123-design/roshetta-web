"use client";

import { useState } from "react";
import AppBar from "@/components/AppBar";
import toast from "react-hot-toast";

import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BranchesAndStaff() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
    else if (user.role !== "manager") {
      toast.error("ليس لديك الصلاحية للوصول إلى هذه الصفحة");
      router.push("/");
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<"branches" | "staff">("branches");

  // Modals state
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const [newBranch, setNewBranch] = useState({ name: "", manager: "" });
  const [newStaff, setNewStaff] = useState({
    name: "",
    branch: "",
    role: "صيدلي أول",
    phone: "",
    password: "123",
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: branchesData, mutate: mutateBranches } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const branches = branchesData?.branches || [];

  const { data: staffData, mutate: mutateStaff } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}/staff`
      : null,
    fetcher,
  );
  const staff = staffData?.staff || [];

  const handleAdd = () => {
    if (activeTab === "branches") {
      setShowAddBranchModal(true);
    } else {
      if (branches.length > 0 && !newStaff.branch) {
        setNewStaff({ ...newStaff, branch: branches[0].name });
      }
      setEditingStaffId(null);
      setNewStaff({
        name: "",
        branch: branches.length > 0 ? branches[0].name : "",
        role: "صيدلي أول",
        phone: "",
        password: "",
      });
      setShowAddStaffModal(true);
    }
  };

  const handleSaveBranch = async () => {
    if (!newBranch.name) return toast.error("أدخل اسم الفرع");

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/branches`,
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
        toast.success("تم إضافة الفرع بنجاح!");
        setShowAddBranchModal(false);
        setNewBranch({ name: "", manager: "" });
        mutateBranches();
      } else {
        toast.error(data.error || "فشل الإضافة");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStaff = async () => {
    if (!newStaff.name) return toast.error("أدخل اسم الموظف");

    setIsLoading(true);
    try {
      const url = editingStaffId
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${editingStaffId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff`;
      const res = await fetch(url, {
        method: editingStaffId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaff.name,
          email: newStaff.phone, // storing phone in email for now
          password: newStaff.password,
          role: newStaff.role,
          branch: newStaff.branch,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          editingStaffId ? "تم تعديل الموظف بنجاح!" : "تم إضافة الموظف بنجاح!",
        );
        setShowAddStaffModal(false);
        setEditingStaffId(null);
        setNewStaff({
          name: "",
          branch: branches.length > 0 ? branches[0].name : "",
          role: "صيدلي أول",
          phone: "",
          password: "",
        });
        mutateStaff();
      } else {
        toast.error(data.error || "فشل الحفظ");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStaff = (emp: any) => {
    setEditingStaffId(emp.id);
    setNewStaff({
      name: emp.name,
      branch: emp.branch || (branches.length > 0 ? branches[0].name : ""),
      role: emp.role || "صيدلي أول",
      phone: emp.email || "",
      password: emp.password || "",
    });
    setShowAddStaffModal(true);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user?.pharmacy_id}/staff/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        toast.success("تم حذف الموظف");
        mutateStaff();
      } else {
        toast.error("فشل الحذف");
      }
    } catch (e) {
      toast.error("خطأ في الاتصال");
    }
  };

  return (
    <>
      <AppBar title="الفروع والموظفين" backHref="/more" />
      <main className="max-w-4xl mx-auto p-4 pb-24 mt-4 relative">
        <div className="flex bg-mint-line/30 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("branches")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "branches" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            إدارة الفروع
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "staff" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            الموظفين
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
              إضافة فرع جديد
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
                      العنوان/المدير: {branch.addr || "غير محدد"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[20px] font-black text-ink">
                      {bStaff.length}
                    </div>
                    <div className="text-[11px] text-ink-soft">موظفين</div>
                  </div>
                </div>
              );
            })}
            {branches.length === 0 && (
              <div className="text-center py-10 text-ink-soft text-[15px]">
                لا يوجد فروع مسجلة
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
              إضافة موظف جديد
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
                    <span className="text-primary">{emp.role}</span> •{" "}
                    <span>{emp.branch}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditStaff(emp)}
                    className="text-ink-soft hover:text-teal font-bold text-[12px] bg-bg px-4 py-1.5 rounded-full transition-colors"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(emp.id)}
                    className="text-ink-soft hover:text-coral font-bold text-[12px] bg-bg px-4 py-1.5 rounded-full transition-colors"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center py-10 text-ink-soft text-[15px]">
                لا يوجد موظفين مسجلين
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
                  إضافة فرع جديد
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
                    اسم الفرع
                  </label>
                  <input
                    type="text"
                    value={newBranch.name}
                    onChange={(e) =>
                      setNewBranch({ ...newBranch, name: e.target.value })
                    }
                    placeholder="مثال: فرع تل الهوى"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    العنوان أو المدير
                  </label>
                  <input
                    type="text"
                    value={newBranch.manager}
                    onChange={(e) =>
                      setNewBranch({ ...newBranch, manager: e.target.value })
                    }
                    placeholder="اسم المدير المسؤول أو العنوان"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleSaveBranch}
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all mt-4 disabled:opacity-50"
                >
                  {isLoading ? "جاري الحفظ..." : "حفظ وإضافة"}
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
                  {editingStaffId ? "تعديل بيانات الموظف" : "إضافة موظف جديد"}
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
                    اسم الموظف
                  </label>
                  <input
                    type="text"
                    value={newStaff.name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, name: e.target.value })
                    }
                    placeholder="الاسم الرباعي"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      الفرع
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
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      الدور / الوظيفة
                    </label>
                    <select
                      value={newStaff.role}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, role: e.target.value })
                      }
                      className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
                    >
                      <option>صيدلي أول</option>
                      <option>كاشير</option>
                      <option>صيدلي متدرب</option>
                      <option>مدير فرع</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    رقم الجوال (اسم المستخدم للدخول)
                  </label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, phone: e.target.value })
                    }
                    placeholder="05X XXX XXXX"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-ink mb-2">
                    كلمة المرور
                  </label>
                  <input
                    type="text"
                    value={newStaff.password}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, password: e.target.value })
                    }
                    placeholder="كلمة المرور المبدئية للموظف"
                    className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-left"
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
                      صلاحية بيع أدوية المراقبة (المخدرة)
                    </label>
                    <span className="text-[11px] text-ink-soft">يسمح للموظف بإضافة هذه الأدوية للفاتورة</span>
                  </div>
                </div>

                <button
                  onClick={handleSaveStaff}
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-all mt-4 disabled:opacity-50"
                >
                  {isLoading
                    ? "جاري الحفظ..."
                    : editingStaffId
                      ? "حفظ التعديلات"
                      : "إضافة الموظف"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
