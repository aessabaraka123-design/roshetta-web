"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/store";
import toast from "react-hot-toast";
import RoshettaLogo from "./RoshettaLogo";
import {
  HomeIcon,
  InventoryIcon,
  POSIcon,
  MoreIcon,
  LogoMark,
  AdminIcon,
  SalesIcon,
  ReturnsIcon,
  PrescriptionIcon,
  CustomersIcon,
  BoxIcon,
  ReportsIcon,
  ManagerIcon,
} from "./icons";

const navGroups = [
  {
    title: "",
    items: [{ name: "لوحة التحكم", href: "/", icon: HomeIcon }],
  },
  {
    title: "المبيعات ونقاط البيع",
    items: [
      { name: "نقطة البيع (POS)", href: "/pos", icon: POSIcon },
      { name: "المبيعات والفواتير", href: "/sales", icon: SalesIcon },
      {
        name: "الوصفات الطبية",
        href: "/prescriptions",
        icon: PrescriptionIcon,
      },
      { name: "العملاء والمرضى", href: "/customers", icon: CustomersIcon },
    ],
  },
  {
    title: "المخزون والمشتريات",
    items: [
      { name: "المخزون والأدوية", href: "/inventory", icon: InventoryIcon },
      { name: "إدارة الموردين", href: "/suppliers", icon: CustomersIcon },
      { name: "فواتير المشتريات", href: "/purchases", icon: BoxIcon },
      { name: "دفعات الصلاحيات", href: "/batches", icon: BoxIcon },
      { name: "المرتجعات", href: "/returns", icon: ReturnsIcon },
    ],
  },
  {
    title: "المالية والإدارة",
    items: [
      { name: "المصروفات اليومية", href: "/expenses", icon: ReportsIcon },
      { name: "الورديات والصندوق", href: "/shifts", icon: POSIcon },
      { name: "التقارير", href: "/reports", icon: ReportsIcon },
    ],
  },
  {
    title: "الإدارة والإعدادات",
    items: [
      { name: "إدارة الفرع", href: "/manager", icon: ManagerIcon },
      { name: "الإدارة المركزية", href: "/admin", icon: AdminIcon },
      { name: "الإعدادات", href: "/more", icon: MoreIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  // By default, open all groups, or specific ones
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
  });

  const toggleGroup = (index: number) => {
    setOpenGroups((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج بنجاح");
    router.push("/login");
  };

  if (
    pathname === "/login" ||
    pathname === "/pricing" ||
    pathname === "/register" ||
    pathname === "/receipt-upload"
  )
    return null;

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 shrink-0 bg-white shadow-xl shadow-teal/5 z-20 print:hidden">
      <div className="flex items-center gap-3 p-4 border-b border-mint-line text-primary">
        <RoshettaLogo showText={true} />
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto no-scrollbar">
        {navGroups
          .map((group) => {
            const isManager =
              user?.role === "manager" ||
              user?.role === "مدير فرع" ||
              user?.role === "admin" ||
              user?.role === "owner";
            let items = [...group.items];

            if (!isManager) {
              if (group.title === "المخزون والمشتريات") {
                items = items.filter(
                  (i) =>
                    i.name === "المخزون والأدوية" ||
                    i.name === "المرتجعات" ||
                    i.name === "دفعات الصلاحيات",
                );
              }
              if (group.title === "المالية والإدارة") {
                items = items.filter((i) => i.name === "الورديات والصندوق");
              }
              if (group.title === "الإدارة والإعدادات") {
                return null;
              }
            }

            return { ...group, items };
          })
          .filter(Boolean)
          .map((group: any, idx) => (
            <div key={idx} className="space-y-1">
              {group.title && (
                <button
                  onClick={() => toggleGroup(idx)}
                  className="w-full flex items-center justify-between px-3 py-2 text-ink-soft hover:text-primary hover:bg-bg rounded-lg transition-colors group"
                >
                  <span className="text-[14px] font-bold text-ink-soft group-hover:text-primary transition-colors">
                    {group.title}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${openGroups[idx] ? "rotate-180 text-primary" : "rotate-0"}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              )}

              <div
                className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${group.title && !openGroups[idx] ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`}
              >
                {group.items
                  .filter((item: any) => {
                    if (
                      user?.role === "مدير فرع" &&
                      ["/branches", "/admin", "/more"].includes(item.href)
                    )
                      return false;
                    return true;
                  })
                  .map((item: any) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive
                            ? "bg-teal-pale text-teal font-bold shadow-sm"
                            : "text-ink-soft hover:bg-teal-pale/40 hover:text-teal font-semibold"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "stroke-teal" : "stroke-ink-soft group-hover:stroke-teal"}`}
                        />
                        <span className="text-[15px]">{item.name}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </nav>

      <div className="p-4 border-t border-mint-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-pale text-teal w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0">
              {(user?.managerName || user?.managerName || "م").slice(0, 2)}
            </div>
            <div>
              <div className="text-[15px] font-bold text-ink line-clamp-1 max-w-[120px]">
                {user?.managerName || user?.managerName || "مستخدم"}
              </div>
              <div className="text-[13px] text-ink-soft mt-0.5">
                {user?.role || "موظف"}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="تسجيل خروج"
            className="p-2 text-red-500/70 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
