"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import RoshettaLogo from "@/components/RoshettaLogo";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ReceiptUpload() {
  const router = useRouter();
  const user = useStore((state) => state.user);
  const language = useStore((state: any) => state.language);

  const [payMethod, setPayMethod] = useState<"bank" | "palpay" | "jawwal">(
    "bank",
  );
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [transferName, setTransferName] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('plan');
      if (p) setPlan(p);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    // Allow active users to upload a receipt for renewal
    // if (!user.isReadOnly) {
    //   router.push("/");
    //   return;
    // }

    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
        "/api/admin/settings",
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAdminSettings(d.settings);
      });

    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
        "/api/subscription-plans",
    )
      .then((r) => r.json())
      .then((data) => {
        const rawPlans = data.plans || (Array.isArray(data) ? data : []);
        setPlans(
          rawPlans.map((p: any) => ({
            ...p,
            id: String(p.id || p.type),
            name: p.name,
            price: p.price ?? 0,
          })),
        );
        if (rawPlans.length > 0) {
          setPlan(String(rawPlans[0].id || rawPlans[0].type));
        }
      })
      .catch((err) => console.error("Error fetching plans", err));
  }, [user, router]);

  const handleSubmit = async () => {
    if (!receiptImage) {
      toast.error(language === 'en' ? "Please upload the receipt image first" : "الرجاء رفع صورة الإيصال أولاً");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user!.pharmacy_id}/subscription-request`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptImage,
            paymentMethod: payMethod,
            transferName,
            transferRef,
            plan,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        toast.success(language === 'en' ? "✅ Receipt sent successfully! It will be reviewed shortly." : "✅ تم إرسال الإيصال بنجاح! سيتم مراجعته قريباً.");
        router.push("/");
      } else {
        toast.error(data.error || (language === 'en' ? "Something went wrong" : "حدث خطأ ما"));
      }
    } catch {
      toast.error(language === 'en' ? "Failed to connect to the server" : "فشل الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    :root {
      --deep:#223E56; --sage:#6FA3C9; --mint-bg:#EFF5FA; --paper:#FBFCFE;
      --line:#DCE7EF; --ink:#1C2733; --ink-soft:#5B6A78;
      --shadow: 0 20px 45px -20px rgba(34,62,86,.25);
    }
    * { box-sizing: border-box; }
    .page { min-height:100vh; padding: 48px 20px 80px; font-family:'Cairo',sans-serif; color:var(--ink); }
    .wrap { max-width:520px; margin:0 auto; }
    .logo-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:40px; }
    .card { background:var(--paper); border:1px solid var(--line); border-radius:24px; padding:32px; box-shadow:var(--shadow); }
    .title { font-size:22px; font-weight:900; color:var(--deep); margin-bottom:6px; }
    .sub { font-size:13px; color:var(--ink-soft); margin-bottom:24px; line-height:1.7; }
    .method-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:20px; }
    .method-btn { padding:14px 8px; border-radius:14px; border:2px solid var(--line); background:#fff; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; font-family:'Cairo',sans-serif; font-weight:700; font-size:13px; color:var(--deep); transition:.2s; }
    .method-btn.active { border-color:var(--sage); background:var(--mint-bg); }
    .info-box { background:var(--mint-bg); border:1px solid var(--line); border-radius:14px; padding:14px 16px; margin-bottom:20px; font-size:13px; color:var(--ink-soft); display:flex; flex-direction:column; gap:5px; }
    .info-row { display:flex; align-items:center; gap:8px; justify-content:flex-start; }
    .info-row strong { color:var(--deep); font-weight:700; white-space:nowrap; }
    .info-row span { color:var(--ink-soft); text-align:left; }
    .field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .field label { font-size:13px; font-weight:700; color:var(--deep); }
    .field input { border:1.5px solid var(--line); border-radius:10px; padding:10px 14px; font-size:14px; font-family:'Cairo',sans-serif; outline:none; background:#fff; transition:.2s; }
    .field input:focus { border-color:var(--sage); }
    .upload-box { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border:2px dashed var(--line); border-radius:16px; padding:28px 20px; cursor:pointer; background:#fff; transition:.2s; margin-bottom:20px; text-align:center; }
    .upload-box:hover { border-color:var(--sage); background:var(--mint-bg); }
    .upload-box.has-image { border-color:#34d399; background:#f0fdf4; }
    .upload-icon { font-size:32px; }
    .upload-text { font-size:14px; font-weight:700; color:var(--deep); }
    .upload-sub { font-size:12px; color:var(--ink-soft); }
    .preview-img { width:100%; max-height:160px; object-fit:contain; border-radius:10px; margin-top:8px; }
    .submit-btn { width:100%; padding:14px; border-radius:14px; border:none; background:linear-gradient(135deg,#2B516E,#223E56); color:#fff; font-size:16px; font-weight:800; font-family:'Cairo',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:.2s; }
    .submit-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 20px rgba(34,62,86,.3); }
    .submit-btn:disabled { opacity:.65; cursor:not-allowed; }
    .back-link { font-size:13px; font-weight:700; color:var(--ink-soft); text-decoration:none; display:inline-flex; align-items:center; gap:5px; }
    .back-link:hover { color:var(--deep); }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="wrap">
          {/* Header */}
          <div className="logo-row">
            <RoshettaLogo />
            <Link href="/" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                <path
                  d="M19 12H5M13 18l6-6-6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {language === 'en' ? 'Back to App' : 'العودة للتطبيق'}
            </Link>
          </div>

          <div className="card">
            <div className="title">📄 {language === 'en' ? 'Send Payment Receipt' : 'إرسال إيصال الدفع'}</div>
            <div className="sub">
              {language === 'en' ? 'Select the plan, payment method, and upload the receipt image to confirm your subscription. It will be reviewed shortly and your account will be activated immediately.' : 'قم بتحديد الباقة وطريقة الدفع ورفع صورة الإيصال لإتمام تأكيد اشتراكك. سيراجعه المسؤول قريباً وسيتم تفعيل حسابك فوراً.'}
            </div>

            <div className="field">
              <label>{language === 'en' ? 'Required Plan' : 'الباقة المطلوبة'}</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontFamily: "'Cairo',sans-serif",
                  outline: "none",
                  background: "#fff",
                }}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ${p.price}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Methods */}
            <div className="method-grid">
              {(
                [
                  { key: "bank", label: language === 'en' ? "Bank Transfer" : "حوالة بنكية", icon: "🏦" },
                  { key: "palpay", label: language === 'en' ? "PalPay" : "بال باي", icon: "💳" },
                  { key: "jawwal", label: language === 'en' ? "Jawwal Pay" : "جوال باي", icon: "📱" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  className={`method-btn ${payMethod === m.key ? "active" : ""}`}
                  onClick={() => setPayMethod(m.key)}
                >
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Payment Info */}
            <div className="info-box">
              {payMethod === "bank" && (
                <>
                  <div className="info-row">
                    <strong>{language === 'en' ? 'Bank:' : 'البنك:'}</strong>{" "}
                    <span>{adminSettings?.bankName || ""}</span>
                  </div>
                  <div className="info-row">
                    <strong>{language === 'en' ? 'Account Number:' : 'رقم الحساب:'}</strong>{" "}
                    <span dir="ltr">{adminSettings?.bankAccount || ""}</span>
                  </div>
                  {adminSettings?.bankIban && (
                    <div className="info-row">
                      <strong>{language === 'en' ? 'IBAN:' : 'الآيبان:'}</strong>{" "}
                      <span dir="ltr">{adminSettings.bankIban}</span>
                    </div>
                  )}
                  {adminSettings?.companyName && (
                    <div className="info-row">
                      <strong>{language === 'en' ? 'Name:' : 'الاسم:'}</strong>{" "}
                      <span>{adminSettings.companyName}</span>
                    </div>
                  )}
                </>
              )}
              {payMethod === "palpay" && (
                <>
                  <div className="info-row">
                    <strong>{language === 'en' ? 'Wallet Number (PalPay):' : 'رقم المحفظة (PalPay):'}</strong>{" "}
                    <span dir="ltr">{adminSettings?.walletNumber || ""}</span>
                  </div>
                  {adminSettings?.companyName && (
                    <div className="info-row">
                      <strong>{language === 'en' ? 'Name:' : 'الاسم:'}</strong>{" "}
                      <span>{adminSettings.companyName}</span>
                    </div>
                  )}
                </>
              )}
              {payMethod === "jawwal" && (
                <>
                  <div className="info-row">
                    <strong>{language === 'en' ? 'Wallet Number (Jawwal Pay):' : 'رقم المحفظة (Jawwal Pay):'}</strong>{" "}
                    <span dir="ltr">{adminSettings?.walletNumber || ""}</span>
                  </div>
                  {adminSettings?.companyName && (
                    <div className="info-row">
                      <strong>{language === 'en' ? 'Name:' : 'الاسم:'}</strong>{" "}
                      <span>{adminSettings.companyName}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Optional fields */}
            <div className="field">
              <label>{language === 'en' ? 'Transfer Name (Optional)' : 'اسم المحول (اختياري)'}</label>
              <input
                type="text"
                placeholder={language === 'en' ? 'Name as it appears in the transfer' : 'الاسم كما يظهر في الحوالة'}
                value={transferName}
                onChange={(e) => setTransferName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>{language === 'en' ? 'Reference Number (Optional)' : 'رقم المرجع (اختياري)'}</label>
              <input
                type="text"
                placeholder={language === 'en' ? 'Example: 123456789' : 'مثال: 123456789'}
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
              />
            </div>

            {/* Upload Box */}
            <label className={`upload-box ${receiptImage ? "has-image" : ""}`}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () =>
                    setReceiptImage(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
              {receiptImage ? (
                <>
                  <img
                    src={receiptImage}
                    alt="receipt"
                    className="preview-img"
                  />
                  <div
                    className="upload-sub"
                    style={{ color: "#16a34a", fontWeight: 700 }}
                  >
                    ✅ {language === 'en' ? 'Image uploaded — Click to change' : 'تم رفع الصورة — انقر لتغييرها'}
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-icon">📷</div>
                  <div className="upload-text">{language === 'en' ? 'Click to upload payment receipt' : 'انقر لرفع إيصال الدفع'}</div>
                  <div className="upload-sub">
                    {language === 'en' ? 'A clear picture of the bank transfer or wallet' : 'صورة واضحة للحوالة البنكية أو المحفظة'}
                  </div>
                </>
              )}
            </label>

            {/* Submit */}
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isLoading || !receiptImage}
            >
              {isLoading ? (language === 'en' ? "Sending..." : "جاري الإرسال...") : (language === 'en' ? "✅ Send receipt for review" : "✅ إرسال الإيصال للمراجعة")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
