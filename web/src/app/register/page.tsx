"use client";



import { useState, useEffect } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import RoshettaLogo from "@/components/RoshettaLogo";
import toast from "react-hot-toast";
import { useStore } from "@/store";
import { AlertCircle } from "lucide-react";

const translatePlanName = (name: string, lang: string) => {
  if (lang !== 'en') return name;
  if (!name) return name;
  if (name.includes('تجريبية') || name.includes('مجان')) return 'Free Trial';
  if (name.includes('شهري')) return 'Monthly Subscription';
  if (name.includes('سنوي')) return 'Annual Subscription';
  if (name.includes('الحياة') || name.includes('دائم')) return 'Lifetime License';
  return name;
};

const translateFeature = (feature: string, lang: string) => {
  if (lang !== 'en') return feature;
  if (!feature) return feature;
  const map: Record<string, string> = {
    "وصول كامل لجميع ميزات النظام": "Full access to all system features",
    "تجربة 14 يوماً بدون بطاقة ائتمانية": "14-day trial without credit card",
    "تجربة 14 يوما بدون بطاقة ائتمانية": "14-day trial without credit card",
    "إضافة موظفين للتجربة بحرية": "Add staff freely during trial",
    "دعم فني وإرشادي للبدء": "Tech and guidance support to start",
    
    "إدارة شاملة للمخزون والمبيعات": "Comprehensive inventory and sales management",
    "تحديثات دورية مجانية": "Free periodic updates",
    "دعم فني متواصل 24/7": "24/7 continuous tech support",
    "يدعم حتى 3 فروع وصلاحيات دقيقة": "Supports up to 3 branches and precise permissions",
    
    "جميع ميزات الباقة الشهرية": "All features of the monthly plan",
    "توفير 20% من قيمة الاشتراك": "Save 20% of subscription value",
    "عدد غير محدود من الفروع والموظفين": "Unlimited branches and staff",
    "تقارير مالية وإحصائيات متقدمة": "Financial reports and advanced statistics",
    
    "جميع الميزات السابقة مدى الحياة": "All previous features for life",
    "دفع لمرة واحدة فقط (بدون تجديد)": "Pay only once (no renewal)",
    "أولوية قصوى للدعم الفني (VIP)": "Top priority for tech support (VIP)",
    "أمان استثنائي ونسخ احتياطي سحابي": "Exceptional security and cloud backup"
  };
  
  const f = feature.trim();
  if (map[f]) return map[f];
  
  // Partial matches
  if (f.includes('وصول كامل')) return "Full access to all system features";
  if (f.includes('بدون بطاقة')) return "14-day trial without credit card";
  if (f.includes('إضافة موظفين')) return "Add staff freely during trial";
  if (f.includes('إرشادي')) return "Tech and guidance support to start";
  if (f.includes('شاملة للمخزون')) return "Comprehensive inventory and sales management";
  if (f.includes('تحديثات دورية')) return "Free periodic updates";
  if (f.includes('متواصل 24/7')) return "24/7 continuous tech support";
  if (f.includes('3 فروع وصلاحيات')) return "Supports up to 3 branches and precise permissions";
  if (f.includes('جميع ميزات الباقة الشهرية')) return "All features of the monthly plan";
  if (f.includes('توفير 20%')) return "Save 20% of subscription value";
  if (f.includes('غير محدود')) return "Unlimited branches and staff";
  if (f.includes('تقارير مالية')) return "Financial reports and advanced statistics";
  if (f.includes('السابقة مدى الحياة')) return "All previous features for life";
  if (f.includes('دفع لمرة واحدة')) return "Pay only once (no renewal)";
  if (f.includes('أولوية قصوى')) return "Top priority for tech support (VIP)";
  if (f.includes('أمان استثنائي')) return "Exceptional security and cloud backup";
  
  // Fallbacks from previous dictionary
  if (f.includes('متضمنة') || f.includes('متضمّنة')) return 'All features included';
  if (f.includes('رسوم')) return 'No additional fees';
  if (f.includes('سحابية')) return 'Free cloud hosting for one year';
  if (f.includes('VIP')) return 'VIP Technical Support';
  if (f.includes('الشهرية')) return 'All features of the monthly plan';
  if (f.includes('تحديثات')) return 'Continuous free updates';
  if (f.includes('مبيعات')) return 'Dedicated Sales Consultant';
  if (f.includes('تحليلات')) return 'Smart Analytics & Reports';
  if (f.includes('3 فروع')) return 'Up to 3 branches';
  if (f.includes('فوري')) return 'Instant Tech Support';
  if (f.includes('التجربة')) return 'All Trial features';
  
  return feature;
};

function RegisterPageContent() {
  const language = useStore((state: any) => state.language);
  const setLanguage = useStore((state: any) => state.setLanguage);
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get("plan") || "monthly";
  const stepParam = searchParams.get("step");
  const loginFn = useStore((state) => state.login);
  const storeUser = useStore((state) => state.user);

  // If user is logged in and in read-only mode and came via ?step=2 → go straight to step 2
  const initialStep = stepParam === "2" && storeUser?.isReadOnly ? 2 : 1;

  const [step, setStep] = useState(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    pharmacyName: storeUser?.pharmacyName || "",
    managerName: storeUser?.managerName || "",
    email: storeUser?.email || "",
    phone: "",
    password: "",
  });
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"bank" | "palpay" | "jawwal">(
    "bank",
  );
  const [transferName, setTransferName] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
        "/api/admin/settings",
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdminSettings(data.settings);
        }
      })
      .catch((err) => console.error("Error fetching settings", err));

    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
        "/api/subscription-plans",
    )
      .then((res) => res.json())
      .then((data) => {
        const rawPlans = data.plans || (Array.isArray(data) ? data : []);
        const parsedPlans = rawPlans.map((p: any) => ({
          ...p,
          id: String(p.id || p.type),
          name: translatePlanName(p.name, language),
          description: p.description || p.desc || (language === "en" ? "Package Details" : "تفاصيل الباقة"),
          price: p.price ?? 0,
          oldPrice: p.oldPrice || p.old_price,
          isFree: p.price === 0 || p.id === "free",
          cycle:
            p.cycle ||
            (p.id === "free"
              ? (language === "en" ? "14 days free" : "14 يوم مجانًا")
              : p.durationMonths === 1
                ? (language === "en" ? "Monthly" : "شهرياً")
                : p.durationMonths === 12
                  ? (language === "en" ? "Yearly" : "سنوياً")
                  : p.durationMonths > 100
                    ? (language === "en" ? "One-time" : "مرة واحدة")
                    : `${p.durationMonths} ${language === "en" ? "Months" : "أشهر"}`),
          type: p.type || (language === "en" ? "Plan" : "خطة"),
          features:
            typeof p.features === "string"
              ? JSON.parse(p.features)
              : p.features || [],
        }));
        setPlans(parsedPlans);
      })
      .catch((err) => console.error("Error fetching plans", err));
  }, []);

  const fallbackPlan = {
    name: language === "en" ? "Loading..." : "جاري التحميل...",
    price: "0",
    cycle: "",
    type: "",
    features: [],
  };

  const selectedPlan =
    plans.find((p) => p.id === plan || p.type === plan) || fallbackPlan;

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.pharmacyName) newErrors.pharmacyName = language === "en" ? "Please enter pharmacy name" : "يرجى إدخال اسم الصيدلية";
    if (!formData.managerName) newErrors.managerName = language === "en" ? "Please enter manager/owner name" : "يرجى إدخال اسم المدير / المالك";
    
    if (!formData.email) {
      newErrors.email = language === "en" ? "Please enter email" : "يرجى إدخال البريد الإلكتروني";
    } else {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = language === "en" ? "Please enter a valid email" : "يرجى إدخال بريد إلكتروني صحيح";
      }
    }

    if (!formData.phone) {
      newErrors.phone = language === "en" ? "Please enter mobile number" : "يرجى إدخال رقم الجوال";
    } else if (formData.phone.trim().length < 9) {
      newErrors.phone = language === "en" ? "Mobile number must be at least 9 digits" : "رقم الجوال يجب أن لا يقل عن 9 أرقام";
    }

    if (!formData.password) {
      newErrors.password = language === "en" ? "Please enter password" : "يرجى إدخال كلمة المرور";
    } else if (formData.password.length < 6) {
      newErrors.password = language === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن لا تقل عن 6 خانات";
    } else if (!/(?=.*[a-zA-Z\u0600-\u06FF])(?=.*\d)(?=.*[^a-zA-Z\u0600-\u06FF\d\s])/.test(formData.password)) {
      newErrors.password = language === "en" ? "Password must contain letters, numbers, and symbols" : "يجب أن تحتوي كلمة المرور على أحرف، وأرقام، ورموز";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;
    // الباقة المجانية: لا حاجة لرفع إيصال، نسجل مباشرة
    if (plan === "free" || selectedPlan?.price === 0) {
      handleRegister();
    } else {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // If already logged in & read-only → just update the existing subscription request
      if (storeUser?.isReadOnly && storeUser?.pharmacy_id) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${storeUser.pharmacy_id}/subscription-request`,
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
          toast.success(
            language === "en" ? "New receipt sent successfully! It will be reviewed by admin." : "تم إرسال الإيصال الجديد بنجاح! سيتم مراجعته من قبل المسؤول.",
          );
          router.push("/");
        } else {
          toast.error(data.error || language === "en" ? "Something went wrong" : "حدث خطأ ما");
        }
        return;
      }

      // Normal registration flow
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            subscriptionType: plan,
            receiptImage: receiptImage,
            paymentMethod: payMethod,
            transferName,
            transferRef,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        loginFn(data.user, data.token);
        if (plan === "free" || selectedPlan?.price === 0) {
          toast.success(language === "en" ? "Free account activated successfully! Welcome to Roshetta 🎉" : "تم تفعيل حسابك المجاني بنجاح! أهلاً بك في روشتة 🎉");
        } else {
          toast.success(
            language === "en" ? "Subscription completed successfully! Payment will be reviewed and account activated soon." : "تم إتمام الاشتراك بنجاح! سيتم مراجعة الدفعة وتفعيل الحساب قريباً.",
          );
        }
        router.push("/");
      } else {
        toast.error(data.error || language === "en" ? "Something went wrong" : "حدث خطأ ما");
      }
    } catch (e) {
      toast.error(language === "en" ? "Failed to connect to server" : "فشل الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
  :root{
    --deep: #223E56;
    --deep-2: #2B516E;
    --sage: #6FA3C9;
    --sage-soft: #A8C7DD;
    --mint-bg: #EFF5FA;
    --paper: #FBFCFE;
    --line: #DCE7EF;
    --ink: #1C2733;
    --ink-soft: #5B6A78;
    --gold: #C79A57;
    --gold-soft: #F1E3C6;
    --shadow: 0 20px 45px -20px rgba(34, 62, 86, 0.25);
    --shadow-lg: 0 30px 70px -25px rgba(34, 62, 86, 0.35);
  }
 
  *{ box-sizing: border-box; }
 
  .register-page-container {
    margin:0; padding:0;
    color: var(--ink);
    font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height:100vh;
    padding: 64px 24px 80px;
    position: relative;
    overflow-x:hidden;
  }
 
  .bg-decor{ position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow:hidden; }
  .bg-decor svg{ position:absolute; }
  .blob-1{ top:-180px; right:-160px; width:620px; }
  .blob-2{ bottom:-220px; left:-180px; width:700px; }
 
  .wrap{ position:relative; z-index:1; max-width: 1000px; margin: 0 auto; }
 
  .top-row{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 44px; }
 
  .badge{
    display:inline-flex; align-items:center; gap:8px;
    background: var(--paper); border: 1px solid var(--line);
    padding: 9px 20px; border-radius: 999px;
    font-weight:700; font-size: 14px; color: var(--deep);
    box-shadow: var(--shadow);
  }
 
  .back-link{
    display:inline-flex; align-items:center; gap:7px;
    font-size:14px; font-weight:700; color: var(--ink-soft);
    text-decoration:none; transition: color .2s ease, transform .2s ease;
  }
  .back-link:hover{ color: var(--deep); transform: translateX(3px); }
  .back-link svg{ width:14px; height:14px; }
 
  .hero{ text-align:center; margin-bottom: 48px; }
  .hero-title{
    font-size: clamp(28px, 3.8vw, 40px); font-weight: 900;
    margin: 0 0 14px; color: var(--deep); letter-spacing: -0.4px;
  }
  .sub{ max-width: 480px; margin: 0 auto; color: var(--ink-soft); font-size: 15.5px; line-height: 1.9; }
 
  .card{
    display:grid;
    grid-template-columns: 340px 1fr;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 24px;
    overflow:hidden;
    box-shadow: var(--shadow);
    transition: box-shadow .3s ease;
  }
  .card:hover{ box-shadow: var(--shadow-lg); }
  @media (max-width: 820px){ .card{ grid-template-columns: 1fr; } }
 
  .summary{
    background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%);
    color:#fff;
    padding: 36px 32px;
    display:flex; flex-direction:column;
    position:relative;
  }
 
  .ribbon{
    align-self:flex-start;
    background: linear-gradient(135deg, var(--gold), #B8853F);
    color:#fff; font-weight:800; font-size: 12px;
    padding: 6px 16px; border-radius: 999px;
    margin-bottom: 18px;
  }
 
  .plan-name{ font-size: 21px; font-weight: 800; margin-bottom: 22px; }
 
  .price-row{ margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px dashed rgba(255,255,255,0.18); }
  .price{ display:flex; align-items:baseline; gap:6px; }
  .price .num{ font-size: 38px; font-weight: 900; color:#fff; }
  .price .cur{ font-size: 16px; font-weight:700; color: var(--sage-soft); }
  .price-cycle{ font-size: 12.5px; color: rgba(255,255,255,0.6); margin-top: 4px; }
 
  .line-item{
    display:flex; justify-content:space-between; align-items:center;
    font-size:13.5px; color: rgba(255,255,255,0.65);
    padding: 8px 0;
  }
  .line-item span:last-child{ color: rgba(255,255,255,0.92); font-weight:700; }
  .line-item.total{ border-top: 1px solid rgba(255,255,255,0.15); margin-top: 6px; padding-top: 14px; }
  .line-item.total span:first-child{ color:#fff; font-weight:800; font-size:14.5px; }
  .line-item.total span:last-child{ color: var(--gold-soft); font-size:19px; font-weight:900; }
 
  .features{ list-style:none; margin: 22px 0 0; padding:0; }
  .features li{
    display:flex; align-items:center; gap: 10px;
    font-size: 13.5px; padding: 9px 0;
    color: rgba(255,255,255,0.9);
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .features li:last-child{ border-bottom:none; }
  .check{
    width: 18px; height:18px; border-radius:50%;
    background: rgba(255,255,255,0.16);
    display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .check svg{ width:10px; height:10px; }
  .check svg path{ stroke: #fff; }
 
  .summary-footer{
    margin-top:auto; padding-top:26px;
    font-size: 11.5px; color: rgba(255,255,255,0.5); line-height:1.9;
  }
  .summary-footer a{ color: var(--sage-soft); text-decoration:none; }
 
  .form-side{ padding: 40px 40px; }
  @media (max-width: 560px){ .form-side{ padding: 30px 22px; } }
 
  .stepper{ display:flex; align-items:center; gap:14px; margin-bottom: 34px; }
  .step{ display:flex; align-items:center; gap:9px; }
  .step-num{
    width:26px; height:26px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-weight:800; font-size:12.5px;
    background: var(--deep); color:#fff;
  }
  .step.inactive .step-num{ background: var(--mint-bg); color: var(--ink-soft); border:1px solid var(--line); }
  .step-label{ font-size:13px; font-weight:700; color: var(--deep); }
  .step.inactive .step-label{ color: var(--ink-soft); }
  .step-line{ flex:1; height:2px; background: var(--line); border-radius:2px; position:relative; overflow:hidden; }
  .step-line::after{ content:''; position:absolute; inset:0; width:35%; background: var(--sage); }
 
  .field-row{ display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
  @media (max-width: 480px){ .field-row{ grid-template-columns: 1fr; } }
 
  .field{ margin-bottom: 22px; }
  .field label{ display:block; font-size:13.5px; font-weight:700; color: var(--deep); margin-bottom: 9px; }
  .field input{
    width:100%;
    border: 1.5px solid var(--line);
    background: var(--mint-bg);
    border-radius: 13px;
    padding: 14px 16px;
    font-family: inherit; font-size: 14.5px; color: var(--ink);
    outline:none;
    transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
  }
  .field input::placeholder{ color:#9AA79E; }
  .field input:focus{
    border-color: var(--sage); background:#fff; box-shadow: 0 0 0 4px rgba(111,163,201,0.15);
  }
 
  .submit-btn{
    width:100%;
    display:flex; align-items:center; justify-content:center; gap:10px;
    background: linear-gradient(135deg, var(--deep), var(--deep-2));
    color:#fff; border:none;
    padding: 16px 20px; border-radius: 15px;
    font-family:inherit; font-weight:800; font-size:15px;
    cursor:pointer;
    box-shadow: 0 18px 35px -14px rgba(29,58,49,0.5);
    transition: transform .2s ease, box-shadow .2s ease;
    margin-top: 6px;
  }
  .submit-btn:hover{ transform: translateY(-2px); box-shadow: 0 22px 40px -14px rgba(29,58,49,0.55); }
  .submit-btn svg{ width:16px; height:16px; transform: scaleX(-1); }
 
  .trust-row{
    display:flex; align-items:center; justify-content:center; gap:7px;
    margin-top:18px; font-size:12px; color: var(--ink-soft);
  }
  .trust-row svg{ width:13px; height:13px; }
  .trust-row svg path{ stroke: var(--sage); }

  .upload-box {
    border: 2px dashed var(--line);
    border-radius: 16px;
    padding: 30px 20px;
    text-align: center;
    background: var(--mint-bg);
    cursor: pointer;
    transition: all 0.2s;
  }
  .upload-box:hover { border-color: var(--sage); background: #fff; }
  .upload-box.has-image { padding: 10px; border-style: solid; border-color: var(--sage); background: #fff; }
  `;

  return (
    <div className="register-page-container" dir={language === "en" ? "ltr" : "rtl"}>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      <div className="bg-decor">
        <svg
          className="blob-1"
          viewBox="0 0 600 600"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#DCEBF5"
            d="M421,318Q404,436,286,447Q168,458,120,349Q72,240,164,158Q256,76,354,133Q452,190,421,318Z"
          />
        </svg>
        <svg
          className="blob-2"
          viewBox="0 0 600 600"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#E9F2F9"
            d="M437,305Q423,410,320,441Q217,472,132,404Q47,336,89,231Q131,126,246,112Q361,98,411,201Q461,304,437,305Z"
          />
        </svg>
      </div>

      <div className="wrap">
        <div className="top-row">
          <div className="badge flex gap-2 items-center">
            <RoshettaLogo
              showText={true}
              className="h-6 w-auto"
              textClassName="font-bold text-[14px] text-ink"
            />
          </div>
          <button
                type="button"
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                style={{
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "var(--deep)",
                  fontSize: "13px",
                  marginInlineEnd: "16px"
                }}
              >
                {language === "en" ? "عربي" : "English"}
              </button>
              <Link href="/pricing" className="back-link">
            العودة للباقات
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="#5B6A78"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        <div className="hero">
          <h1 className="hero-title">{language === "en" ? "Complete Subscription" : "إتمام الاشتراك"}</h1>
          <p className="sub">{language === "en" ? "Simple steps separate you from the smartest system to manage your pharmacy." : "خطوات بسيطة تفصلك عن أذكى نظام لإدارة صيدليتك."}</p>
        </div>

        <div className="card">
          <aside className="summary">
            <div className="ribbon">{selectedPlan.type}</div>
            <div className="plan-name">{selectedPlan.name}</div>

            <div className="price-row">
              <div className="price">
                <span className="num">{selectedPlan.price}</span>
                <span className="cur">$</span>
              </div>
              <div className="price-cycle">{selectedPlan.cycle}</div>
            </div>

            <div className="line-item">
              <span>{language === "en" ? "Subscription Fees" : "رسوم الاشتراك"}</span>
              <span>${selectedPlan.price}</span>
            </div>
            <div className="line-item">
              <span>{language === "en" ? "Taxes (0%)" : "الضرائب (0%)"}</span>
              <span>$0.00</span>
            </div>
            <div className="line-item total">
              <span>{language === "en" ? "Total" : "الإجمالي"}</span>
              <span>${selectedPlan.price}</span>
            </div>

            <ul className="features">
              {selectedPlan.features.map((feature: string, idx: number) => (
                <li key={idx}>
                  <span className="check">
                    <svg viewBox="0 0 12 12">
                      <path
                        d="M2 6l3 3 5-6"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="summary-footer">
              {language === "en" ? "Any questions? Contact us at" : "أي استفسار؟ راسلنا على"} {" "}
              <a href="mailto:support@roshetta.com">support@roshetta.com</a>
            </div>
          </aside>

          <section className="form-side">
            <div className="stepper">
              <div className={`step ${step === 1 ? "" : "inactive"}`}>
                <div className="step-num">{language === "en" ? "1" : "١"}</div>
                <div className="step-label">{language === "en" ? "Pharmacy Data" : "بيانات الصيدلية"}</div>
              </div>
              <div className={`step-line ${step === 2 ? "step2" : ""}`}></div>
              <div className={`step ${step === 2 ? "" : "inactive"}`}>
                <div className="step-num">{language === "en" ? "2" : "٢"}</div>
                <div className="step-label">{language === "en" ? "Payment and Card" : "الدفع والبطاقة"}</div>
              </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              {step === 1 ? (
                <>
                  <div className="field-row">
                    <div className="field">
                      <label>{language === "en" ? "Pharmacy Name" : "اسم الصيدلية"}</label>
                      <input
                        type="text"
                        placeholder={language === "en" ? "Al-Amal Pharmacy" : "صيدلية الأمل"}
                        value={formData.pharmacyName}
                         style={errors.pharmacyName ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}}
                          onChange={(e) =>
                          setFormData({
                            ...formData,
                            pharmacyName: e.target.value,
                          })
                        }
                      />
                        {errors.pharmacyName && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.pharmacyName}
                        </p>
                      )}
                    </div>
                    <div className="field">
                      <label>{language === "en" ? "Manager / Owner Name" : "اسم المدير / المالك"}</label>
                      <input
                        type="text"
                        placeholder={language === "en" ? "Dr. Mohammed Ahmed" : "د. محمد أحمد"}
                        value={formData.managerName}
                         style={errors.managerName ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}}
                          onChange={(e) =>
                          setFormData({
                            ...formData,
                            managerName: e.target.value,
                          })
                        }
                      />
                        {errors.managerName && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.managerName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label>{language === "en" ? "Email" : "البريد الإلكتروني"}</label>
                    <input
                      type="email"
                      placeholder="pharmacy@example.com"
                      value={formData.email}
                       style={errors.email ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}}
                          onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                      {errors.email && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.email}
                        </p>
                      )}
                    </div>

                  <div className="field">
                    <label>{language === "en" ? "Mobile Number" : "رقم الموبايل"}</label>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "var(--mint-bg)",
                          border: "1px solid var(--line)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--deep)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        🇵🇸 +970
                      </div>
                      <input
                        type="tel"
                        placeholder="0599 000 000"
                        value={formData.phone}
                         onChange={(e) => {
                          const val = e.target.value
                            .replace(/[^0-9]/g, "")
                            .slice(0, 10);
                          const formatted =
                            val.length > 4
                              ? val.slice(0, 4) +
                                " " +
                                (val.length > 7
                                  ? val.slice(4, 7) + " " + val.slice(7)
                                  : val.slice(4))
                              : val;
                          setFormData({ ...formData, phone: formatted });
                        }}
                        style={{ flex: 1, ...(errors.phone ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}) }}
                        dir="ltr"
                      />
                      </div>
                      {errors.phone && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.phone}
                        </p>
                      )}
                  </div>

                  <div className="field">
                    <label>{language === "en" ? "System Password" : "كلمة المرور للنظام"}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                       style={errors.password ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}}
                          onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                      {errors.password && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.password}
                        </p>
                      )}
                    </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading
                      ? (language === "en" ? "Processing..." : "جاري المعالجة...")
                      : plan === "free" || selectedPlan?.price === 0
                        ? (language === "en" ? "Create Account & Start Free Trial" : "إنشاء الحساب وبدء التجربة المجانية")
                        : (language === "en" ? "Continue to Payment" : "المتابعة للدفع")}
                    {!isLoading && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="font-bold text-[18px] text-deep mb-2">{language === "en" ? "Payment Method" : "طريقة الدفع"}</h3>
                    <p
                      className="text-[14px] text-ink-soft mb-4"
                      style={{ lineHeight: "1.6" }}
                    >
                      {language === "en" ? `Please transfer the subscription amount (${selectedPlan.price}) to our bank account or e-wallet then attach the transfer receipt below to activate your account.` : `يرجى تحويل مبلغ الاشتراك (${selectedPlan.price}) إلى حسابنا البنكي أو المحفظة الإلكترونية ثم إرفاق إيصال التحويل أدناه لتفعيل حسابك.`}
                    </p>

                    <div
                      className="grid grid-cols-3 gap-3 mb-6"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: "12px",
                        marginBottom: "24px",
                      }}
                    >
                      <div
                        onClick={() => setPayMethod("bank")}
                        className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                        style={{
                          border:
                            payMethod === "bank"
                              ? "2px solid var(--sage)"
                              : "2px solid var(--line)",
                          background:
                            payMethod === "bank" ? "var(--mint-bg)" : "#fff",
                          padding: "12px",
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          fontWeight: "bold",
                          color: "var(--deep)",
                        }}
                      >
                        <span
                          className="text-[24px]"
                          style={{ fontSize: "24px" }}
                        >
                          🏦
                        </span>{language === "en" ? "Bank Transfer" : "حوالة بنكية"}</div>
                      <div
                        onClick={() => setPayMethod("palpay")}
                        className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                        style={{
                          border:
                            payMethod === "palpay"
                              ? "2px solid var(--sage)"
                              : "2px solid var(--line)",
                          background:
                            payMethod === "palpay" ? "var(--mint-bg)" : "#fff",
                          padding: "12px",
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          fontWeight: "bold",
                          color: "var(--deep)",
                        }}
                      >
                        <span
                          className="text-[24px]"
                          style={{ fontSize: "24px" }}
                        >
                          💳
                        </span>{language === "en" ? "PalPay" : "بال باي"}</div>
                      <div
                        onClick={() => setPayMethod("jawwal")}
                        className="p-3 rounded-xl flex flex-col items-center justify-center gap-2 font-bold cursor-pointer transition-all"
                        style={{
                          border:
                            payMethod === "jawwal"
                              ? "2px solid var(--sage)"
                              : "2px solid var(--line)",
                          background:
                            payMethod === "jawwal" ? "var(--mint-bg)" : "#fff",
                          padding: "12px",
                          borderRadius: "12px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          fontWeight: "bold",
                          color: "var(--deep)",
                        }}
                      >
                        <span
                          className="text-[24px]"
                          style={{ fontSize: "24px" }}
                        >
                          📱
                        </span>{language === "en" ? "Jawwal Pay" : "جوال باي"}</div>
                    </div>

                    <div
                      className="bg-mint-bg p-4 rounded-xl border border-line mb-6"
                      style={{
                        background: "var(--mint-bg)",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid var(--line)",
                        marginBottom: "24px",
                      }}
                    >
                      {payMethod === "bank" && (
                        <>
                          <div
                            className="text-[13px] font-bold text-deep mb-2"
                            style={{
                              fontSize: "13px",
                              fontWeight: "bold",
                              marginBottom: "8px",
                            }}
                          >{language === "en" ? "Bank Transfer Details:" : "بيانات التحويل البنكي:"}</div>
                          <div
                            className="font-mono text-[14px] text-ink-soft flex flex-col gap-1"
                            style={{
                              fontSize: "14px",
                              color: "var(--ink-soft)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span className="font-bold font-sans">{language === "en" ? "Bank:" : "البنك:"}</span>{" "}
                              <span>{adminSettings?.bankName || ""}</span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span className="font-bold font-sans">{language === "en" ? "Account Number:" : "رقم الحساب:"}</span>{" "}
                              <span dir="ltr">
                                {adminSettings?.bankAccount || ""}
                              </span>
                            </div>
                            {adminSettings?.bankIban && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <span className="font-bold font-sans">{language === "en" ? "IBAN:" : "الآيبان:"}</span>{" "}
                                <span dir="ltr">{adminSettings.bankIban}</span>
                              </div>
                            )}
                            {(adminSettings?.bankAccountName ||
                              adminSettings?.companyName) && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <span className="font-bold font-sans">{language === "en" ? "Name:" : "الاسم:"}</span>{" "}
                                <span>
                                  {adminSettings.bankAccountName ||
                                    adminSettings.companyName}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {payMethod === "palpay" && (
                        <>
                          <div
                            className="text-[13px] font-bold text-deep mb-2"
                            style={{
                              fontSize: "13px",
                              fontWeight: "bold",
                              marginBottom: "8px",
                            }}
                          >{language === "en" ? "PalPay Payment Details:" : "بيانات الدفع عبر بال باي (PalPay):"}</div>
                          <div
                            className="font-mono text-[14px] text-ink-soft flex flex-col gap-1"
                            style={{
                              fontSize: "14px",
                              color: "var(--ink-soft)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span className="font-bold font-sans">{language === "en" ? "Wallet Number:" : "رقم المحفظة:"}</span>{" "}
                              <span dir="ltr">
                                {adminSettings?.walletNumber || ""}
                              </span>
                            </div>
                            {(adminSettings?.palpayName ||
                              adminSettings?.companyName) && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <span className="font-bold font-sans">{language === "en" ? "Name:" : "الاسم:"}</span>{" "}
                                <span>
                                  {adminSettings.palpayName ||
                                    adminSettings.companyName}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {payMethod === "jawwal" && (
                        <>
                          <div
                            className="text-[13px] font-bold text-deep mb-2"
                            style={{
                              fontSize: "13px",
                              fontWeight: "bold",
                              marginBottom: "8px",
                            }}
                          >{language === "en" ? "Jawwal Pay Payment Details:" : "بيانات الدفع عبر جوال باي (Jawwal Pay):"}</div>
                          <div
                            className="font-mono text-[14px] text-ink-soft flex flex-col gap-1"
                            style={{
                              fontSize: "14px",
                              color: "var(--ink-soft)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span className="font-bold font-sans">{language === "en" ? "Wallet Number:" : "رقم المحفظة:"}</span>{" "}
                              <span dir="ltr">
                                {adminSettings?.walletNumber || ""}
                              </span>
                            </div>
                            {(adminSettings?.jawwalpayName ||
                              adminSettings?.companyName) && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                }}
                              >
                                <span className="font-bold font-sans">{language === "en" ? "Name:" : "الاسم:"}</span>{" "}
                                <span>
                                  {adminSettings.jawwalpayName ||
                                    adminSettings.companyName}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      className="field-row mb-6"
                      style={{ marginBottom: "24px" }}
                    >
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>{language === "en" ? "Transferer Name (Optional)" : "اسم المحول (اختياري)"}</label>
                        <input
                          type="text"
                          placeholder={language === "en" ? "Name as it appears in the transfer" : "الاسم كما يظهر في الحوالة"}
                          value={transferName}
                          onChange={(e) => setTransferName(e.target.value)}
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>{language === "en" ? "Reference Number (Optional)" : "رقم المرجع (اختياري)"}</label>
                        <input
                          type="text"
                          placeholder={language === "en" ? "Example: 123456789" : "مثال: 123456789"}
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                        />
                      </div>
                    </div>

                    <label
                      className={`upload-box block ${receiptImage ? "has-image" : ""}`}
                      style={{ display: "block" }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onloadend = () =>
                              setReceiptImage(reader.result as string);
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                      />
                      {receiptImage ? (
                        <div
                          className="relative"
                          style={{ position: "relative" }}
                        >
                          <img
                            src={receiptImage}
                            alt="Receipt"
                            className="w-full h-40 object-cover rounded-lg"
                            style={{
                              width: "100%",
                              height: "160px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                          <div
                            className="absolute top-2 right-2 bg-white text-coral p-1.5 rounded-lg shadow-sm hover:bg-red-50"
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "white",
                              padding: "6px",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              setReceiptImage(null);
                            }}
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="red"
                              style={{ width: "20px", height: "20px" }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col items-center gap-3"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[20px] shadow-sm"
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "50%",
                              background: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "20px",
                            }}
                          >
                            📸
                          </div>
                          <div>
                            <div
                              className="font-bold text-deep text-[15px]"
                              style={{ fontWeight: "bold", fontSize: "15px" }}
                            >{language === "en" ? "Click to upload transfer receipt" : "انقر لرفع إيصال التحويل"}</div>
                            <div
                              className="text-[12px] text-ink-soft mt-1"
                              style={{ fontSize: "12px", marginTop: "4px" }}
                            >{language === "en" ? "Clear image of the bank transfer or wallet" : "صورة واضحة للحوالة البنكية أو المحفظة"}</div>
                          </div>
                        </div>
                      )}
                    </label>
                  </div>

                  <div
                    className="flex gap-3"
                    style={{ display: "flex", gap: "12px" }}
                  >
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        padding: "12px 20px",
                        borderRadius: "12px",
                        border: "2px solid var(--line)",
                        fontWeight: "bold",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >{language === "en" ? "Back" : "رجوع"}</button>
                    <button
                      type="button"
                      onClick={handleRegister}
                      disabled={isLoading || !receiptImage}
                      className={`submit-btn mt-0`}
                      style={{
                        flex: 1,
                        opacity: !receiptImage || isLoading ? 0.5 : 1,
                        cursor:
                          !receiptImage || isLoading
                            ? "not-allowed"
                            : "pointer",
                        marginTop: 0,
                      }}
                    >
                      {isLoading
                        ? (language === "en" ? "Creating..." : "جاري الإنشاء...")
                        : (language === "en" ? "Complete Subscription & Activate Account" : "إتمام الاشتراك وتفعيل الحساب")}
                    </button>
                  </div>
                </>
              )}

              <div className="trust-row">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L4 6V11C4 15.5 7.4 19.7 12 21C16.6 19.7 20 15.5 20 11V6L12 2Z"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>{language === "en" ? "Your data is fully protected and encrypted" : "بياناتك محمية ومشفّرة بالكامل"}</div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}


export default function RegisterPage() {
  const language = useStore((state: any) => state.language);
  return (
    <Suspense fallback={<div className="p-8 text-center text-ink-soft">{language === "en" ? "Loading..." : "جاري التحميل..."}</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
