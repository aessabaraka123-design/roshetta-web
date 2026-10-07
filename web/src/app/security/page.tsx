"use client";

import AppBar from "@/components/AppBar";
import { useState } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/store";

export default function SecurityPage() {
  const language = useStore((state: any) => state.language);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(language === "en" ? "Please fill in all fields" : "يرجى تعبئة كافة الحقول");
      return;
    }
    if (newPassword.length < 6) {
      toast.error(language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }
    if (!/(?=.*[a-zA-Z\u0600-\u06FF])(?=.*\d)(?=.*[^a-zA-Z\u0600-\u06FF\d\s])/.test(newPassword)) {
      toast.error(language === "en" ? "Password must contain letters, numbers, and symbols" : "يجب أن تحتوي كلمة المرور على أحرف، وأرقام، ورموز");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === "en" ? "New passwords do not match" : "كلمة المرور الجديدة غير متطابقة");
      return;
    }
    toast.success(language === "en" ? "Password changed successfully" : "تم تغيير كلمة المرور بنجاح");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const [permissions, setPermissions] = useState([
    { id: 1, label: language === "en" ? "Allow cashier to return sold medicines" : "السماح للكاشير بإرجاع الأدوية المباعة", active: false },
    { id: 2, label: language === "en" ? "Allow pharmacists to modify medicine prices" : "السماح للصيادلة بتعديل أسعار الأدوية", active: false },
    { id: 3, label: language === "en" ? "View profits and costs for branch managers" : "عرض الأرباح والتكاليف لمدراء الفروع", active: true },
    { id: 4, label: language === "en" ? "Alert owner on every invoice deletion" : "تنبيه المالك عند كل عملية حذف فاتورة", active: true },
  ]);

  const togglePermission = (id: number) => {
    setPermissions(
      permissions.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  return (
    <>
      <AppBar title={language === "en" ? "Permissions & Security" : "الصلاحيات والأمان"} backHref="/more" />
      <main className="max-w-4xl mx-auto p-4 pb-24 space-y-6 mt-4">
        {/* Change Password Section */}
        <section>
          <h3 className="text-[16px] font-black text-primary mb-3">
            {language === "en" ? "Change Your Password" : "تغيير كلمة المرور الخاصة بك"}
          </h3>
          <div className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-[13px] font-bold text-ink mb-1.5">
                {language === "en" ? "Current Password" : "كلمة المرور الحالية"}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-ink mb-1.5">
                {language === "en" ? "New Password" : "كلمة المرور الجديدة"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-ink mb-1.5">
                {language === "en" ? "Confirm New Password" : "تأكيد كلمة المرور الجديدة"}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary text-start"
                dir="ltr"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-2 shadow-md shadow-primary/20 hover:bg-teal transition-colors"
            >
              {language === "en" ? "Save Password" : "حفظ كلمة المرور"}
            </button>
          </div>
        </section>

        {/* Global Permissions Section */}
        <section>
          <h3 className="text-[16px] font-black text-primary mb-3">
            {language === "en" ? "General Employee Permissions" : "الصلاحيات العامة للموظفين"}
          </h3>
          <div className="bg-white border border-mint-line rounded-2xl p-1 shadow-sm">
            {permissions.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 ${i !== permissions.length - 1 ? "border-b border-mint-line" : ""}`}
              >
                <div className="text-[14px] font-bold text-ink flex-1 pr-2">
                  {p.label}
                </div>
                <div
                  onClick={() => togglePermission(p.id)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${p.active ? "bg-primary" : "bg-mint-line"} relative`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-all absolute top-1 ${p.active ? "left-1" : "left-7"}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-ink-soft font-semibold text-center mt-3">
            {language === "en" ? "These permissions are applied to all pharmacy branches immediately." : "يتم تطبيق هذه الصلاحيات على جميع فروع الصيدلية فوراً."}
          </p>
        </section>
      </main>
    </>
  );
}
