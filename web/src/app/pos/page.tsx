"use client";



import { API_BASE_URL } from "@/lib/config";
import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import SearchBar from "@/components/SearchBar";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const language = useStore((state: any) => state.language);
  const user = useStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      const hasStored = typeof window !== "undefined" && localStorage.getItem("roshetta_user");
      if (!hasStored) {
        router.replace("/login");
      }
    }
  }, [user, router]);

  const searchParams = useSearchParams();
  const editInvoiceId = searchParams?.get("edit");

  const { data, mutate } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/inventory`
      : null,
    fetcher,
  );
  const meds = data?.inventory || [];

  const { data: pharmacyData } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}`
      : null,
    fetcher,
  );
  const pharmacyName =
    pharmacyData?.pharmacy?.name || user?.pharmacyName || (language === 'en' ? "Roshetta Pharmacy" : "صيدلية روشتة");
  const printerSize = pharmacyData?.pharmacy?.printerSize || "80mm";
  const showLogo =
    pharmacyData?.pharmacy?.showLogo !== undefined
      ? !!pharmacyData?.pharmacy?.showLogo
      : true;
  const receiptFooter =
    pharmacyData?.pharmacy?.receiptFooter || (language === 'en' ? "Wishing you good health and wellness" : "نتمنى لكم دوام الصحة والعافية");
  const pharmacyPhone = pharmacyData?.pharmacy?.phone || "";

  const { data: customersData } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/customers`
      : null,
    fetcher,
  );
  const customers = customersData?.customers || [];
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const { data: branchesData } = useSWR(
    user
      ? `${API_BASE_URL}/api/admin/pharmacies/${user.pharmacy_id}/branches`
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
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountVal, setDiscountVal] = useState("");
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  const { data: prescriptionsData } = useSWR(
    user
      ? `${API_BASE_URL}/api/pharmacies/${user.pharmacy_id}/prescriptions`
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

  const subtotal = cart.reduce(
    (acc, item) => acc + (item.unitPrice || item.price || 0) * item.cartQty,
    0,
  );
  const parsedDiscountNum = parseFloat(discountVal) || 0;
  const calculatedDiscount = discountType === "percent"
    ? (subtotal * Math.min(100, Math.max(0, parsedDiscountNum))) / 100
    : Math.min(subtotal, Math.max(0, parsedDiscountNum));

  const afterDiscount = Math.max(0, subtotal - calculatedDiscount);
  const enableVat = Boolean(pharmacyData?.pharmacy?.enableVat);
  const vatPercentage = Number(pharmacyData?.pharmacy?.vatPercentage) || 0;
  const vatAmount = (enableVat && vatPercentage > 0)
    ? (afterDiscount * (vatPercentage / 100))
    : 0;

  const total = afterDiscount + vatAmount;

  const activeBranchObj = branches.find((b: any) => b.name === selectedBranch);
  const activeBranchId = activeBranchObj ? activeBranchObj.id : null;

  const branchMeds = meds.filter(
    (m: Med) =>
      !activeBranchId || !m.branch_id || m.branch_id === activeBranchId,
  );
  const getCartQtyForMed = (medId: string) => {
    return cart.reduce((sum: number, ci: any) => {
      if (ci.id === medId) {
        return sum + (Number(ci.cartQty || 0) * Number(ci.unitCount || 1));
      }
      return sum;
    }, 0);
  };

  const filteredMeds = search.trim()
    ? (() => {
        const matched = branchMeds
          .filter(
            (m: Med) =>
              m.name?.includes(search) || (m as any).barcode?.includes(search),
          )
          .sort((a: any, b: any) => {
            const aIsOld = a.name?.includes("(القديم)");
            const bIsOld = b.name?.includes("(القديم)");
            if (aIsOld && !bIsOld && (a.qty || 0) > 0) return -1;
            if (!aIsOld && bIsOld && (b.qty || 0) > 0) return 1;
            return 0;
          });

        // FIFO barcode auto-selection: if exact barcode scan returns old+new twins:
        // 1. Try finding (القديم) if it has unsold stock not yet booked in cart
        const trimmed = search.trim();
        const exactBarcode = branchMeds.some((m: any) => (m as any).barcode === trimmed);
        if (exactBarcode) {
          const oldBatch = matched.find((m: any) => {
            if (!m.name?.includes("(القديم)")) return false;
            const inCart = getCartQtyForMed(m.id);
            return (m.qty || 0) > inCart;
          });
          if (oldBatch) return [oldBatch];

          // 2. If (القديم) is depleted or fully in cart, auto-transition to (الجديد)
          const newBatch = matched.find((m: any) => {
            if (!m.name?.includes("(الجديد)")) return false;
            const inCart = getCartQtyForMed(m.id);
            return (m.qty || 0) > inCart;
          });
          if (newBatch) return [newBatch];
        }
        return matched;
      })()
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
        toast.success(language === 'en' ? "Prescription medicines added to cart successfully" : "تم إضافة أدوية الوصفة للسلة بنجاح");
      } catch (e) {
        toast.error(language === 'en' ? "Error loading medicines" : "حدث خطأ في تحميل الأدوية");
      }
    }
  };

  const handleItemSelect = (med: any) => {
    // 0. Stock validation
    const medStock = Number(med.qty || 0);
    const inCartQty = getCartQtyForMed(med.id);
    if (medStock <= 0) {
      toast.error(
        language === 'en'
          ? `Product "${med.name}" is out of stock (Quantity: 0)!`
          : `عذراً، المنتج "${med.name}" نافذ من المخزون (الكمية 0) ولا يمكن بيعه!`
      );
      return;
    }
    if (inCartQty >= medStock) {
      toast.error(
        language === 'en'
          ? `Cannot add more. All available stock (${medStock}) is already in the cart!`
          : `لا يمكن إضافة المزيد. كامل الكمية المتوفرة بالمخزون (${medStock}) موجودة بالسلة!`
      );
      return;
    }

    // 1. Controlled Meds Check
    if (med.isControlled) {
      if (user?.role !== "manager" && !user?.controlledMedsAccess) {
        toast.error(language === 'en' ? "Sorry, you don't have permission to sell controlled medicines!" : "عذراً، ليس لديك صلاحية لبيع الأدوية المراقبة (المخدرة)!");
        return;
      }
    }

    // 2. Fractional Units Check
    if (med.units) {
      try {
        const parsed = JSON.parse(med.units);
        if (parsed && parsed.length > 0) {
          const boxCount = parsed[0].count || 1;
          const baseCost = med.cost != null ? Number(med.cost) : (Number(med.price || 0) * 0.7);
          const unitsWithPrices = parsed.map((u: any) => {
            const ratio = (u.count || 1) / boxCount;
            return {
              ...u,
              ratio,
              price: med.price * ratio,
              cost: baseCost * ratio,
            };
          });
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
    const medStock = Number(med.qty || 0);
    const inCartQty = getCartQtyForMed(med.id);
    const neededCount = Number(unit.count || 1);
    if (inCartQty + neededCount > medStock) {
      toast.error(
        language === 'en'
          ? `Insufficient stock for unit "${unit.name}". Available: ${Math.max(0, medStock - inCartQty)} units!`
          : `الكمية المتبقية لا تكفي لاختيار وحدة "${unit.name}". المتبقي: ${Math.max(0, medStock - inCartQty)} وحدة فقط!`
      );
      return;
    }
    setUnitModal({ visible: false, med: null, units: [] });
    addToPosCart(med, unit);
  };

  const addToCart = (med: Med) => {
    const medAny = med as any;
    const cleanBaseName = (medAny.name || "")
      .replace(/\s*\(القديم\)|\s*\(الجديد\)|\s*\(دفعة قديمة\)|\s*\(دفعة جديدة\)/g, "")
      .trim();

    // Find siblings by barcode or clean name
    const oldSibling = branchMeds.find(
      (m: any) =>
        m.name?.includes("(القديم)") &&
        (m.barcode === medAny.barcode || (m.name || "").replace(/\s*\(القديم\)|\s*\(الجديد\)/g, "").trim() === cleanBaseName)
    );
    const newSibling = branchMeds.find(
      (m: any) =>
        m.name?.includes("(الجديد)") &&
        (m.barcode === medAny.barcode || (m.name || "").replace(/\s*\(القديم\)|\s*\(الجديد\)/g, "").trim() === cleanBaseName)
    );

    // If there is an old batch:
    if (oldSibling) {
      const oldStock = Number(oldSibling.qty || 0);
      const oldInCart = getCartQtyForMed(oldSibling.id);

      // Sell from old batch first if there is stock remaining
      if (oldStock > oldInCart) {
        handleItemSelect(oldSibling as Med);
        return;
      }

      // If old batch is already full in the cart (or out of stock) and new batch exists:
      if (newSibling) {
        const newStock = Number(newSibling.qty || 0);
        const newInCart = getCartQtyForMed(newSibling.id);
        if (newStock > newInCart) {
          toast(
            language === 'en'
              ? `Old batch depleted (${oldStock} max). Added 1 from new batch.`
              : `تم استنفاد كامل رصيد الدفعة القديمة (${oldStock} علبة). تم التحويل تلقائياً للدفعة الجديدة بالسعر الجديد.`,
            { icon: '✨', duration: 4000 }
          );
          handleItemSelect(newSibling as Med);
          return;
        }
      }
    }

    // Direct stock check for med
    const medStock = Number(medAny.qty || 0);
    const inCartQty = getCartQtyForMed(medAny.id);
    if (medStock <= 0) {
      toast.error(
        language === 'en'
          ? `Product "${medAny.name}" is out of stock (Quantity: 0)!`
          : `عذراً، المنتج "${medAny.name}" نافذ من المخزون (الكمية 0) ولا يمكن بيعه!`
      );
      return;
    }
    if (inCartQty >= medStock) {
      toast.error(
        language === 'en'
          ? `Cannot add more. Available stock is only ${medStock}!`
          : `لا يمكن إضافة المزيد. المتوفر بالمخزون هو ${medStock} فقط!`
      );
      return;
    }

    handleItemSelect(med);
  };

  const changeQty = (cartItemId: string, delta: number) => {
    if (delta > 0) {
      const cartItem = cart.find((ci: any) => ci.cartItemId === cartItemId);
      if (cartItem) {
        const medStock = Number(cartItem.qty || 0);
        const unitCount = Number(cartItem.unitCount || 1);
        const inCartForThisMed = getCartQtyForMed(cartItem.id);

        if (inCartForThisMed + unitCount > medStock) {
          toast.error(
            language === 'en'
              ? `Cannot exceed available stock (${medStock})!`
              : `لا يمكن تجاوز الكمية المتوفرة بالمخزون (${medStock})!`
          );
          return;
        }

        if (cartItem.name?.includes("(القديم)")) {
          const oldStock = Number(cartItem.qty || 0);
          const inCart = Number(cartItem.cartQty || 0) * Number(cartItem.unitCount || 1);

          if (inCart >= oldStock) {
            const cleanBaseName = (cartItem.name || "")
              .replace(/\s*\(القديم\)|\s*\(الجديد\)|\s*\(دفعة قديمة\)|\s*\(دفعة جديدة\)/g, "")
              .trim();
            const newSibling = branchMeds.find(
              (m: any) =>
                m.name?.includes("(الجديد)") &&
                (m.barcode === cartItem.barcode || (m.name || "").replace(/\s*\(القديم\)|\s*\(الجديد\)/g, "").trim() === cleanBaseName)
            );

            if (newSibling) {
              const newStock = Number(newSibling.qty || 0);
              const newInCart = getCartQtyForMed(newSibling.id);
              if (newStock > newInCart) {
                toast(
                  language === 'en'
                    ? `Old batch max reached (${oldStock} max). Added 1 from new batch.`
                    : `تم استنفاد رصيد الدفعة القديمة (${oldStock} علبة). تم إضافة علبة من الدفعة الجديدة بالسعر الجديد.`,
                  { icon: '✨', duration: 4000 }
                );
                handleItemSelect(newSibling as Med);
                return;
              }
            }
          }
        }
      }
    }
    updatePosCartQty(cartItemId, delta);
  };

  const clearCart = () => clearPosCart();

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error(language === 'en' ? "Cart is empty" : "السلة فارغة");
    if (payMethod === "credit" && !selectedCustomerId)
      return toast.error(language === 'en' ? "Customer must be selected for credit payment" : "يجب اختيار العميل عند الدفع بالآجل");

    // Strictly validate available stock before processing payment
    for (const item of cart) {
      const medStock = Number(item.qty || 0);
      const totalNeeded = getCartQtyForMed(item.id);
      if (medStock <= 0) {
        toast.error(
          language === 'en'
            ? `Product "${item.name}" is out of stock (Quantity: 0)! Please remove it.`
            : `المنتج "${item.name}" نافذ من المخزون (الكمية 0)! يرجى حذفه من السلة لإتمام البيع.`
        );
        return;
      }
      if (totalNeeded > medStock) {
        toast.error(
          language === 'en'
            ? `Quantity for "${item.name}" (${totalNeeded}) exceeds available stock (${medStock})!`
            : `الكمية المطلوبة من "${item.name}" (${totalNeeded}) تتجاوز المتوفر بالمخزون (${medStock})!`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const selectedCustomer =
        customers.find((c: any) => c.id === selectedCustomerId) || null;

      const payloadItems = cart.map((item: any) => ({
        ...item,
        deductQty: item.cartQty * (item.unitCount || 1),
      }));

      const res = await fetch(
        `${API_BASE_URL}/api/pharmacies/${user?.pharmacy_id}/sales`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: payloadItems,
            total,
            discount: calculatedDiscount,
            vatAmount,
            subtotal,
            paymentMethod: payMethod,
            customer: selectedCustomer,
            cashierName: user?.managerName || (language === 'en' ? "Pharmacist 1" : "صيدلي 1"),
            branchName: selectedBranch || (language === 'en' ? "Main" : "الرئيسي"),
            prescriptionId: selectedPrescriptionId || undefined,
          }),
        },
      );

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLastInvoice({
        id: data.saleId,
        date: new Date().toLocaleString(language === 'en' ? "en-US" : language === "en" ? "en-US" : "ar-EG"),
        total,
        discount: calculatedDiscount,
        vatAmount,
        subtotal,
        items: [...cart],
        method: payMethod,
      });
      setShowReceipt(true);

      checkout(); // clear local cart
      setSelectedPrescriptionId("");
      setPrescriptionSearch("");
      setDiscountVal("");
      setShowDiscountInput(false);
      mutate(); // refresh inventory qty from backend
      toast.success(language === 'en' ? "Sale completed successfully!" : "تم إتمام البيع بنجاح!");
    } catch (error: any) {
      toast.error(language === 'en' ? `Error saving invoice: ${error.message}` : `حدث خطأ أثناء حفظ الفاتورة: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const printThermalReceipt = () => {
    const content = document.getElementById("pos-receipt-content");
    if (!content) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const clone = content.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".print\\:hidden").forEach((el) => el.remove());

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>Receipt ${lastInvoice?.id || ""}</title>
        <style>
          @page {
            size: ${printerSize === "80mm" ? "80mm" : "58mm"} auto;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 6px;
            background-color: #FDFAED;
            color: #1C2733;
            font-family: Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        ${clone.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1500);
      }
    }, 250);
  };

  const generateReceiptPDF = async () => {
    const element = document.getElementById("pos-receipt-content");
    if (!element) return;
    const widthMm = printerSize === "80mm" ? 80 : 58;
    const loadingToast = toast.loading(
      language === "en" ? "Generating PDF receipt..." : "جاري إنشاء إيصال PDF..."
    );

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const clone = element.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".print\\:hidden").forEach((el) => el.remove());
      clone.style.boxShadow = "none";
      clone.style.border = "none";
      clone.style.margin = "0";

      await html2pdf()
        .set({
          margin: 3,
          filename: `receipt_${lastInvoice?.id || Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#FDFAED",
            logging: false,
          },
          jsPDF: {
            unit: "mm",
            format: [widthMm, (clone.offsetHeight * widthMm) / (clone.offsetWidth || 300) + 12],
            orientation: "portrait",
          },
        })
        .from(clone)
        .save();

      toast.success(
        language === "en" ? "PDF receipt downloaded successfully!" : "تم تحميل إيصال PDF بنجاح!",
        { id: loadingToast }
      );
    } catch (err: any) {
      console.error("html2pdf failed, fallback to jsPDF:", err);
      try {
        const html2canvas = (await import("html2canvas")).default;
        const jsPDF = (await import("jspdf")).jsPDF;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FDFAED",
          ignoreElements: (el) => el.classList?.contains("print:hidden"),
        });
        const imgData = canvas.toDataURL("image/png");
        const heightMm = (canvas.height * widthMm) / canvas.width;
        const pdf = new jsPDF("p", "mm", [widthMm, heightMm]);
        pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);
        pdf.save(`receipt_${lastInvoice?.id || Date.now()}.pdf`);
        toast.success(
          language === "en" ? "PDF receipt downloaded successfully!" : "تم تحميل إيصال PDF بنجاح!",
          { id: loadingToast }
        );
      } catch (fallbackErr: any) {
        toast.error(
          language === "en"
            ? `Failed to generate PDF: ${fallbackErr.message || "Unknown error"}`
            : `تعذر إنشاء PDF: ${fallbackErr.message || "حدث خطأ"}`,
          { id: loadingToast }
        );
      }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: ${printerSize === "80mm" ? "80mm" : "58mm"} auto;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
      <div className="w-full pb-10 print:hidden">
      {/* ===== TOP BAR ===== */}
      <AppBar
        title={editInvoiceId ? (language === 'en' ? `Edit Invoice ${editInvoiceId}` : `تعديل الفاتورة ${editInvoiceId}`) : (language === 'en' ? "Cashier" : "الكاشير")}
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
          <span className="text-[14px] font-bold text-ink">{language === 'en' ? "Sale Branch:" : "فرع البيع:"}</span>
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
              🔍 {language === 'en' ? "Add Medicine" : "إضافة دواء"}
            </h3>

            {/* Drug Search */}
            <div className="relative z-20">
              <SearchBar
                placeholder={language === 'en' ? "Scan barcode or search by medicine name..." : "امسح الباركود أو ابحث باسم الدواء..."}
                value={search}
                onChange={setSearch}
              />
              {search && (
                <div className="absolute top-full left-0 right-0 bg-[#FDFAED] border border-mint-line shadow-xl rounded-xl mt-1 max-h-60 overflow-y-auto z-30">
                  {filteredMeds.length > 0 ? (
                    filteredMeds.map((med: any) => {
                      const isOutOfStock = Number(med.qty || 0) <= 0;
                      return (
                        <div
                          key={med.id}
                          onClick={() => {
                            if (isOutOfStock) {
                              toast.error(
                                language === 'en'
                                  ? `"${med.name}" is out of stock (Quantity: 0)!`
                                  : `عذراً، المنتج "${med.name}" نفذ من المخزون (الكمية 0) ولا يمكن بيعه!`
                              );
                              return;
                            }
                            addToCart(med);
                          }}
                          className={`p-3 border-b border-mint-line flex justify-between items-center last:border-0 transition-colors ${
                            isOutOfStock
                              ? "bg-slate-50 opacity-60 cursor-not-allowed"
                              : "hover:bg-bg cursor-pointer"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold block text-[14px] ${isOutOfStock ? "text-slate-400 line-through" : "text-ink"}`}>
                                {med.name}
                              </span>
                              {isOutOfStock && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold border border-rose-300">
                                  🚫 {language === 'en' ? 'Out of Stock' : 'نفذ من المخزون'}
                                </span>
                              )}
                              {med.name?.includes("(القديم)") && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                                  🏷️ {language === 'en' ? 'Old' : 'القديم'}
                                </span>
                              )}
                              {med.name?.includes("(الجديد)") && (
                                <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold border border-teal-300">
                                  ✨ {language === 'en' ? 'New' : 'الجديد'}
                                </span>
                              )}
                            </div>
                            <span className="text-[12px] text-ink-soft mt-0.5 flex gap-1">
                              {language === 'en' ? "Available:" : "متوفر:"}{" "}
                              <span className={`font-mono font-bold ${isOutOfStock ? "text-rose-600" : "text-teal"}`}>
                                {formatQty(med.qty, med.units, language)}
                              </span>
                            </span>
                          </div>
                          <span className={`font-mono font-bold text-[15px] ${isOutOfStock ? "text-slate-400" : "text-primary"}`}>
                            {med.price || 0} ₪
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-ink-soft text-[14px]">
                      {language === 'en' ? "No results" : "لا توجد نتائج"}
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
                  placeholder={language === 'en' ? "Dispense prescription: Search by prescription number or patient name..." : "صرف وصفة: ابحث برقم الوصفة أو اسم المريض..."}
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
                    ✕ {language === 'en' ? "Cancel" : "إلغاء"}
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
                              {language === 'en' ? "Patient: " : "المريض: "}{prx.patient || (language === 'en' ? "Not specified" : "غير محدد")}
                            </span>
                          </div>
                          <span className="text-[12px] bg-teal-pale text-teal px-2 py-1 rounded-lg font-bold">
                            {language === 'en' ? "Dispense ▶" : "صرف ▶"}
                          </span>
                        </div>
                      ))}
                    {pendingPrescriptions.filter(
                      (p: any) =>
                        p.id.includes(prescriptionSearch.toUpperCase()) ||
                        (p.patient && p.patient.includes(prescriptionSearch)),
                    ).length === 0 && (
                      <div className="p-4 text-center text-ink-soft text-[13px]">
                        {language === 'en' ? "No matching pending prescriptions" : "لا توجد وصفات معلقة مطابقة"}
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
                🛒 {language === 'en' ? "Cart" : "السلة"}{" "}
                <span className="bg-primary text-white text-[12px] px-2 py-0.5 rounded-full font-mono">
                  {cart.length}
                </span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[13px] text-red-400 font-semibold hover:text-red-600 transition-colors"
                >
                  {language === 'en' ? "Clear All" : "تفريغ الكل"}
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
                  {language === 'en' ? "Cart is empty, search for a medicine to add" : "السلة فارغة، ابحث عن دواء لإضافته"}
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
              👤 {language === 'en' ? "Customer " : "العميل "}
              {payMethod === "credit" ? (
                <span className="text-red-500">{language === 'en' ? "(Required for credit)" : "(إلزامي للآجل)"}</span>
              ) : (
                language === 'en' ? "(Optional)" : "(اختياري)"
              )}
            </h3>
            <div className="relative">
              <input
                type="text"
                placeholder={language === 'en' ? "Search by name or mobile..." : "ابحث بالاسم أو الجوال..."}
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
                      {language === 'en' ? "No results" : "لا يوجد نتائج"}
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
                {language === 'en' ? "Payment Method" : "طريقة السداد"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cash", label: language === 'en' ? "Cash" : "نقدي", icon: "💵" },
                  { id: "bank", label: language === 'en' ? "Bank" : "بنكي", icon: "🏦" },
                  { id: "jawwal", label: language === 'en' ? "Jawwal Pay" : "جوال باي", icon: "📱" },
                  { id: "palpay", label: language === 'en' ? "PalPay" : "بال باي", icon: "💳" },
                  { id: "maalchat", label: language === 'en' ? "Maalchat" : "مالتشات", icon: "💬" },
                  { id: "credit", label: language === 'en' ? "Credit" : "ذمم", icon: "📋" },
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

            {/* Discount & VAT Section */}
            <div className="bg-white/10 rounded-xl p-3 border border-white/20 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-[13px] font-bold text-amber hover:underline flex items-center gap-1"
                >
                  <span>🏷️</span>
                  <span>
                    {calculatedDiscount > 0
                      ? `${language === 'en' ? 'Discount:' : 'الخصم:'} -${calculatedDiscount.toFixed(2)} ₪`
                      : showDiscountInput
                        ? (language === 'en' ? 'Hide Discount' : 'إخفاء الخصم')
                        : (language === 'en' ? '+ Add Discount' : '+ إضافة خصم')}
                  </span>
                </button>
                {calculatedDiscount > 0 && !showDiscountInput && (
                  <button
                    type="button"
                    onClick={() => setDiscountVal("")}
                    className="text-white/60 hover:text-white text-[12px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showDiscountInput && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex bg-white/20 rounded-lg p-0.5 border border-white/20">
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-bold transition-all ${discountType === "fixed" ? "bg-white text-primary shadow-sm" : "text-white"}`}
                    >
                      ₪
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-bold transition-all ${discountType === "percent" ? "bg-white text-primary shadow-sm" : "text-white"}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={discountType === "percent" ? "10%" : "0.00 ₪"}
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    className="flex-1 bg-white text-ink text-[13px] font-bold rounded-lg px-3 py-1.5 outline-none"
                  />
                  {discountVal && (
                    <button
                      type="button"
                      onClick={() => setDiscountVal("")}
                      className="text-white/80 hover:text-white text-[14px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {(calculatedDiscount > 0 || (enableVat && vatAmount > 0)) && (
                <div className="border-t border-white/10 pt-2 space-y-1 text-[12px]">
                  <div className="flex justify-between text-white/70">
                    <span>{language === 'en' ? 'Subtotal:' : 'المجموع قبل الخصم:'}</span>
                    <span className="font-mono">₪{subtotal.toFixed(2)}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between text-amber font-bold">
                      <span>{language === 'en' ? 'Discount:' : 'الخصم:'}</span>
                      <span className="font-mono">-₪{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {enableVat && vatAmount > 0 && (
                    <div className="flex justify-between text-white/90">
                      <span>{language === 'en' ? `VAT (${vatPercentage}%):` : `ضريبة القيمة المضافة (${vatPercentage}%):`}</span>
                      <span className="font-mono">+₪{vatAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-[12px]">{language === 'en' ? "Items Count" : "عدد الأصناف"}</p>
                <p className="text-white font-mono font-bold text-[16px]">
                  {cart.length} {language === 'en' ? "item(s)" : "صنف"}
                </p>
              </div>
              <div className="text-start">
                <p className="text-white/60 text-[12px]">{language === 'en' ? "Total" : "الإجمالي"}</p>
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
                ? (language === 'en' ? "⏳ Processing..." : "⏳ جاري المعالجة...")
                : cart.length === 0
                  ? (language === 'en' ? "🛒 Cart is empty" : "🛒 السلة فارغة")
                  : (language === 'en' ? `✓ Complete Sale — ${total.toFixed(2)} ₪` : `✓ إتمام البيع — ${total.toFixed(2)} ₪`)}
            </button>
          </div>
        </div>
      </div>
    </div>

      {showReceipt && lastInvoice && (
        <div className="fixed inset-0 bg-ink/50 z-50 overflow-y-auto print:overflow-visible print:p-0 print:bg-white print:static print:block">
          <div className="min-h-screen py-10 flex flex-col items-center justify-center print:py-0 print:block">
            <div
              id="pos-receipt-content"
              className="bg-[#FDFAED] border border-mint-line shadow-[0_10px_40px_-15px_rgba(34,62,86,0.15)] p-5 text-ink relative mx-auto print:shadow-none print:border-none print:p-0 print:w-auto font-sans"
              style={{
                width: "100%",
                maxWidth: printerSize === "80mm" ? "320px" : "230px",
                fontFamily: "var(--font-cairo), Cairo, system-ui, -apple-system, sans-serif",
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
                  <span className="text-ink-soft font-bold">{language === 'en' ? "Invoice No:" : "رقم الفاتورة:"}</span>
                  <span className="text-ink font-bold font-mono text-[12px]" dir="ltr">
                    {lastInvoice.id}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-ink-soft font-bold">{language === 'en' ? "Date:" : "التاريخ:"}</span>
                  <span className="text-ink font-bold font-mono text-[11px]" dir="ltr">
                    {lastInvoice.date}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-ink-soft font-bold">{language === 'en' ? "Employee:" : "الموظف:"}</span>
                  <span className="text-ink font-bold">
                    {user?.managerName || user?.username || ""}
                  </span>
                </div>
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="flex text-[12px] font-bold text-ink-soft mb-2 px-1 border-b border-dashed border-[#94A3B8]/40 pb-1.5">
                <div className="flex-1 text-start min-w-0 pr-1 pl-1">{language === 'en' ? "Item" : "الصنف"}</div>
                <div className="w-[45px] text-center shrink-0">{language === 'en' ? "Qty" : "الكمية"}</div>
                <div className="w-[65px] text-end shrink-0">{language === 'en' ? "Total" : "المجموع"}</div>
              </div>

              <div className="space-y-2 mb-1 px-1">
                {lastInvoice.items.map((item: any, i: number) => {
                  const cleanName = (item.displayName || item.name || "")
                    .replace(/\s*\(القديم\)|\s*\(الجديد\)|\s*\(دفعة قديمة\)|\s*\(دفعة جديدة\)/g, "")
                    .trim();
                  const qty = item.cartQty || item.qty || 1;
                  const unitPrice = Number(item.unitPrice || item.price || 0);
                  const rowTotal = (unitPrice * Number(qty)).toFixed(2);

                  return (
                    <div
                      key={i}
                      className="flex text-[12px] text-ink items-start py-1 border-b border-dashed border-[#94A3B8]/20 last:border-0"
                    >
                      <div className="flex-1 text-start font-bold leading-snug break-words pr-1 pl-1 min-w-0">
                        <bdi dir="auto">{cleanName}</bdi>
                      </div>
                      <div className="w-[45px] text-center font-mono shrink-0 pt-0.5">
                        {qty}
                      </div>
                      <div className="w-[65px] text-end font-mono font-bold shrink-0 pt-0.5">
                        {rowTotal}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-[#94A3B8] tracking-widest my-3">
                - - - - - - - - - - - - - - - - - - - - - -
              </div>

              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[14px] font-bold text-ink">
                  {language === 'en' ? "Grand Total" : "الإجمالي الكلي"}
                </span>
                <span className="text-[18px] font-black text-ink font-mono">
                  {Number(lastInvoice.total || 0).toFixed(2)}{" "}
                  <span className="text-[14px] font-sans">₪</span>
                </span>
              </div>

              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-[12px] font-bold text-ink-soft">
                  {language === 'en' ? "Payment Method" : "طريقة الدفع"}
                </span>
                <span className="text-[12px] font-bold text-ink font-mono">
                  {lastInvoice.method === "cash"
                    ? (language === 'en' ? "Cash" : "نقدي")
                    : lastInvoice.method === "bank"
                      ? (language === 'en' ? "Bank" : "بنكي")
                      : lastInvoice.method === "jawwal"
                        ? (language === 'en' ? "Jawwal Pay" : "جوال باي")
                        : lastInvoice.method === "palpay"
                          ? (language === 'en' ? "PalPay" : "بال باي")
                          : lastInvoice.method === "maalchat"
                            ? (language === 'en' ? "Maalchat" : "مالتشات")
                            : lastInvoice.method === "credit"
                              ? (language === 'en' ? "Credit" : "ذمم")
                              : (language === 'en' ? "Cash" : "نقدي")}
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
                  {language === 'en' ? "Roshetta Pharmacy Management System" : "نظام روشتة لإدارة الصيدليات"}
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
              className="mt-8 flex flex-row flex-wrap gap-2 justify-center print:hidden w-full px-4"
              style={{ maxWidth: "500px" }}
            >
              <button
                onClick={printThermalReceipt}
                className="flex-1 min-w-[100px] py-3 bg-primary text-white font-bold rounded-xl hover:bg-teal transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>{language === 'en' ? "Thermal Print" : "طباعة حرارية"}</span>
              </button>
              
              <button
                onClick={generateReceiptPDF}
                className="flex-1 min-w-[100px] py-3 bg-amber text-white font-bold rounded-xl hover:bg-amber/90 transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{language === 'en' ? "PDF Receipt" : "إيصال PDF"}</span>
              </button>
              

              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 min-w-[100px] py-3 bg-bg text-ink-soft font-bold rounded-xl hover:bg-mint-line transition-all text-sm"
              >
                {language === 'en' ? "Close" : "إغلاق"}
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
                {language === 'en' ? "Select Selling Unit" : "اختر وحدة البيع"}
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
              {language === 'en' ? "Medicine " : "الدواء "}
              <span className="font-bold text-teal">{unitModal.med.name}</span>{" "}
              {language === 'en' ? "has fractions, how would you like to sell it?" : "يحتوي على أجزاء، كيف تود بيعه؟"}
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
    </>
  );
}


export default function POS() {
  const language = useStore((state: any) => state.language);
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">{language === 'en' ? "Loading..." : "جاري التحميل..."}</div>}>
      <POSContent />
    </Suspense>
  );
}
