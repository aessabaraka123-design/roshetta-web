"use client";

import { API_BASE_URL } from "@/lib/config";
import { useState, useRef, useMemo, useEffect } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { getWebAuthHeaders } from "@/lib/customers/transport";
import {
  Prescription,
  PrescriptionStatus,
  PRESCRIPTION_STATUSES,
  DOSAGE_FREQUENCIES,
  MEDICATION_FORMS,
  validatePrescription,
  isPrescriptionExpired,
  canDispenseRefill,
  checkDrugAllergyWarnings,
  PrescriptionsKPIs,
} from "@/lib/prescriptions/domain";

const fetcher = (url: string) => fetch(url, { headers: getWebAuthHeaders() }).then((res) => res.json());

export default function Prescriptions() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const branches = useStore((state: any) => state.branches || []);
  const router = useRouter();
  const isEn = language === "en";

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [viewAttachmentUrl, setViewAttachmentUrl] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isDirectDispenseModalOpen, setIsDirectDispenseModalOpen] = useState(false);
  const [dispenseNotes, setDispenseNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Data fetching
  const { data, mutate } = useSWR(
    user ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/prescriptions` : null,
    fetcher
  );
  const rawPrescriptions: any[] = data?.prescriptions || [];
  const serverKPIs: PrescriptionsKPIs | null = data?.kpis || null;

  const { data: inventoryData } = useSWR(
    user ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory` : null,
    fetcher
  );
  const meds = (inventoryData?.inventory || []).filter((m: any) => !m.archived_at);

  const { data: customersData } = useSWR(
    user ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/customers` : null,
    fetcher
  );
  const customers = customersData?.customers || [];

  // New Prescription Form State
  const defaultNewItem = {
    name: "",
    active_ingredient: "",
    form: "tablets",
    dosage: "",
    frequency: "bid",
    duration: "7_days",
    instructions: "",
    qty: 1,
    unit: "pack",
  };

  const [newPrescription, setNewPrescription] = useState({
    patient: "",
    patient_id: "",
    patient_phone: "",
    patient_age: "",
    patient_gender: "male",
    patient_allergies: [] as string[],
    allergiesInput: "",
    doctor: "",
    doctor_license: "",
    doctor_specialty: "",
    doctor_phone: "",
    clinic_name: "",
    branch_id: user?.branch_id || "",
    branch_name: user?.branchName || "الفرع الرئيسي",
    date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    diagnosis: "",
    notes: "",
    attachment_url: "",
    total_refills: 0,
    refill_interval_days: 0,
    items: [{ ...defaultNewItem }],
  });

  const [activeMedIdx, setActiveMedIdx] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Real-time clinical allergy alerts in the creation modal
  const creationAllergyWarnings = useMemo(() => {
    return checkDrugAllergyWarnings(newPrescription.patient_allergies, newPrescription.items);
  }, [newPrescription.patient_allergies, newPrescription.items]);

  // Filtered Prescriptions
  const filteredPrescriptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawPrescriptions.filter((prx: any) => {
      if (q) {
        const idMatch = String(prx.id || "").toLowerCase().includes(q);
        const patMatch = String(prx.patient || prx.patient_name || "").toLowerCase().includes(q);
        const docMatch = String(prx.doctor || prx.doctor_name || "").toLowerCase().includes(q);
        const phoneMatch = String(prx.patient_phone || "").toLowerCase().includes(q);
        if (!idMatch && !patMatch && !docMatch && !phoneMatch) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === "expired") {
          if (!isPrescriptionExpired(prx)) return false;
        } else if (prx.status !== statusFilter) {
          return false;
        }
      }
      if (branchFilter !== "all") {
        const bId = String(prx.branch_id || prx.branchId || "");
        if (bId && bId !== branchFilter) return false;
      }
      return true;
    });
  }, [rawPrescriptions, search, statusFilter, branchFilter]);

  // Patient auto-selection
  const handleSelectCustomer = (customerId: string) => {
    const cust = customers.find((c: any) => c.id === customerId);
    if (cust) {
      const parsedAllergies = Array.isArray(cust.allergies)
        ? cust.allergies
        : (typeof cust.allergies === "string" ? cust.allergies.split(",").map((s: string) => s.trim()).filter(Boolean) : []);

      setNewPrescription((prev) => ({
        ...prev,
        patient_id: cust.id,
        patient: cust.name || prev.patient,
        patient_phone: cust.phone || prev.patient_phone,
        patient_age: cust.age || prev.patient_age,
        patient_gender: cust.gender || prev.patient_gender,
        patient_allergies: parsedAllergies,
        allergiesInput: parsedAllergies.join(", "),
      }));
    }
  };

  const handleAddPrescription = async () => {
    const validation = validatePrescription({
      patient: newPrescription.patient,
      doctor: newPrescription.doctor,
      items: newPrescription.items,
    });

    if (!validation.valid) {
      toast.error(isEn ? "Please complete required prescription fields" : "يرجى تعبئة الحقول الأساسية للروشتة والأدوية");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getWebAuthHeaders() },
        body: JSON.stringify({
          ...newPrescription,
          total_refills: Number(newPrescription.total_refills || 0),
          refill_interval_days: Number(newPrescription.refill_interval_days || 0),
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(isEn ? "Prescription registered successfully!" : "تم تسجيل الوصفة الطبية بنجاح!");
        setIsModalOpen(false);
        setNewPrescription({
          patient: "",
          patient_id: "",
          patient_phone: "",
          patient_age: "",
          patient_gender: "male",
          patient_allergies: [],
          allergiesInput: "",
          doctor: "",
          doctor_license: "",
          doctor_specialty: "",
          doctor_phone: "",
          clinic_name: "",
          branch_id: user?.branch_id || "",
          branch_name: user?.branchName || "الفرع الرئيسي",
          date: new Date().toISOString().split("T")[0],
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          diagnosis: "",
          notes: "",
          attachment_url: "",
          total_refills: 0,
          refill_interval_days: 0,
          items: [{ ...defaultNewItem }],
        });
        mutate();
      } else {
        toast.error(result.error || (isEn ? "Failed to add prescription" : "تعذر حفظ الوصفة"));
      }
    } catch (e) {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Dispense Action
  const handleDirectDispense = async () => {
    if (!selectedPrescription) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/prescriptions/${selectedPrescription.id}/dispense`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getWebAuthHeaders() },
          body: JSON.stringify({
            items: selectedPrescription.items,
            notes: dispenseNotes,
            branch_id: user?.branch_id || selectedPrescription.branch_id,
            branch_name: user?.branchName || selectedPrescription.branch_name,
            cashier_name: user?.managerName || user?.name || "الصيدلي",
          }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(isEn ? "Prescription dispensed successfully!" : "تم صرف الوصفة وتحديث سجل الصرف بنجاح!");
        mutate();
        setIsDirectDispenseModalOpen(false);
        setDispenseNotes("");
        setSelectedPrescription(result.prescription);
      } else {
        toast.error(result.error || (isEn ? "Dispensation failed" : "تعذر إتمام الصرف"));
      }
    } catch (e) {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel Prescription
  const handleCancelPrescription = async () => {
    if (!selectedPrescription) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/prescriptions/${selectedPrescription.id}/cancel`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getWebAuthHeaders() },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      const result = await res.json();
      if (result.success) {
        toast.success(isEn ? "Prescription cancelled" : "تم إلغاء الوصفة الطبية");
        mutate();
        setIsCancelModalOpen(false);
        setCancelReason("");
        setSelectedPrescription(null);
      } else {
        toast.error(result.error || (isEn ? "Cancellation failed" : "تعذر إلغاء الوصفة"));
      }
    } catch (e) {
      toast.error(isEn ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to POS with prefilled prescription
  const handleDispenseViaPOS = (prx: any) => {
    router.push(`/pos?prxId=${encodeURIComponent(prx.id)}`);
  };

  return (
    <div className="w-full pb-14">
      <AppBar />

      {/* Top Banner & KPI Metrics */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[24px] font-black text-teal flex items-center gap-2">
            <span>💊</span>
            <span>{isEn ? "Electronic Prescriptions & Clinical Dispensing" : "الوصفات الطبية والسجل السريري للصرف"}</span>
          </h1>
          <p className="text-[14px] text-ink-soft mt-1">
            {isEn
              ? "Comprehensive E-Prescriptions management, clinical allergy cross-checks, chronic refill repeats, and verified POS dispensing"
              : "نظام روشتة الموحد لإدارة الوصفات الطبية، فحص الحساسيات السريرية، تكرار الأدوية المزمنة، والربط المحكم مع نقاط البيع"}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal hover:bg-[#259775] text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-md transition-all flex items-center gap-2"
        >
          <span>➕</span>
          <span>{isEn ? "New Prescription" : "إدخال وصفة طبية جديدة"}</span>
        </button>
      </div>

      {/* Executive KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-mint-line shadow-sm">
          <div className="text-[12px] font-bold text-ink-soft">{isEn ? "Total Prescriptions" : "إجمالي الوصفات"}</div>
          <div className="text-[22px] font-black text-primary mt-1">{serverKPIs?.totalCount ?? rawPrescriptions.length}</div>
          <div className="text-[11px] text-ink-soft mt-0.5">{isEn ? "All records" : "كافة السجلات"}</div>
        </div>

        <div className="bg-[#fffbeb] p-4 rounded-2xl border border-[#fef3c7] shadow-sm">
          <div className="text-[12px] font-bold text-[#b45309]">{isEn ? "Pending Dispense" : "قيد الصرف والانتظار"}</div>
          <div className="text-[22px] font-black text-[#d97706] mt-1">{serverKPIs?.pendingCount ?? 0}</div>
          <div className="text-[11px] text-[#92400e] mt-0.5">{isEn ? "Awaiting cashier" : "جاهزة للصرف بالكاشير"}</div>
        </div>

        <div className="bg-[#eff6ff] p-4 rounded-2xl border border-[#dbeafe] shadow-sm">
          <div className="text-[12px] font-bold text-[#1d4ed8]">{isEn ? "Active Refills" : "صرف جزئي / تكرار"}</div>
          <div className="text-[22px] font-black text-[#2563eb] mt-1">{serverKPIs?.partialCount ?? 0}</div>
          <div className="text-[11px] text-[#1e40af] mt-0.5">{isEn ? "Repeats authorized" : "أدوية مزمنة متكررة"}</div>
        </div>

        <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-[#bbf7d0] shadow-sm">
          <div className="text-[12px] font-bold text-[#15803d]">{isEn ? "Fully Dispensed" : "مكتملة ومصروفة"}</div>
          <div className="text-[22px] font-black text-[#16a34a] mt-1">{serverKPIs?.dispensedCount ?? 0}</div>
          <div className="text-[11px] text-[#166534] mt-0.5">{isEn ? "Completed" : "تم صرف كامل الحصص"}</div>
        </div>

        <div className="bg-[#fef2f2] p-4 rounded-2xl border border-[#fecaca] shadow-sm">
          <div className="text-[12px] font-bold text-[#b91c1c]">{isEn ? "Expired / Cancelled" : "منتهية أو ملغاة"}</div>
          <div className="text-[22px] font-black text-[#dc2626] mt-1">
            {(serverKPIs?.expiredCount ?? 0) + (serverKPIs?.cancelledCount ?? 0)}
          </div>
          <div className="text-[11px] text-[#991b1b] mt-0.5">{isEn ? "Inactive" : "غير صالحة للصرف"}</div>
        </div>
      </div>

      {/* Main Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-mint-line shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-bg/50 border-b border-mint-line flex flex-wrap gap-3 items-center justify-between">
          <div className="flex-1 min-w-[260px] max-w-md">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={isEn ? "Search by Rx#, patient, doctor, phone..." : "ابحث برقم الوصفة، اسم المريض، الطبيب، الهاتف..."}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Tabs */}
            <div className="flex bg-white rounded-xl p-1 border border-mint-line text-[12px] font-bold">
              {[
                { id: "all", label: isEn ? "All" : "الكل" },
                { id: "pending", label: isEn ? "Pending" : "قيد الانتظار" },
                { id: "partially_dispensed", label: isEn ? "Refills" : "تكرار" },
                { id: "dispensed", label: isEn ? "Dispensed" : "مكتملة" },
                { id: "expired", label: isEn ? "Expired" : "منتهية" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === tab.id
                      ? "bg-teal text-white shadow-sm"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Branch Filter */}
            {branches.length > 1 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-white border border-mint-line text-ink rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-teal"
              >
                <option value="all">{isEn ? "All Branches" : "جميع الفروع"}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Prescriptions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-mint-line text-ink-soft text-[13px] bg-bg/30">
                <th className="py-3.5 px-4 font-bold text-start">{isEn ? "Rx Number" : "رقم الروشتة"}</th>
                <th className="py-3.5 px-4 font-bold text-start">{isEn ? "Patient & Phone" : "المريض والهاتف"}</th>
                <th className="py-3.5 px-4 font-bold text-start">{isEn ? "Treating Doctor" : "الطبيب المعالج"}</th>
                <th className="py-3.5 px-4 font-bold text-start">{isEn ? "Issue Date" : "تاريخ الإصدار"}</th>
                <th className="py-3.5 px-4 font-bold text-center">{isEn ? "Medications" : "الأدوية"}</th>
                <th className="py-3.5 px-4 font-bold text-center">{isEn ? "Refills" : "التكرار"}</th>
                <th className="py-3.5 px-4 font-bold text-center">{isEn ? "Status" : "الحالة"}</th>
                <th className="py-3.5 px-4 font-bold text-center">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-line">
              {filteredPrescriptions.map((prx: any) => {
                const isExp = isPrescriptionExpired(prx);
                const itemsCount = Array.isArray(prx.items) ? prx.items.length : 0;
                const totalRefills = Number(prx.total_refills || 0);
                const refillsUsed = Number(prx.refills_used || 0);
                const hasAttachment = Boolean(prx.attachment_url);

                return (
                  <tr key={prx.id} className="hover:bg-bg/40 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-[14px] text-teal flex items-center gap-1.5">
                        <span>{prx.id}</span>
                        {hasAttachment && (
                          <button
                            title={isEn ? "View prescription scan" : "معاينة صورة الروشتة"}
                            onClick={() => setViewAttachmentUrl(prx.attachment_url)}
                            className="text-[13px] hover:opacity-80"
                          >
                            📎
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        {prx.branch_name || (isEn ? "Main Branch" : "الفرع الرئيسي")}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[14px] text-ink">{prx.patient}</div>
                      {prx.patient_phone && (
                        <div className="text-[12px] text-ink-soft font-mono mt-0.5">{prx.patient_phone}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[13px] text-primary">{prx.doctor}</div>
                      {prx.clinic_name && (
                        <div className="text-[11px] text-ink-soft mt-0.5">{prx.clinic_name}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[13px] text-ink-soft font-mono">
                      <div>{prx.date}</div>
                      {prx.expiry_date && (
                        <div className={`text-[11px] ${isExp ? "text-coral font-bold" : "text-ink-soft"}`}>
                          {isEn ? "Exp:" : "ينتهي:"} {prx.expiry_date}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-teal/10 text-teal px-2.5 py-1 rounded-full text-[12px] font-bold">
                        {itemsCount} {isEn ? "meds" : "أصناف"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-[12px]">
                      {totalRefills > 0 ? (
                        <span className="font-bold text-primary">
                          {refillsUsed} / {totalRefills + 1}
                        </span>
                      ) : (
                        <span className="text-ink-soft">{isEn ? "Single" : "مرة واحدة"}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isExp && prx.status !== "dispensed" ? (
                        <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {isEn ? "Expired" : "منتهية الصلاحية"}
                        </span>
                      ) : prx.status === "dispensed" ? (
                        <span className="bg-teal-pale text-teal px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {isEn ? "Dispensed" : "مُصرفة بالكامل"}
                        </span>
                      ) : prx.status === "partially_dispensed" ? (
                        <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {isEn ? "Refill Active" : "صرف جزئي / تكرار"}
                        </span>
                      ) : prx.status === "cancelled" ? (
                        <span className="bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {isEn ? "Cancelled" : "ملغاة"}
                        </span>
                      ) : (
                        <span className="bg-amber-pale text-amber px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {isEn ? "Pending" : "قيد الانتظار"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedPrescription(prx)}
                          className="px-2.5 py-1 text-[12px] font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-all"
                        >
                          👁️ {isEn ? "Details" : "التفاصيل"}
                        </button>
                        {prx.status !== "dispensed" && prx.status !== "cancelled" && !isExp && (
                          <button
                            onClick={() => handleDispenseViaPOS(prx)}
                            className="px-2.5 py-1 text-[12px] font-bold text-white bg-teal hover:bg-[#259775] rounded-lg shadow-sm transition-all"
                          >
                            🛒 {isEn ? "POS Dispense" : "صرف بالكاشير"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPrescriptions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ink-soft text-[15px]">
                    {isEn ? "No matching medical prescriptions found" : "لا توجد وصفات طبية مطابقة للمعايير المحددة"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: New Medical Prescription Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-mint-line my-8 animate-fade-in-up">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <div>
                <h3 className="text-[20px] font-black text-primary flex items-center gap-2">
                  <span>📝</span>
                  <span>{isEn ? "Enter Medical Prescription" : "إدخال وصفة طبية إلكترونية جديدة"}</span>
                </h3>
                <p className="text-[12px] text-ink-soft mt-0.5">
                  {isEn
                    ? "Fill prescriber details, medications with dosage instructions, and patient clinical profile"
                    : "بيانات الطبيب المعالج، الأدوية الموصوفة مع تعليمات الاستخدام، والتفاصيل السريرية للمريض"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              {/* Section A: Patient Details */}
              <div className="bg-bg/50 p-4 rounded-2xl border border-mint-line">
                <div className="font-bold text-[14px] text-primary mb-3 flex items-center gap-1.5">
                  <span>👤</span>
                  <span>{isEn ? "Patient Information" : "بيانات المريض"}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Link Existing Customer / Patient" : "اختر عميلاً مسجلاً (اختياري)"}
                    </label>
                    <select
                      value={newPrescription.patient_id}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    >
                      <option value="">{isEn ? "-- Select customer to auto-fill --" : "-- اختر عميلاً للتعبئة التلقائية --"}</option>
                      {customers.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Patient Name *" : "اسم المريض *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newPrescription.patient}
                      onChange={(e) => setNewPrescription({ ...newPrescription, patient: e.target.value })}
                      placeholder={isEn ? "e.g. Omar Ahmed" : "مثال: عمر أحمد"}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Phone Number" : "رقم هاتف المريض"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.patient_phone}
                      onChange={(e) => setNewPrescription({ ...newPrescription, patient_phone: e.target.value })}
                      placeholder="059xxxxxxx"
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-mono outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Age / Gender" : "العمر / الجنس"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPrescription.patient_age}
                        onChange={(e) => setNewPrescription({ ...newPrescription, patient_age: e.target.value })}
                        placeholder={isEn ? "Age (yrs)" : "العمر (سنة)"}
                        className="w-1/2 bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                      />
                      <select
                        value={newPrescription.patient_gender}
                        onChange={(e) => setNewPrescription({ ...newPrescription, patient_gender: e.target.value })}
                        className="w-1/2 bg-white border border-mint-line rounded-xl px-2 py-2 text-[12px] outline-none focus:border-teal"
                      >
                        <option value="male">{isEn ? "Male" : "ذكر"}</option>
                        <option value="female">{isEn ? "Female" : "أنثى"}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-coral mb-1">
                      ⚠️ {isEn ? "Known Drug Allergies" : "الحساسية الدوائية للمريض"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.allergiesInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
                        setNewPrescription({ ...newPrescription, allergiesInput: val, patient_allergies: arr });
                      }}
                      placeholder={isEn ? "e.g. penicillin, aspirin, sulfa" : "مثال: بنسلين، أسبرين، سلفا"}
                      className="w-full bg-white border border-coral/30 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-coral"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Doctor & Prescriber Details */}
              <div className="bg-bg/50 p-4 rounded-2xl border border-mint-line">
                <div className="font-bold text-[14px] text-primary mb-3 flex items-center gap-1.5">
                  <span>🩺</span>
                  <span>{isEn ? "Doctor & Prescriber Credentials" : "بيانات الطبيب المعالج والعيادة"}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Treating Doctor Name *" : "اسم الطبيب المعالج *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newPrescription.doctor}
                      onChange={(e) => setNewPrescription({ ...newPrescription, doctor: e.target.value })}
                      placeholder={isEn ? "e.g. Dr. Sami Nasser" : "مثال: د. سامي ناصر"}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Medical License No." : "رقم مزاولة المهنة / الترخيص"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.doctor_license}
                      onChange={(e) => setNewPrescription({ ...newPrescription, doctor_license: e.target.value })}
                      placeholder="e.g. MD-54321"
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-mono outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Specialty" : "التخصص الطبي"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.doctor_specialty}
                      onChange={(e) => setNewPrescription({ ...newPrescription, doctor_specialty: e.target.value })}
                      placeholder={isEn ? "e.g. Internal Medicine" : "مثال: أمراض باطنية، أطفال"}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Clinic / Hospital Name" : "اسم العيادة أو المستشفى"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.clinic_name}
                      onChange={(e) => setNewPrescription({ ...newPrescription, clinic_name: e.target.value })}
                      placeholder={isEn ? "e.g. Al-Amal Medical Center" : "مثال: مركز الأمل التخصصي"}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Doctor / Clinic Phone" : "هاتف العيادة أو الطبيب"}
                    </label>
                    <input
                      type="text"
                      value={newPrescription.doctor_phone}
                      onChange={(e) => setNewPrescription({ ...newPrescription, doctor_phone: e.target.value })}
                      placeholder="02xxxxxxx"
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] font-mono outline-none focus:border-teal"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Prescription Validity, Refills & Attachment */}
              <div className="bg-bg/50 p-4 rounded-2xl border border-mint-line">
                <div className="font-bold text-[14px] text-primary mb-3 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{isEn ? "Prescription Validity & Refill Rules" : "صلاحية الروشتة وتكرار الصرف"}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Issue Date" : "تاريخ الإصدار"}
                    </label>
                    <input
                      type="date"
                      value={newPrescription.date}
                      onChange={(e) => setNewPrescription({ ...newPrescription, date: e.target.value })}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Expiry Date" : "تاريخ انتهاء الصلاحية"}
                    </label>
                    <input
                      type="date"
                      value={newPrescription.expiry_date}
                      onChange={(e) => setNewPrescription({ ...newPrescription, expiry_date: e.target.value })}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Authorized Refills" : "عدد مرات التكرار (Refills)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={newPrescription.total_refills}
                      onChange={(e) => setNewPrescription({ ...newPrescription, total_refills: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-ink-soft mb-1">
                      {isEn ? "Interval (Days)" : "الفاصل الزمني (أيام)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newPrescription.refill_interval_days}
                      onChange={(e) => setNewPrescription({ ...newPrescription, refill_interval_days: parseInt(e.target.value) || 0 })}
                      placeholder="e.g. 25"
                      className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[13px] outline-none focus:border-teal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    📎 {isEn ? "Prescription Attachment / Digital Image Scan (URL or base64)" : "رابط أو صورة الروشتة الورقية الممسوحة"}
                  </label>
                  <input
                    type="text"
                    value={newPrescription.attachment_url}
                    onChange={(e) => setNewPrescription({ ...newPrescription, attachment_url: e.target.value })}
                    placeholder="https://... or data:image/..."
                    className="w-full bg-white border border-mint-line rounded-xl px-3 py-2 text-[12px] font-mono outline-none focus:border-teal"
                  />
                </div>
              </div>

              {/* Section D: Prescribed Items with Live Inventory Lookup */}
              <div className="bg-bg/50 p-4 rounded-2xl border border-mint-line space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-[14px] text-primary flex items-center gap-1.5">
                    <span>💊</span>
                    <span>{isEn ? "Prescribed Medications *" : "الأدوية الموصوفة *"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPrescription({
                        ...newPrescription,
                        items: [...newPrescription.items, { ...defaultNewItem }],
                      })
                    }
                    className="text-teal text-[13px] font-bold hover:underline"
                  >
                    + {isEn ? "Add Medication" : "إضافة دواء جديد"}
                  </button>
                </div>

                {/* Clinical Allergy Alert Box */}
                {creationAllergyWarnings.length > 0 && (
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-red-800 space-y-1">
                    <div className="font-bold text-[13px] flex items-center gap-1.5">
                      <span>🚨</span>
                      <span>{isEn ? "High Clinical Safety Alert!" : "تنبيه تعارض دوائي وسريري عالي الخطورة!"}</span>
                    </div>
                    {creationAllergyWarnings.map((w, idx) => (
                      <div key={idx} className="text-[12px]">
                        • {isEn ? w.messageEn : w.messageAr}
                      </div>
                    ))}
                  </div>
                )}

                {/* Items List */}
                {newPrescription.items.map((item, idx) => {
                  const filtered =
                    item.name.trim().length >= 2
                      ? meds.filter(
                          (m: any) =>
                            m.name.toLowerCase().includes(item.name.toLowerCase()) ||
                            (m.active_ingredient && m.active_ingredient.toLowerCase().includes(item.name.toLowerCase()))
                        )
                      : [];

                  return (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-mint-line space-y-2">
                      <div className="flex items-center justify-between text-[12px] font-bold text-ink-soft">
                        <span>#{idx + 1}</span>
                        {newPrescription.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextItems = newPrescription.items.filter((_, i) => i !== idx);
                              setNewPrescription({ ...newPrescription, items: nextItems });
                            }}
                            className="text-coral hover:underline text-[12px]"
                          >
                            {isEn ? "Remove" : "حذف الصنف"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        {/* Med Name with Typeahead */}
                        <div className="md:col-span-2 relative">
                          <input
                            type="text"
                            placeholder={isEn ? "Medication Name / Search Inventory" : "اسم الدواء أو ابحث بالمخزون"}
                            value={item.name}
                            autoComplete="off"
                            ref={(el) => {
                              inputRefs.current[idx] = el;
                            }}
                            onFocus={() => {
                              setActiveMedIdx(idx);
                              const el = inputRefs.current[idx];
                              if (el) {
                                const rect = el.getBoundingClientRect();
                                setDropdownPos({
                                  top: rect.bottom + window.scrollY + 4,
                                  left: rect.left + window.scrollX,
                                  width: rect.width,
                                });
                              }
                            }}
                            onBlur={() => setTimeout(() => setActiveMedIdx(null), 200)}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].name = e.target.value;
                              setNewPrescription({ ...newPrescription, items: newItems });
                              setActiveMedIdx(idx);
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-3 py-2 text-[13px] outline-none focus:border-teal"
                          />

                          {activeMedIdx === idx && filtered.length > 0 && dropdownPos && (
                            <div
                              className="fixed z-[9999] bg-white border border-mint-line rounded-xl shadow-2xl max-h-48 overflow-y-auto"
                              style={{
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: dropdownPos.width,
                              }}
                            >
                              {filtered.slice(0, 8).map((m: any) => (
                                <div
                                  key={m.id}
                                  onMouseDown={() => {
                                    const newItems = [...newPrescription.items];
                                    (newItems[idx] as any).id = m.id;
                                    newItems[idx].name = m.name;
                                    newItems[idx].active_ingredient = m.active_ingredient || "";
                                    newItems[idx].dosage = m.dosage || newItems[idx].dosage;
                                    setNewPrescription({ ...newPrescription, items: newItems });
                                    setActiveMedIdx(null);
                                  }}
                                  className="px-3 py-2 text-[12px] cursor-pointer hover:bg-bg border-b border-mint-line last:border-0 flex justify-between items-center"
                                >
                                  <div>
                                    <span className="font-bold text-ink">{m.name}</span>
                                    {m.active_ingredient && (
                                      <span className="text-[10px] text-ink-soft block">{m.active_ingredient}</span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-teal font-mono font-bold">
                                    {m.qty} {isEn ? "Avail" : "متوفر"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Dosage */}
                        <div>
                          <input
                            type="text"
                            placeholder={isEn ? "Dosage (e.g. 500mg)" : "الجرعة (مثال: 500 ملغم)"}
                            value={item.dosage}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].dosage = e.target.value;
                              setNewPrescription({ ...newPrescription, items: newItems });
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-3 py-2 text-[12px] outline-none focus:border-teal"
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <input
                            type="number"
                            min="1"
                            placeholder={isEn ? "Quantity" : "الكمية"}
                            value={item.qty}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].qty = parseInt(e.target.value) || 1;
                              setNewPrescription({ ...newPrescription, items: newItems });
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-3 py-2 text-[12px] font-mono text-center outline-none focus:border-teal"
                          />
                        </div>
                      </div>

                      {/* Instructions & Frequency */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <select
                            value={item.frequency}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].frequency = e.target.value;
                              setNewPrescription({ ...newPrescription, items: newItems });
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-teal"
                          >
                            {DOSAGE_FREQUENCIES.map((f) => (
                              <option key={f.id} value={f.id}>
                                {isEn ? f.en : f.ar}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={item.form}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].form = e.target.value;
                              setNewPrescription({ ...newPrescription, items: newItems });
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-teal"
                          >
                            {MEDICATION_FORMS.map((form) => (
                              <option key={form.id} value={form.id}>
                                {isEn ? form.en : form.ar}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder={isEn ? "Instructions (e.g. after meals)" : "تعليمات خاصة (مثال: بعد الأكل)"}
                            value={item.instructions}
                            onChange={(e) => {
                              const newItems = [...newPrescription.items];
                              newItems[idx].instructions = e.target.value;
                              setNewPrescription({ ...newPrescription, items: newItems });
                            }}
                            className="w-full bg-bg border border-mint-line rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-teal"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Diagnosis & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {isEn ? "Clinical Diagnosis / ICD-10" : "التشخيص السريري / ملاحظات الحالة"}
                  </label>
                  <textarea
                    rows={2}
                    value={newPrescription.diagnosis}
                    onChange={(e) => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
                    placeholder={isEn ? "e.g. Upper Respiratory Tract Infection" : "مثال: التهاب حاد في الجهاز التنفسي"}
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[12px] outline-none focus:border-teal resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-ink-soft mb-1">
                    {isEn ? "Pharmacist Consultation Notes" : "ملاحظات وتوجيهات الصيدلي"}
                  </label>
                  <textarea
                    rows={2}
                    value={newPrescription.notes}
                    onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                    placeholder={isEn ? "Special instructions for the patient" : "إرشادات تقديم الدواء للمريض"}
                    className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[12px] outline-none focus:border-teal resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6 border-t border-mint-line pt-4">
              <button
                onClick={handleAddPrescription}
                disabled={isLoading || !newPrescription.patient || !newPrescription.doctor}
                className="flex-1 bg-teal text-white font-bold py-3 rounded-xl shadow-md hover:bg-[#259775] transition-all disabled:opacity-50"
              >
                {isLoading ? (isEn ? "Saving..." : "جاري الحفظ...") : (isEn ? "Save Prescription" : "حفظ واعتماد الروشتة")}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-bg text-ink font-bold py-3 rounded-xl hover:bg-mint-line transition-all"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Prescription Details & Dispensation Hub */}
      {selectedPrescription && (
        <div className="fixed inset-0 bg-primary/25 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-mint-line my-8 animate-fade-in-up">
            <div className="flex justify-between items-center mb-5 border-b border-mint-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-black text-primary">
                    {isEn ? "Medical Prescription" : "تفاصيل الوصفة الطبية"}
                  </h3>
                  <span className="font-mono text-teal font-black text-[16px]">
                    #{selectedPrescription.id}
                  </span>
                </div>
                <div className="text-[12px] text-ink-soft mt-0.5">
                  {selectedPrescription.branch_name || (isEn ? "Main Branch" : "الفرع الرئيسي")}
                </div>
              </div>

              <button
                onClick={() => setSelectedPrescription(null)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
              {/* Patient & Doctor Card Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-bg/60 p-3.5 rounded-2xl border border-mint-line">
                  <div className="text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Patient" : "المريض"}</div>
                  <div className="text-[15px] font-black text-ink">{selectedPrescription.patient}</div>
                  {selectedPrescription.patient_phone && (
                    <div className="text-[12px] text-ink-soft font-mono mt-0.5">{selectedPrescription.patient_phone}</div>
                  )}
                  {selectedPrescription.patient_allergies && (
                    <div className="text-[11px] text-coral font-bold mt-1">
                      ⚠️ {isEn ? "Allergies:" : "حساسية:"} {Array.isArray(selectedPrescription.patient_allergies) ? selectedPrescription.patient_allergies.join(", ") : selectedPrescription.patient_allergies}
                    </div>
                  )}
                </div>

                <div className="bg-bg/60 p-3.5 rounded-2xl border border-mint-line">
                  <div className="text-[11px] font-bold text-ink-soft mb-1">{isEn ? "Treating Doctor" : "الطبيب المعالج"}</div>
                  <div className="text-[15px] font-black text-primary">{selectedPrescription.doctor}</div>
                  {selectedPrescription.doctor_license && (
                    <div className="text-[11px] text-ink-soft font-mono mt-0.5">
                      {isEn ? "License:" : "ترخيص:"} {selectedPrescription.doctor_license}
                    </div>
                  )}
                  {selectedPrescription.clinic_name && (
                    <div className="text-[11px] text-ink-soft mt-0.5">{selectedPrescription.clinic_name}</div>
                  )}
                </div>
              </div>

              {/* Status & Refill Progress */}
              <div className="bg-white p-3.5 rounded-2xl border border-mint-line flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[12px] text-ink-soft font-bold block mb-1">{isEn ? "Prescription Status" : "حالة الوصفة"}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-[12px] font-bold ${
                      selectedPrescription.status === "dispensed"
                        ? "bg-teal-pale text-teal"
                        : selectedPrescription.status === "partially_dispensed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-pale text-amber"
                    }`}
                  >
                    {selectedPrescription.status === "dispensed"
                      ? (isEn ? "Dispensed" : "مُصرفة بالكامل")
                      : selectedPrescription.status === "partially_dispensed"
                      ? (isEn ? "Refills Active" : "صرف جزئي / تكرار نشط")
                      : (isEn ? "Pending" : "قيد الانتظار")}
                  </span>
                </div>

                <div>
                  <span className="text-[12px] text-ink-soft font-bold block mb-1">{isEn ? "Refills Tracking" : "تتبع مرات الصرف"}</span>
                  <span className="font-mono text-[14px] font-black text-primary">
                    {selectedPrescription.refills_used || 0} / {(Number(selectedPrescription.total_refills || 0)) + 1}
                  </span>
                </div>

                <div>
                  <span className="text-[12px] text-ink-soft font-bold block mb-1">{isEn ? "Issued / Valid Until" : "تاريخ الإصدار / الانتهاء"}</span>
                  <span className="font-mono text-[12px] text-ink">
                    {selectedPrescription.date} {selectedPrescription.expiry_date ? `— ${selectedPrescription.expiry_date}` : ""}
                  </span>
                </div>

                {selectedPrescription.attachment_url && (
                  <button
                    onClick={() => setViewAttachmentUrl(selectedPrescription.attachment_url)}
                    className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
                  >
                    📎 {isEn ? "View Rx Scan" : "معاينة صورة الروشتة"}
                  </button>
                )}
              </div>

              {/* Prescribed Items Table */}
              <div>
                <h4 className="font-bold text-[14px] text-ink-soft mb-2">
                  {isEn ? "Prescribed Medications & Dosages:" : "الأدوية الموصوفة والجرعات المقررة:"}
                </h4>
                <div className="bg-bg border border-mint-line rounded-2xl overflow-hidden">
                  <table className="w-full text-start text-[13px]">
                    <thead className="bg-mint-bg/60 border-b border-mint-line text-ink-soft">
                      <tr>
                        <th className="py-2.5 px-3 text-start font-bold">{isEn ? "Medication" : "الدواء"}</th>
                        <th className="py-2.5 px-3 text-start font-bold">{isEn ? "Dosage & Form" : "الجرعة والشكل"}</th>
                        <th className="py-2.5 px-3 text-start font-bold">{isEn ? "Instructions" : "التعليمات"}</th>
                        <th className="py-2.5 px-3 text-center font-bold">{isEn ? "Prescribed" : "المقرر"}</th>
                        <th className="py-2.5 px-3 text-center font-bold">{isEn ? "Dispensed" : "المصروف"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mint-line/60">
                      {(Array.isArray(selectedPrescription.items) ? selectedPrescription.items : []).map(
                        (item: any, idx: number) => {
                          const pQty = Number(item.qty ?? item.prescribed_qty ?? 1);
                          const dQty = Number(item.dispensed_qty ?? 0);
                          const isFull = dQty >= pQty;

                          return (
                            <tr key={idx} className="hover:bg-white/50">
                              <td className="py-2.5 px-3 font-bold text-ink">
                                <div>{item.name}</div>
                                {item.active_ingredient && (
                                  <div className="text-[10px] text-ink-soft font-normal">{item.active_ingredient}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-ink-soft">
                                <div>{item.dosage || "-"}</div>
                                <div className="text-[11px] text-primary">{item.form || ""}</div>
                              </td>
                              <td className="py-2.5 px-3 text-ink-soft text-[12px]">
                                {item.instructions || item.frequency || "-"}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-ink">
                                {pQty}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                <span className={isFull ? "text-teal" : "text-amber-dark"}>
                                  {dQty}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dispensation History Audit Log */}
              {Array.isArray(selectedPrescription.dispensations) && selectedPrescription.dispensations.length > 0 && (
                <div>
                  <h4 className="font-bold text-[14px] text-ink-soft mb-2">
                    📋 {isEn ? "Dispensation Audit Trail:" : "سجل الحصص المصروفة والتدقيق:"}
                  </h4>
                  <div className="space-y-2">
                    {selectedPrescription.dispensations.map((disp: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-mint-line text-[12px] flex justify-between items-center">
                        <div>
                          <div className="font-bold text-primary">
                            {isEn ? `Dispensation #${i + 1}` : `الحصة #${i + 1}`} {disp.sale_id ? `(فاتورة #${disp.sale_id})` : ""}
                          </div>
                          <div className="text-ink-soft text-[11px] mt-0.5">
                            {disp.cashier_name || "الصيدلي"} • {disp.branch_name || "الفرع الرئيسي"}
                          </div>
                        </div>
                        <div className="font-mono text-ink-soft text-[11px]">
                          {new Date(disp.date).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action Controls */}
            <div className="flex flex-wrap gap-2.5 mt-6 border-t border-mint-line pt-4">
              {selectedPrescription.status !== "dispensed" && selectedPrescription.status !== "cancelled" && (
                <>
                  <button
                    onClick={() => handleDispenseViaPOS(selectedPrescription)}
                    className="flex-1 bg-teal hover:bg-[#259775] text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🛒</span>
                    <span>{isEn ? "Open in POS" : "صرف عبر الكاشير (POS)"}</span>
                  </button>

                  <button
                    onClick={() => setIsDirectDispenseModalOpen(true)}
                    className="bg-primary/10 hover:bg-primary hover:text-white text-primary font-bold px-4 py-3 rounded-xl transition-all"
                  >
                    ⚡ {isEn ? "Direct Dispense" : "صرف مباشر"}
                  </button>

                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="bg-red-50 hover:bg-red-100 text-coral font-bold px-4 py-3 rounded-xl transition-all"
                  >
                    {isEn ? "Cancel Rx" : "إلغاء الروشتة"}
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedPrescription(null)}
                className="bg-bg text-ink font-bold px-6 py-3 rounded-xl hover:bg-mint-line transition-all"
              >
                {isEn ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Prescription Attachment Scan Preview */}
      {viewAttachmentUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-4 max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
              <span className="font-bold text-[14px] text-ink">{isEn ? "Prescription Attachment Scan" : "صورة الوصفة الطبية الممسوحة"}</span>
              <button
                onClick={() => setViewAttachmentUrl(null)}
                className="text-ink-soft hover:text-coral p-1.5 bg-bg rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[75vh] w-full flex justify-center">
              <img
                src={viewAttachmentUrl}
                alt="Prescription Scan"
                className="rounded-2xl max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Direct Dispensation Confirmation */}
      {isDirectDispenseModalOpen && (
        <div className="fixed inset-0 bg-primary/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-mint-line">
            <h3 className="font-black text-[18px] text-primary mb-2">
              ⚡ {isEn ? "Direct Dispensation" : "تأكيد الصرف المباشر للروشتة"}
            </h3>
            <p className="text-[13px] text-ink-soft mb-4">
              {isEn
                ? "This will record this dispensation, update the remaining repeats, and mark the prescription as dispensed."
                : "سيتم تسجيل هذه الحصة في سجل التدقيق السريري للوصفة الطبية وتحديث عدد مرات التكرار المتبقية."}
            </p>
            <div className="mb-4">
              <label className="block text-[12px] font-bold text-ink-soft mb-1">
                {isEn ? "Pharmacist Notes (Optional)" : "ملاحظات الصيدلي (اختياري)"}
              </label>
              <textarea
                rows={2}
                value={dispenseNotes}
                onChange={(e) => setDispenseNotes(e.target.value)}
                placeholder={isEn ? "Any dispensing advice..." : "أي تعليمات أو ملاحظات تم إرشاد المريض بها..."}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[12px] outline-none focus:border-teal resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDirectDispense}
                disabled={isLoading}
                className="flex-1 bg-teal text-white font-bold py-2.5 rounded-xl hover:bg-[#259775] transition-all disabled:opacity-50"
              >
                {isLoading ? (isEn ? "Dispensing..." : "جاري الصرف...") : (isEn ? "Confirm Dispense" : "تأكيد الصرف")}
              </button>
              <button
                onClick={() => setIsDirectDispenseModalOpen(false)}
                className="flex-1 bg-bg text-ink font-bold py-2.5 rounded-xl hover:bg-mint-line transition-all"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Cancel Prescription Confirmation */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-primary/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-mint-line">
            <h3 className="font-black text-[18px] text-coral mb-2">
              🚫 {isEn ? "Cancel Prescription" : "إلغاء الوصفة الطبية"}
            </h3>
            <p className="text-[13px] text-ink-soft mb-4">
              {isEn
                ? "Are you sure you want to void this prescription? It will be marked as inactive."
                : "هل أنت متأكد من إلغاء هذه الوصفة؟ سيتم إيقاف صلاحيتها للصرف نهائياً."}
            </p>
            <div className="mb-4">
              <label className="block text-[12px] font-bold text-ink-soft mb-1">
                {isEn ? "Cancellation Reason" : "سبب الإلغاء"}
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={isEn ? "e.g. Doctor amended prescription" : "مثال: تعديل الوصفة من الطبيب المعالج"}
                className="w-full bg-bg border border-mint-line rounded-xl px-3 py-2 text-[12px] outline-none focus:border-coral"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelPrescription}
                disabled={isLoading}
                className="flex-1 bg-coral text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isLoading ? (isEn ? "Processing..." : "جاري الإلغاء...") : (isEn ? "Confirm Cancel" : "تأكيد الإلغاء")}
              </button>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 bg-bg text-ink font-bold py-2.5 rounded-xl hover:bg-mint-line transition-all"
              >
                {isEn ? "Back" : "تراجع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
