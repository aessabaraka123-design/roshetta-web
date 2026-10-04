"use client";



import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { exportInvoicePDF } from "@/utils/export";
import { useStore } from "@/store";
import toast from "react-hot-toast";
import { formatQty } from "@/utils/formatQty";

import { BoxIcon } from "@/components/icons";
import useSWR from "swr";
import RoshettaLogo from "@/components/RoshettaLogo";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Med {
  id: string;
  name: string;
  price: number;
  qty: number; // available stock
  branch_id: string;
}

interface CartItem extends Med {
  cartQty: number;
}

function POSContent() {
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const searchParams = useSearchParams();
  const editInvoiceId = searchParams?.get("edit");

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`
      : null,
    fetcher,
  );
  const meds = data?.inventory || [];

  const { data: pharmacyData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}`
      : null,
    fetcher,
  );
  const pharmacyName =
    pharmacyData?.pharmacy?.name || user?.pharmacyName || "صيدلية روشتة";
  const printerSize = pharmacyData?.pharmacy?.printerSize || "80mm";
  const showLogo =
    pharmacyData?.pharmacy?.showLogo !== undefined
      ? !!pharmacyData?.pharmacy?.showLogo
      : true;
  const receiptFooter =
    pharmacyData?.pharmacy?.receiptFooter || "نتمنى لكم دوام الصحة والعافية";
  const pharmacyPhone = pharmacyData?.pharmacy?.phone || "";

  const { data: customersData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/customers`
      : null,
    fetcher,
  );
  const customers = customersData?.customers || [];
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const { data: branchesData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/admin/pharmacies/${user.pharmacy_id}/branches`
      : null,
    fetcher,
  );
  const branches = branchesData?.branches || [];

  const {
    posCart: cart,
    addToPosCart,
    updatePosCartQty,
    clearPosCart,
    checkout,
  } = useStore();
  const [payMethod, setPayMethod] = useState("cash");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState("");
  const [prescriptionSearch, setPrescriptionSearch] = useState("");
  const [showPrescriptionDropdown, setShowPrescriptionDropdown] =
    useState(false);

  const { data: prescriptionsData } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/prescriptions`
      : null,
    fetcher,
  );
  const pendingPrescriptions = (prescriptionsData?.prescriptions || []).filter(
    (p: any) => p.status === "pending",
  );

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      if (user?.role !== "manager" && user?.branch) {
        setSelectedBranch(user.branch);
      } else {
        setSelectedBranch(branches[0].name);
      }
    }
  }, [branches, selectedBranch, user]);

  const total = cart.reduce(
    (acc, item) => acc + (item.unitPrice || item.price || 0) * item.cartQty,
    0,
  );

  const activeBranchObj = branches.find((b: any) => b.name === selectedBranch);
  const activeBranchId = activeBranchObj ? activeBranchObj.id : null;

  const branchMeds = meds.filter(
    (m: Med) =>
      !activeBranchId || !m.branch_id || m.branch_id === activeBranchId,
  );
  const filteredMeds = search.trim()
    ? branchMeds.filter(
        (m: Med) =>
          m.name?.includes(search) || (m as any).barcode?.includes(search),
      )
    : [];

  const [unitModal, setUnitModal] = useState<{
    visible: boolean;
    med: any;
    units: any[];
  }>({ visible: false, med: null, units: [] });

  const loadPrescription = (prx: any) => {
    setSelectedPrescriptionId(prx.id);
    setPrescriptionSearch(prx.id + (prx.patient ? ` - ${prx.patient}` : ""));
    setShowPrescriptionDropdown(false);

    if (prx.items) {
      try {
        const items =
          typeof prx.items === "string" ? JSON.parse(prx.items) : prx.items;
        items.forEach((item: any) => {
          const med = meds.find((m: any) => m.id === item.id);
          if (med) {
            const prescribedQty = item.qty || 1;
            for (let i = 0; i < prescribedQty; i++) {
              addToPosCart(med);
            }
          }
        });
        toast.success("تم إضافة أدوية الوصفة للسلة بنجاح");
      } catch (e) {
        toast.error("حدث خطأ في تحميل الأدوية");
      }
    }
  };

  const handleItemSelect = (med: any) => {
    // 1. Controlled Meds Check
    if (med.isControlled) {
      if (user?.role !== "manager" && !user?.controlledMedsAccess) {
        toast.error("عذراً، ليس لديك صلاحية لبيع الأدوية المراقبة (المخدرة)!");
        return;
      }
    }

    // 2. Fractional Units Check
    if (med.units) {
      try {
        const parsed = JSON.parse(med.units);
        if (parsed && parsed.length > 0) {
          const boxCount = parsed[0].count || 1;
          const unitsWithPrices = parsed.map((u: any) => ({
            ...u,
            price: med.price * ((u.count || 1) / boxCount),
          }));
          setUnitModal({ visible: true, med, units: unitsWithPrices });
          setSearch("");
          return;
        }
      } catch (e) {}
    }

    // Default Add
    setSearch("");
    addToPosCart(med);
  };

  const addToCartWithUnit = (med: any, unit: any) => {
    setUnitModal({ visible: false, med: null, units: [] });
    addToPosCart(med, unit);
  };

  const addToCart = (med: Med) => {
    handleItemSelect(med);
  };

  const changeQty = (cartItemId: string, delta: number) => {
    updatePosCartQty(cartItemId, delta);
  };

  const clearCart = () => clearPosCart();

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("السلة فارغة");
    if (payMethod === "credit" && !selectedCustomerId)
      return toast.error("يجب اختيار العميل عند الدفع بالآجل");

    setLoading(true);

    try {
      const selectedCustomer =
        customers.find((c: any) => c.id === selectedCustomerId) || null;

      const payloadItems = cart.map((item: any) => ({
        ...item,
        deductQty: item.cartQty * (item.unitCount || 1),
      }));

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user?.pharmacy_id}/sales`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: payloadItems,
            total,
            paymentMethod: payMethod,
            customer: selectedCustomer,
            cashierName: user?.managerName || "صيدلي 1",
            branchName: selectedBranch || "الرئيسي",
            prescriptionId: selectedPrescriptionId || undefined,
          }),
        },
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLastInvoice({
        id: data.saleId,
        date: new Date().toLocaleString("ar-EG"),
        total,
        items: [...cart],
        method: payMethod,
      });
      setShowReceipt(true);

      checkout(); // clear local cart
      setSelectedPrescriptionId("");
      setPrescriptionSearch("");
      mutate(); // refresh inventory qty from backend
      toast.success("تم إتمام البيع بنجاح!");
    } catch (error: any) {
      toast.error(`حدث خطأ أثناء حفظ الفاتورة: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full pb-10 print:hidden">
      {/* ===== TOP BAR ===== */}
      <AppBar
        title={editInvoiceId ? `تعديل الفاتورة ${editInvoiceId}` : "الكاشير"}
        showLogo={false}
        showNotifs={false}
      >
        <button className="w-[38px] h-[38px] rounded-full bg-card shadow-sm flex items-center justify-center hover:bg-bg transition-colors">
          <BoxIcon className="w-[20px] h-[20px] text-primary" />
        </button>
      </AppBar>

      {/* ===== BRANCH SELECTOR ===== */}
      {user?.role === "manager" && branches.length > 0 && (
        <div className="mb-4 bg-white p-3 rounded-xl border border-mint-line shadow-sm flex items-center justify-between">
          <span className="text-[14px] font-bold text-ink">فرع البيع:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-bg border border-mint-line rounded-lg px-3 py-1.5 text-[14px] focus:outline-none focus:border-primary font-bold text-primary"
          >
            {branches.map((b: any) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ===== TWO COLUMN LAYOUT ===== */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ===== LEFT: SEARCH + CART ===== */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Search Section */}
          <div className="bg-white rounded-2xl border border-mint-line shadow-sm p-4 space-y-3">
            <h3 className="text-[13px] font-bold text-ink-soft uppercase tracking-wide">
              🔍 إضافة دواء
            </h3>

            {/* Drug Search */}
            <div className="relative z-20">
              <SearchBar
                placeholder="امسح الباركود أو ابحث باسم الدواء..."
                value={search}
                onChange={setSearch}
              />
              {search && (
                <div className="absolute top-full left-0 right-0 bg-[#FDFAED] border border-mint-line shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto z-30">
                  {filteredMeds.length > 0 ? (
                    filteredMeds.map((med: any) => (
                      <div
                        key={med.id}
                        onClick={() => addToCart(med)}
                        className="p-3 border-b border-mint-line hover:bg-bg cursor-pointer flex justify-between items-center last:border-0"
                      >
                        <div>
                          <span className="font-bold text-ink block text-[14px]">
                            {med.name}
                          </span>
                          <span className="text-[12px] text-ink-soft mt-0.5 flex gap-1">
                            متوفر:{" "}
                            <span className="font-mono font-bold text-teal">
                              {formatQty(med.qty, med.units)}
                            </span>
                          </span>
                        </div>
                        <span className="font-mono text-primary font-bold text-[15px]">
                          {med.price || 0} ₪
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-ink-soft text-[14px]">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Prescription Search */}
            <div className="relative z-10">
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[18px]">
                  📋
                </span>
                <input
                  type="text"
                  placeholder="صرف وصفة: ابحث برقم الوصفة أو اسم المريض..."
                  value={prescriptionSearch}
                  onChange={(e) => {
                    setPrescriptionSearch(e.target.value);
                    setShowPrescriptionDropdown(true);
                    if (!e.target.value) setSelectedPrescriptionId("");
                  }}
                  onFocus={() => setShowPrescriptionDropdown(true)}
                  className={`w-full border rounded-xl pr-10 pl-4 py-3 text-[14px] focus:outline-none shadow-sm font-semibold transition-colors ${
                    selectedPrescriptionId
                      ? "bg-teal-pale border-teal text-teal"
                      : "bg-bg border-mint-line text-ink focus:border-primary"
                  }`}
                />
                {selectedPrescriptionId && (
                  <button
                    onClick={() => {
                      setSelectedPrescriptionId("");
                      setPrescriptionSearch("");
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 font-bold text-[11px] bg-white px-2 py-0.5 rounded-lg border border-red-200"
                  >
                    ✕ إلغاء
                  </button>
                )}
              </div>
              {showPrescriptionDropdown &&
                prescriptionSearch &&
                !selectedPrescriptionId && (
                  <div className="absolute top-full left-0 right-0 bg-[#FDFAED] border border-mint-line shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto z-20">
                    {pendingPrescriptions
                      .filter(
                        (p: any) =>
                          p.id.includes(prescriptionSearch.toUpperCase()) ||
                          (p.patient && p.patient.includes(prescriptionSearch)),
                      )
                      .map((prx: any) => (
                        <div
                          key={prx.id}
                          onClick={() => loadPrescription(prx)}
                          className="p-3 border-b border-mint-line hover:bg-bg cursor-pointer flex justify-between items-center last:border-0"
                        >
                          <div>
                            <span className="font-bold text-ink block font-mono text-[13px]">
                              {prx.id}
                            </span>
                            <span className="text-[12px] text-ink-soft">
                              المريض: {prx.patient || "غير محدد"}
                            </span>
                          </div>
                          <span className="text-[12px] bg-teal-pale text-teal px-2 py-1 rounded-lg font-bold">
                            صرف ▶
                          </span>
                        </div>
                      ))}
                    {pendingPrescriptions.filter(
                      (p: any) =>
                        p.id.includes(prescriptionSearch.toUpperCase()) ||
                        (p.patient && p.patient.includes(prescriptionSearch)),
                    ).length === 0 && (
                      <div className="p-4 text-center text-ink-soft text-[13px]">
                        لا توجد وصفات معلقة مطابقة
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-white rounded-2xl border border-mint-line shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-ink flex items-center gap-2">
                🛒 السلة{" "}
                <span className="bg-primary text-white text-[12px] px-2 py-0.5 rounded-full font-mono">
                  {cart.length}
                </span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[13px] text-red-400 font-semibold hover:text-red-600 transition-colors"
                >
                  تفريغ الكل
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto">
              {cart.map((item: any) => (
                <div
                  key={item.cartItemId}
                  className="flex items-center justify-between bg-bg rounded-xl px-4 py-3 border border-mint-line"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-ink truncate">
                      {item.displayName || item.name}
                    </h4>
                    <span className="text-[12px] text-ink-soft font-mono">
                      {(item.unitPrice || item.price || 0) * item.cartQty} ₪
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mr-3">
                    <button
                      onClick={() => changeQty(item.cartItemId, -1)}
                      className="w-[28px] h-[28px] rounded-full border border-mint-line bg-white text-primary text-[16px] font-bold flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                    >
                      −
                    </button>
                    <span className="font-mono font-bold text-[15px] w-[22px] text-center">
                      {item.cartQty}
                    </span>
                    <button
                      onClick={() => changeQty(item.cartItemId, 1)}
                      className="w-[28px] h-[28px] rounded-full border border-mint-line bg-white text-primary text-[16px] font-bold flex items-center justify-center hover:bg-teal-pale hover:border-teal transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-12 text-ink-soft text-[14px] border-2 border-dashed border-mint-line rounded-xl">
                  <div className="text-4xl mb-2">🛒</div>
                  السلة فارغة، ابحث عن دواء لإضافته
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== RIGHT: CHECKOUT PANEL ===== */}
        <div className="lg:w-[360px] flex flex-col gap-4">
          {/* Customer Selector */}
          <div className="bg-white rounded-2xl border border-mint-line shadow-sm p-4">
            <h3 className="text-[13px] font-bold text-ink-soft uppercase tracking-wide mb-3">
              👤 العميل{" "}
              {payMethod === "credit" ? (
                <span className="text-red-500">(إلزامي للآجل)</span>
              ) : (
                "(اختياري)"
              )}
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث بالاسم أو الجوال..."
                value={customerSearch}
                onFocus={() => setShowCustomerDropdown(true)}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  if (e.target.value === "") setSelectedCustomerId("");
                }}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 text-[14px] font-semibold text-ink focus:border-primary focus:outline-none"
              />
              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-mint-line rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {customers
                    .filter(
                      (c: any) =>
                        c.name.includes(customerSearch) ||
                        c.phone.includes(customerSearch),
                    )
                    .map((c: any) => (
                      <div
                        key={c.id}
                        className="p-3 hover:bg-bg cursor-pointer border-b border-mint-line last:border-0"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch(`${c.name} - ${c.phone}`);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <div className="font-bold text-[14px] text-ink">
                          {c.name}
                        </div>
                        <div className="font-mono text-[12px] text-ink-soft">
                          {c.phone}
                        </div>
                      </div>
                    ))}
                  {customers.filter(
                    (c: any) =>
                      c.name.includes(customerSearch) ||
                      c.phone.includes(customerSearch),
                  ).length === 0 && (
                    <div className="p-3 text-[13px] text-ink-soft text-center">
                      لا يوجد نتائج
                    </div>
                  )}
                </div>
              )}
            </div>
            {showCustomerDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCustomerDropdown(false)}
              />
            )}
          </div>

          {/* Payment Method + Total + Checkout — unified card */}
          <div className="bg-primary rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            {/* Payment methods — big stretched buttons */}
            <div>
              <p className="text-white/60 text-[12px] font-bold uppercase tracking-wide mb-3">
                طريقة السداد
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cash", label: "نقدي", icon: "💵" },
                  { id: "bank", label: "بنكي", icon: "🏦" },
                  { id: "jawwal", label: "جوال باي", icon: "📱" },
                  { id: "palpay", label: "بال باي", icon: "💳" },
                  { id: "maalchat", label: "مالتشات", icon: "💬" },
                  { id: "credit", label: "ذمم", icon: "📋" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPayMethod(method.id)}
                    className={`py-3 rounded-xl text-[14px] font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      payMethod === method.id
                        ? "bg-white border-white text-primary shadow-md"
                        : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    }`}
                  >
                    <span className="text-[18px]">{method.icon}</span>
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/20" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-[12px]">عدد الأصناف</p>
                <p className="text-white font-mono font-bold text-[16px]">
                  {cart.length} صنف
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-[12px]">الإجمالي</p>
                <p className="text-white font-mono font-black text-[28px] leading-none">
                  {total.toFixed(2)} <span className="text-[16px]">₪</span>
                </p>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              disabled={loading || cart.length === 0}
              onClick={handleCheckout}
              className="w-full bg-amber text-[#3A2607] border-none py-5 rounded-xl font-black text-[18px] cursor-pointer shadow-[0_6px_24px_rgba(242,169,59,0.5)] hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading
                ? "⏳ جاري المعالجة..."
                : cart.length === 0
                  ? "🛒 السلة فارغة"
                  : `✓ إتمام البيع — ${total.toFixed(2)} ₪`}
            </button>
          </div>
        </div>
      </div>

      {showReceipt && lastInvoice && (
        <div className="fixed inset-0 bg-ink/50 z-50 overflow-y-auto print:overflow-visible print:p-0 print:bg-white print:static print:block">
          <div className="min-h-screen py-10 flex flex-col items-center justify-center print:py-0 print:block">
            <div
              id="pos-receipt-content"
              className="bg-[#FDFAED] border border-mint-line shadow-[0_10px_40px_-15px_rgba(34,62,86,0.15)] p-5 font-mono text-ink relative mx-auto print:shadow-none print:border-none print:p-0 print:w-auto"
              style={{
                width: "100%",
                maxWidth: printerSize === "80mm" ? "320px" : "230px",
              }}
              dir="rtl"
            >
              <div
                className="absolute top-[-4px] left-0 right-0 h-[4px] bg-repeat-x print:hidden"
                style={{
                  backgroundImage:
                    "linear-gradient(-45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px), linear-gradient(45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px)",
                  backgroundSize: "8px 8px",
                }}
              ></div>

              {showLogo && (
                <div className="flex justify-center mt-2 mb-3">
                  <RoshettaLogo className="w-10 h-10" />
                </div>
              )}

              <div className="text-center mb-1">
                <h1 className="text-[18px] font-bold mb-1 text-ink">
                  {pharmacyName || ""}
                </h1>
                {activeBranchObj?.addr && (
                  <p className="text-[12px] text-ink-soft">{activeBranchObj.addr}</p>
                )}
                {pharmacyPhone && (
                  <p className="text-[12px] text-ink-soft">{pharmacyPhone}</p>
                )}
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="space-y-1.5 mb-1 px-1">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-ink-soft font-bold">رقم الفاتورة:</span>
                  <span className="text-ink font-bold font-mono text-[11px]">
                    {lastInvoice.id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-ink-soft font-bold">التاريخ:</span>
                  <span className="text-ink font-bold font-mono text-[11px]">
                    {lastInvoice.date}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-ink-soft font-bold">الموظف:</span>
                  <span className="text-ink font-bold">
                    {user?.managerName || user?.username || ""}
                  </span>
                </div>
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="flex text-[12px] font-bold text-ink-soft mb-3 px-1">
                <div className="flex-[2] text-right">الصنف</div>
                <div className="w-[40px] text-center">الكمية</div>
                <div className="flex-1 text-left">المجموع</div>
              </div>

              <div className="space-y-3 mb-1 px-1">
                {lastInvoice.items.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex text-[12px] text-ink items-center"
                  >
                    <div className="flex-[2] text-right font-bold truncate pr-1">
                      {item.displayName || item.name}
                    </div>
                    <div className="w-[40px] text-center font-mono">
                      {item.cartQty || item.qty || 1}
                    </div>
                    <div className="flex-1 text-left font-mono font-bold">
                      {(
                        Number(item.unitPrice || item.price || 0) *
                        Number(item.cartQty || item.qty || 1)
                      ).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[14px] font-bold text-ink">
                  الإجمالي الكلي
                </span>
                <span className="text-[18px] font-black text-ink">
                  {Number(lastInvoice.total || 0).toFixed(2)}{" "}
                  <span className="text-[14px]">₪</span>
                </span>
              </div>

              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[12px] font-bold text-ink-soft">
                  طريقة الدفع
                </span>
                <span className="text-[12px] font-bold text-ink font-mono">
                  {lastInvoice.method === "cash"
                    ? "نقدي"
                    : lastInvoice.method === "bank"
                      ? "بنكي"
                      : lastInvoice.method === "jawwal"
                        ? "جوال باي"
                        : lastInvoice.method === "palpay"
                          ? "بال باي"
                          : lastInvoice.method === "maalchat"
                            ? "مالتشات"
                            : lastInvoice.method === "credit"
                              ? "ذمم"
                              : "نقدي"}
                </span>
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="mt-2 text-[12px] text-center space-y-1">
                <p className="font-bold">
                  {receiptFooter || "نتمنى لكم دوام الصحة والعافية"}
                </p>
                {pharmacyPhone && (
                  <p className="font-mono text-ink-soft text-[13px]" dir="ltr">
                    ☎ {pharmacyPhone}
                  </p>
                )}
              </div>

              <div className="mt-5 flex justify-center opacity-80">
                <div className="flex h-[30px] items-center">
                  {[
                    4, 2, 2, 4, 2, 6, 2, 2, 4, 2, 2, 8, 2, 4, 4, 2, 6, 4, 2, 2,
                    8, 4, 2, 2, 6, 2, 2, 4,
                  ].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        width: w,
                        height: "100%",
                        backgroundColor: "#475569",
                        marginRight: 2,
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center justify-center gap-1 opacity-50 grayscale">
                <RoshettaLogo className="w-4 h-4" />
                <span className="text-[9px] font-bold text-[#475569]">
                  نظام روشتة لإدارة الصيدليات
                </span>
              </div>

              <div
                className="absolute bottom-[-4px] left-0 right-0 h-[4px] bg-repeat-x rotate-180 print:hidden"
                style={{
                  backgroundImage:
                    "linear-gradient(-45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px), linear-gradient(45deg, transparent 3px, #FDFAED 3px, #FDFAED 7px, transparent 7px)",
                  backgroundSize: "8px 8px",
                }}
              ></div>
            </div>
            {/* Actions (Hidden on Print) */}
            <div
              className="mt-8 flex gap-2 print:hidden w-full px-4"
              style={{ maxWidth: printerSize === "80mm" ? "320px" : "230px" }}
            >
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all text-sm"
              >
                طباعة حرارية
              </button>
              <button
                onClick={async () => {
                  const element = document.getElementById("pos-receipt-content");
                  if (!element) return;
                  
                  const widthMm = printerSize === "80mm" ? 80 : 58;

                  try {
                    // Use html2canvas and jsPDF directly to guarantee a single page of exact size
                    const html2canvas = (await import("html2canvas")).default;
                    const jsPDF = (await import("jspdf")).jsPDF;
                    
                    // Temporarily remove shadow and border for clean capture
                    const originalBoxShadow = element.style.boxShadow;
                    const originalBorder = element.style.border;
                    element.style.boxShadow = "none";
                    element.style.border = "none";
                    
                    const canvas = await html2canvas(element, { 
                      scale: 3, 
                      useCORS: true,
                      backgroundColor: "#FDFAED"
                    });
                    
                    // Restore styles
                    element.style.boxShadow = originalBoxShadow;
                    element.style.border = originalBorder;

                    const imgData = canvas.toDataURL("image/png");
                    
                    // Calculate exact height preserving aspect ratio
                    const heightMm = (canvas.height * widthMm) / canvas.width;
                    
                    // Create single page PDF
                    const pdf = new jsPDF("p", "mm", [widthMm, heightMm]);
                    pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
                    pdf.save(`invoice_${lastInvoice?.id || Date.now()}.pdf`);
                  } catch (err) {
                    console.error("PDF generation error", err);
                  }
                }}
                className="flex-1 py-3 bg-amber text-white font-bold rounded-xl hover:bg-amber/90 transition-all text-sm"
              >
                تصدير PDF
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {unitModal.visible && unitModal.med && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[18px] font-bold text-ink">
                اختر وحدة البيع
              </h3>
              <button
                onClick={() =>
                  setUnitModal({ visible: false, med: null, units: [] })
                }
                className="text-ink-soft hover:text-coral font-bold text-[24px]"
              >
                &times;
              </button>
            </div>
            <p className="text-[14px] text-ink-soft mb-6">
              الدواء{" "}
              <span className="font-bold text-teal">{unitModal.med.name}</span>{" "}
              يحتوي على أجزاء، كيف تود بيعه؟
            </p>
            <div className="flex flex-col gap-3">
              {unitModal.units.map((u, index) => (
                <button
                  key={index}
                  onClick={() => addToCartWithUnit(unitModal.med, u)}
                  className="flex justify-between items-center bg-bg border border-mint-line hover:border-primary hover:bg-teal-pale/20 transition-all p-4 rounded-xl"
                >
                  <span className="font-bold text-[16px] text-ink">
                    {u.name}
                  </span>
                  <span className="font-mono font-bold text-[16px] text-primary">
                    {Number(u.price).toFixed(2)} ₪
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function POS() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">جاري التحميل...</div>}>
      <POSContent />
    </Suspense>
  );
}
