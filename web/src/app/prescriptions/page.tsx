"use client";

import { useState, useRef } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import toast from "react-hot-toast";

import useSWR from "swr";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Prescriptions() {
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/prescriptions`
      : null,
    fetcher,
  );
  const prescriptions = data?.prescriptions || [];

  const { data: inventoryData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`
      : null,
    fetcher,
  );
  const meds = inventoryData?.inventory || [];

  const handleDispense = async (id: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/prescriptions/${id}/dispense`,
        {
          method: "PUT",
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(language === 'en' ? "Medications dispensed and prescription status updated successfully!" : "تم صرف الأدوية وتحديث حالة الروشتة بنجاح!");
        mutate();
        if (selectedPrescription && selectedPrescription.id === id) {
          setSelectedPrescription({
            ...selectedPrescription,
            status: "dispensed",
          });
        }
      } else {
        toast.error(result.error || (language === 'en' ? "Update failed" : "فشل التحديث"));
      }
    } catch (e) {
      toast.error(language === 'en' ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  const [newPrescription, setNewPrescription] = useState<{
    patient: string;
    doctor: string;
    items: { name: string; dosage: string; qty: number }[];
  }>({
    patient: "",
    doctor: "",
    items: [{ name: "", dosage: "", qty: 1 }],
  });
  const [activeMedIdx, setActiveMedIdx] = useState<number | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAdd = async () => {
    if (!newPrescription.patient || !newPrescription.doctor) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/prescriptions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patient: newPrescription.patient,
            doctor: newPrescription.doctor,
            date: new Date().toISOString().split("T")[0],
            items: newPrescription.items,
          }),
        },
      );
      const result = await res.json();
      if (result.success) {
        toast.success(language === 'en' ? "Prescription added successfully!" : "تم إضافة الوصفة بنجاح!");
        setIsModalOpen(false);
        setNewPrescription({
          patient: "",
          doctor: "",
          items: [{ name: "", dosage: "", qty: 1 }],
        });
        mutate();
      } else {
        toast.error(result.error || (language === 'en' ? "Addition failed" : "فشل الإضافة"));
      }
    } catch (e) {
      toast.error(language === 'en' ? "Connection error" : "خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full pb-10">
      <AppBar />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-[22px] font-bold text-teal">
            {language === 'en' ? 'Medical Prescriptions' : 'الوصفات الطبية (الروشتات)'}
          </h1>
          <p className="text-[15px] text-ink-soft mt-1">
            {language === 'en' ? 'Track and dispense medical prescriptions electronically' : 'تتبع وصرف الوصفات الطبية بشكل إلكتروني'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-teal text-white px-5 py-2.5 rounded-xl font-bold text-[14px] shadow-sm hover:bg-[#259775] transition-all"
        >
          {language === 'en' ? '+ Enter Medical Prescription' : '+ إدخال وصفة طبية'}
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-mint-line overflow-hidden">
        <div className="p-5 border-b border-mint-line bg-bg flex justify-between items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={language === 'en' ? "Search by prescription number or patient name..." : "ابحث برقم الوصفة أو اسم المريض..."}
          />
        </div>

        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-mint-line text-ink-soft text-[14px]">
              <th className="py-3 px-5 font-semibold">{language === 'en' ? 'Prescription No.' : 'رقم الروشتة'}</th>
              <th className="py-3 px-5 font-semibold">{language === 'en' ? 'Patient' : 'المريض'}</th>
              <th className="py-3 px-5 font-semibold">{language === 'en' ? 'Treating Doctor' : 'الطبيب المعالج'}</th>
              <th className="py-3 px-5 font-semibold">{language === 'en' ? 'Date' : 'التاريخ'}</th>
              <th className="py-3 px-5 font-semibold">{language === 'en' ? 'Status' : 'الحالة'}</th>
              <th className="py-3 px-5 font-semibold text-center">{language === 'en' ? 'Actions' : 'إجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions
              .filter(
                (p: any) => p.patient.includes(search) || p.id.includes(search),
              )
              .map((prx: any) => (
                <tr
                  key={prx.id}
                  className="border-b border-mint-line/50 hover:bg-bg/50 transition-all"
                >
                  <td className="py-4 px-5 font-mono text-[14px] font-bold text-ink">
                    {prx.id}
                  </td>
                  <td className="py-4 px-5 font-bold text-[14px] text-primary">
                    {prx.patient}
                  </td>
                  <td className="py-4 px-5 text-[14px] text-ink-soft">
                    {prx.doctor}
                  </td>
                  <td className="py-4 px-5 text-[14px] text-ink-soft">
                    {prx.date}
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`px-2 py-1 rounded-md text-[12px] font-bold ${
                        prx.status === "dispensed"
                          ? "bg-teal-pale text-teal"
                          : "bg-amber-pale text-amber"
                      }`}
                    >
                      {prx.status === "dispensed" ? (language === 'en' ? "Dispensed" : "مُصرفة") : (language === 'en' ? "Pending" : "قيد الانتظار")}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setSelectedPrescription(prx)}
                        className="px-3 py-1.5 text-[13px] font-bold text-primary bg-primary-pale rounded-lg hover:bg-primary hover:text-white transition-all"
                      >
                        {language === 'en' ? 'View' : 'عرض'}
                      </button>
                      {prx.status === "pending" && (
                        <button
                          onClick={() => handleDispense(prx.id)}
                          className="px-3 py-1.5 text-[13px] font-bold text-teal border border-teal-pale rounded-lg hover:bg-teal hover:text-white transition-all"
                        >
                          {language === 'en' ? 'Dispense' : 'صرف الأدوية'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            {prescriptions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-ink-soft text-[15px]"
                >
                  {language === 'en' ? 'No registered medical prescriptions' : 'لا يوجد وصفات طبية مسجلة'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                {language === 'en' ? 'Enter New Medical Prescription' : 'إدخال وصفة طبية جديدة'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  {language === 'en' ? 'Patient Name' : 'اسم المريض'}
                </label>
                <input
                  type="text"
                  value={newPrescription.patient}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      patient: e.target.value,
                    })
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors"
                  placeholder={language === 'en' ? "e.g., Ahmed Mahmoud" : "مثال: أحمد محمود"}
                />
              </div>
              <div>
                <label className="block text-[14px] font-bold text-ink-soft mb-2">
                  {language === 'en' ? 'Treating Doctor Name' : 'اسم الطبيب المعالج'}
                </label>
                <input
                  type="text"
                  value={newPrescription.doctor}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      doctor: e.target.value,
                    })
                  }
                  className="w-full bg-bg border border-mint-line rounded-xl px-4 py-3 outline-none focus:border-teal transition-colors"
                  placeholder={language === 'en' ? "e.g., Dr. Sami Nasser" : "مثال: د. سامي ناصر"}
                />
              </div>

              <div className="border border-mint-line rounded-xl p-4 bg-mint-bg/30 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[14px] font-bold text-ink-soft">
                    {language === 'en' ? 'Medications (Items)' : 'الأدوية (الأصناف)'}
                  </label>
                  <button
                    onClick={() =>
                      setNewPrescription({
                        ...newPrescription,
                        items: [
                          ...newPrescription.items,
                          { name: "", dosage: "", qty: 1 },
                        ],
                      })
                    }
                    className="text-teal text-[13px] font-bold hover:underline"
                  >
                    {language === 'en' ? '+ Add Medication' : '+ إضافة دواء'}
                  </button>
                </div>
                {newPrescription.items.map((item, idx) => {
                  const filtered =
                    item.name.trim().length >= 2
                      ? meds.filter((m: any) => m.name.includes(item.name))
                      : [];
                  return (
                    <div key={idx} className="flex gap-2 relative">
                      <div className="relative w-full">
                        <input
                          type="text"
                          placeholder={language === 'en' ? "Medication Name" : "اسم الدواء"}
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
                          onBlur={() =>
                            setTimeout(() => setActiveMedIdx(null), 150)
                          }
                          onChange={(e) => {
                            const newItems = [...newPrescription.items];
                            newItems[idx].name = e.target.value;
                            setNewPrescription({
                              ...newPrescription,
                              items: newItems,
                            });
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
                          className="w-full bg-white border border-mint-line rounded-lg px-3 py-2 outline-none focus:border-teal text-[13px]"
                        />
                        {activeMedIdx === idx &&
                          filtered.length > 0 &&
                          dropdownPos && (
                            <div
                              className="fixed z-[9999] bg-white border border-mint-line rounded-xl shadow-xl max-h-48 overflow-y-auto"
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
                                    newItems[idx].name = m.name;
                                    setNewPrescription({
                                      ...newPrescription,
                                      items: newItems,
                                    });
                                    setActiveMedIdx(null);
                                  }}
                                  className="px-3 py-2 text-[13px] cursor-pointer hover:bg-bg border-b border-mint-line last:border-0 flex justify-between items-center"
                                >
                                  <span className="font-semibold text-ink">
                                    {m.name}
                                  </span>
                                  <span className="text-[11px] text-ink-soft font-mono">
                                    {m.qty} {language === 'en' ? 'Available' : 'متوفر'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                      <input
                        type="text"
                        placeholder={language === 'en' ? "Dosage" : "الجرعة"}
                        value={item.dosage}
                        onChange={(e) => {
                          const newItems = [...newPrescription.items];
                          newItems[idx].dosage = e.target.value;
                          setNewPrescription({
                            ...newPrescription,
                            items: newItems,
                          });
                        }}
                        className="w-full bg-white border border-mint-line rounded-lg px-3 py-2 outline-none focus:border-teal text-[13px]"
                      />
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...newPrescription.items];
                          newItems[idx].qty = parseInt(e.target.value) || 1;
                          setNewPrescription({
                            ...newPrescription,
                            items: newItems,
                          });
                        }}
                        className="w-16 bg-white border border-mint-line rounded-lg px-3 py-2 outline-none focus:border-teal text-[13px] text-center"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="bg-amber-pale/50 border border-amber/20 rounded-xl p-3 text-[13px] text-amber-dark font-semibold">
                {language === 'en' ? '💡 The new prescription will be listed as "Pending" so you can dispense the mentioned medications to the patient via the cashier.' : '💡 سيتم إدراج الروشتة الجديدة كـ "قيد الانتظار" لتتمكن من صرف الأدوية المذكورة فيها للمريض عبر الكاشير.'}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={
                  isLoading ||
                  !newPrescription.patient ||
                  !newPrescription.doctor
                }
                className="flex-1 bg-teal text-white font-bold py-3.5 rounded-xl shadow-md shadow-teal/20 hover:bg-[#259775] transition-all disabled:opacity-50"
              >
                {isLoading ? (language === 'en' ? "Saving..." : "جاري الحفظ...") : (language === 'en' ? "Save Prescription" : "حفظ الوصفة")}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-bg text-ink font-bold py-3.5 rounded-xl hover:bg-mint-line transition-all"
              >
                {language === 'en' ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPrescription && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-mint-line animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b border-mint-line pb-4">
              <h3 className="text-[20px] font-black text-primary">
                {language === 'en' ? 'Medical Prescription Details' : 'تفاصيل الوصفة الطبية'}
              </h3>
              <button
                onClick={() => setSelectedPrescription(null)}
                className="text-ink-soft hover:text-coral transition-colors p-2 bg-bg rounded-full"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center border-b border-mint-line pb-3">
                <span className="text-ink-soft font-bold text-[14px]">
                  {language === 'en' ? 'Prescription Number' : 'رقم الوصفة'}
                </span>
                <span className="font-mono text-ink font-black text-[15px]">
                  {selectedPrescription.id}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-mint-line pb-3">
                <span className="text-ink-soft font-bold text-[14px]">
                  {language === 'en' ? 'Patient' : 'المريض'}
                </span>
                <span className="text-primary font-black text-[15px]">
                  {selectedPrescription.patient}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-mint-line pb-3">
                <span className="text-ink-soft font-bold text-[14px]">
                  {language === 'en' ? 'Treating Doctor' : 'الطبيب المعالج'}
                </span>
                <span className="text-ink font-bold text-[15px]">
                  {selectedPrescription.doctor}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-mint-line pb-3">
                <span className="text-ink-soft font-bold text-[14px]">
                  {language === 'en' ? 'Date' : 'التاريخ'}
                </span>
                <span className="text-ink font-bold text-[15px]">
                  {selectedPrescription.date}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3">
                <span className="text-ink-soft font-bold text-[14px]">
                  {language === 'en' ? 'Status' : 'الحالة'}
                </span>
                <span
                  className={`px-3 py-1 rounded-md text-[13px] font-bold ${
                    selectedPrescription.status === "dispensed"
                      ? "bg-teal-pale text-teal"
                      : "bg-amber-pale text-amber"
                  }`}
                >
                  {selectedPrescription.status === "dispensed"
                    ? (language === 'en' ? 'Dispensed' : 'مُصرفة')
                    : (language === 'en' ? 'Pending' : 'قيد الانتظار')}
                </span>
              </div>
            </div>

            {selectedPrescription.items && (
              <div className="mb-6">
                <h4 className="font-bold text-[14px] text-ink-soft mb-2">
                  {language === 'en' ? 'Prescribed Medications:' : 'الأدوية الموصوفة:'}
                </h4>
                <div className="bg-bg border border-mint-line rounded-xl overflow-hidden">
                  <table className="w-full text-right text-[13px]">
                    <thead className="bg-mint-bg/50 border-b border-mint-line text-ink-soft">
                      <tr>
                        <th className="py-2 px-3 font-semibold">{language === 'en' ? 'Medication' : 'الدواء'}</th>
                        <th className="py-2 px-3 font-semibold">{language === 'en' ? 'Dosage' : 'الجرعة'}</th>
                        <th className="py-2 px-3 font-semibold text-center">
                          {language === 'en' ? 'Quantity' : 'الكمية'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        try {
                          const itemsList =
                            typeof selectedPrescription.items === "string"
                              ? JSON.parse(selectedPrescription.items)
                              : selectedPrescription.items;
                          if (
                            !Array.isArray(itemsList) ||
                            itemsList.length === 0
                          ) {
                            return (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="py-3 text-center text-ink-soft"
                                >
                                  {language === 'en' ? 'No medications registered' : 'لا توجد أدوية مسجلة'}
                                </td>
                              </tr>
                            );
                          }
                          return itemsList.map((item: any, i: number) => (
                            <tr
                              key={i}
                              className="border-b border-mint-line/50 last:border-0"
                            >
                              <td className="py-2 px-3 font-bold">
                                {item.name || "-"}
                              </td>
                              <td className="py-2 px-3">
                                {item.dosage || "-"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold">
                                {item.qty || 1}
                              </td>
                            </tr>
                          ));
                        } catch (e) {
                          return (
                            <tr>
                              <td
                                colSpan={3}
                                className="py-3 text-center text-ink-soft"
                              >
                                {language === 'en' ? 'No medications registered' : 'لا توجد أدوية مسجلة'}
                              </td>
                            </tr>
                          );
                        }
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedPrescription(null)}
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              {language === 'en' ? 'Close' : 'إغلاق'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
