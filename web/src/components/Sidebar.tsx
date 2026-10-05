"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/store";
import toast from "react-hot-toast";
import RoshettaLogo from "./RoshettaLogo";
import { useTranslation } from "@/i18n";
import {
  HomeIcon,
  InventoryIcon,
  POSIcon,
  MoreIcon,
  AdminIcon,
  SalesIcon,
  ReturnsIcon,
  BoxIcon,
  CustomersIcon,
  ReportsIcon,
  ManagerIcon,
} from "./icons";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const language = useStore((state: any) => state.language);
  const setLanguage = useStore((state: any) => state.setLanguage);
  
  const { t } = useTranslation();

  const navGroups = [
    {
      title: t.sidebar.dashboard,
      items: [
        { name: t.sidebar.dashboard, href: "/", icon: HomeIcon },
        { name: t.sidebar.pos, href: "/pos", icon: POSIcon },
        { name: t.sidebar.sales_invoices, href: "/sales", icon: SalesIcon },
        { name: t.sidebar.prescriptions, href: "/prescriptions", icon: ReportsIcon },
        { name: t.sidebar.customers_patients, href: "/customers", icon: ManagerIcon },
      ],
    },
    {
      title: t.sidebar.inventory_meds,
      items: [
        { name: t.sidebar.inventory_meds, href: "/inventory", icon: InventoryIcon },
        { name: t.sidebar.suppliers_management, href: "/suppliers", icon: CustomersIcon },
        { name: t.sidebar.purchase_invoices, href: "/purchases", icon: SalesIcon },
        { name: t.sidebar.batches_expiry, href: "/batches", icon: BoxIcon },
        { name: t.sidebar.returns, href: "/returns", icon: ReturnsIcon },
      ],
    },
    {
      title: t.sidebar.reports,
      items: [
        { name: t.sidebar.expenses, href: "/expenses", icon: ReportsIcon },
        { name: t.sidebar.shifts, href: "/shifts", icon: POSIcon },
        { name: t.sidebar.reports, href: "/reports", icon: ReportsIcon },
      ],
    },
    {
      title: t.sidebar.security_backup,
      items: [
        { name: t.sidebar.staff_branches, href: "/manager", icon: ManagerIcon },
        { name: t.sidebar.security_backup, href: "/admin", icon: AdminIcon },
        { name: t.sidebar.print_settings, href: "/more", icon: MoreIcon },
      ],
    },
  ];

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
    toast.success(t.sidebar.logout);
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
              user?.role === "admin" ||
              user?.role === "owner" ||
              user?.role === "صيدلي أول";
            let items = [...group.items];

            if (!isManager) {
              if (group.title === t.sidebar.inventory_meds) {
                items = items.filter(
                  (i) =>
                    i.name === t.sidebar.inventory_meds ||
                    i.name === t.sidebar.returns ||
                    i.name === t.sidebar.batches_expiry,
                );
              }
              if (group.title === t.sidebar.reports) {
                items = items.filter((i) => i.name === t.sidebar.shifts);
              }
              if (group.title === t.sidebar.security_backup) {
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
                      user?.role === "صيدلي أول" &&
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

      {/* Language Switcher */}
      <div className="p-3 border-t border-mint-line/50">
        <div className="flex items-center gap-2 bg-bg p-1 rounded-xl">
          <button
            onClick={() => setLanguage("ar")}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${language !== "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft hover:text-ink"}`}
          >
            {t.sidebar.arabic}
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-colors ${language === "en" ? "bg-white shadow-sm text-teal" : "text-ink-soft hover:text-ink"}`}
          >
            {t.sidebar.english}
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-mint-line">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-pale text-teal w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0">
              {(user?.managerName || user?.username || "?").slice(0, 2)}
            </div>
            <div>
              <div className="text-[15px] font-bold text-ink line-clamp-1 max-w-[120px]">
                {user?.managerName || user?.username || "Guest"}
              </div>
              <div className="text-[13px] text-ink-soft mt-0.5 capitalize">
                {user?.role === "manager" ? t.sidebar.manager : (user?.role || t.sidebar.employee)}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title={t.sidebar.logout}
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
