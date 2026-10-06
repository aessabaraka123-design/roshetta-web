"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import RoshettaLogo from "@/components/RoshettaLogo";
import { useStore } from "@/store";

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

export default function Pricing() {
  const language = useStore((state: any) => state.language);
  const setLanguage = useStore((state: any) => state.setLanguage);
  const router = useRouter();
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: plansData, isLoading } = useSWR(
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
      "/api/subscription-plans",
    fetcher,
  );

  const rawPlans =
    plansData?.plans || (Array.isArray(plansData) ? plansData : []);
  const plans = rawPlans.map((p: any) => ({
    ...p,
    id: p.id || p.type,
    name: translatePlanName(p.name, language),
    description: p.description || p.desc || (language === 'en' ? "Plan Details" : "تفاصيل الباقة"),
    price: p.price ?? 0,
    oldPrice: p.oldPrice || p.old_price,
    isFree: p.price === 0 || p.id === "free",
    cycle:
      p.cycle ||
      (p.id === "free"
        ? (language === 'en' ? "14 Days Free" : "14 يوم مجانًا")
        : p.durationMonths === 1
          ? (language === 'en' ? "Monthly" : "شهرياً")
          : p.durationMonths === 12
            ? (language === 'en' ? "Annually" : "سنوياً")
            : p.durationMonths > 100
              ? (language === 'en' ? "Once" : "مرة واحدة")
              : (language === 'en' ? `${p.durationMonths} Months` : `${p.durationMonths} أشهر`)),
    isFeatured:
      p.id === "annual" ||
      p.id === "lifetime" ||
      p.durationMonths === 12 ||
      p.durationMonths > 100 ||
      p.isFeatured ||
      p.is_featured,
    type: p.type,
    features:
      typeof p.features === "string"
        ? JSON.parse(p.features)
        : p.features || [],
  }));

  const formatPrice = (p: number) => (p ? p.toLocaleString("en-US") : "0");




  const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
  
  :root{
    --deep: #1B3A5C;
    --deep-2: #22507A;
    --sage: #6FA3C9;
    --sage-soft: #A8C7DD;
    --mint-bg: #EFF5FA;
    --paper: #FBFCFE;
    --line: #DCE7EF;
    --ink: #1C2733;
    --ink-soft: #5B6A78;
    --gold: #C79A57;
    --gold-soft: #F1E3C6;
    --shadow: 0 20px 45px -20px rgba(27, 58, 92, 0.25);
    --shadow-lg: 0 30px 70px -25px rgba(27, 58, 92, 0.35);
  }
  *{ box-sizing: border-box; }
  .pricing-page-container {
    margin:0; padding:0;
    color: var(--ink);
    font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height:100vh; padding: 64px 24px 80px; position: relative; overflow-x:hidden;
  }
  .bg-decor{ position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow:hidden; }
  .bg-decor svg{ position:absolute; }
  .blob-1{ top:-180px; right:-160px; width:620px; }
  .blob-2{ bottom:-220px; left:-180px; width:700px; }
  .leaf-vein{ top:38%; left:6%; width:90px; opacity:.25; transform: rotate(18deg); }
  .wrap{ position:relative; z-index:1; max-width: 1180px; margin: 0 auto; }
  .hero{ text-align:center; margin-bottom: 68px; }
  .badge{
    display:inline-flex; align-items:center; gap:8px;
    background: var(--paper); border: 1px solid var(--line);
    padding: 9px 20px; border-radius: 999px; font-weight:700; font-size: 14px;
    color: var(--deep); box-shadow: var(--shadow); margin-bottom: 28px;
  }
  h1.pricing-title {
    font-size: clamp(32px, 4.6vw, 52px); font-weight: 900; line-height: 1.35;
    margin: 0 0 18px; color: var(--deep); letter-spacing: -0.5px;
  }
  h1.pricing-title span{
    position:relative; color: var(--sage);
    background: linear-gradient(180deg, transparent 62%, var(--gold-soft) 62%);
    padding: 0 4px; border-radius: 6px;
  }
  .sub{ max-width: 620px; margin: 0 auto 34px; color: var(--ink-soft); font-size: 16.5px; line-height: 1.9; }
  .login-pill{
    display:inline-flex; align-items:center; gap:10px;
    background: var(--paper); border: 1px solid var(--line);
    padding: 14px 26px; border-radius: 16px; font-weight: 700; font-size: 15px;
    color: var(--deep-2); box-shadow: var(--shadow); text-decoration:none;
    transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  }
  .login-pill svg{ width:18px; height:18px; }
  .login-pill:hover{
    transform: translateY(-3px); border-color: var(--sage-soft); box-shadow: var(--shadow-lg);
  }
  .grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px; align-items: stretch; }
  @media (max-width: 1000px){ .grid{ grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 620px){ .grid{ grid-template-columns: 1fr; } }
  .card{
    position: relative; background: var(--paper); border: 1px solid var(--line);
    border-radius: 24px; padding: 34px 26px 28px; display:flex; flex-direction:column;
    box-shadow: var(--shadow); transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
  }
  .card:hover{
    transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--sage-soft);
  }
  .card.featured{
    background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%);
    color: #fff; border: none; transform: translateY(-14px);
    box-shadow: 0 35px 80px -25px rgba(29,58,49,0.55);
  }
  .card.featured:hover{ transform: translateY(-19px); }
  .ribbon{
    position:absolute; top:-14px; right:50%; transform: translateX(50%);
    background: linear-gradient(135deg, var(--gold), #B8853F);
    color:#fff; font-weight:800; font-size: 12.5px;
  }
  .offer-badge {
    display: flex; align-items: center; gap: 4px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff; font-weight: 700; font-size: 11px;
    padding: 4px 10px; border-radius: 999px;
    box-shadow: 0 4px 10px -2px rgba(239, 68, 68, 0.4);
    white-space: nowrap;
  }
  .offer-badge svg { width: 12px; height: 12px; }
  .plan-name{ font-size: 20px; font-weight: 800; color: var(--deep); margin: 0; }
  .plan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .card.featured .plan-name{ color: #fff; }
  .plan-desc{ font-size: 13.5px; line-height:1.8; color: var(--ink-soft); min-height: 44px; margin-bottom: 20px; }
  .card.featured .plan-desc{ color: rgba(255,255,255,0.72); }
  .price-row{ margin-bottom: 22px; padding-bottom: 22px; border-bottom: 1px dashed var(--line); }
  .card.featured .price-row{ border-color: rgba(255,255,255,0.18); }
  .price{ display:flex; align-items:baseline; gap:6px; }
  .price .num{ font-size: 40px; font-weight: 900; color: var(--deep); }
  .card.featured .price .num{ color:#fff; }
  .price .cur{ font-size: 17px; font-weight:700; color: var(--sage); }
  .card.featured .price .cur{ color: var(--sage-soft); }
  .price-cycle{ font-size: 12.5px; color: var(--ink-soft); margin-top: 4px; }
  .card.featured .price-cycle{ color: rgba(255,255,255,0.6); }
  .features{ list-style:none; margin:0 0 26px; padding:0; flex:1; }
  .features li{
    display:flex; align-items:center; justify-content:space-between; gap: 10px;
    font-size: 14px; padding: 10px 0; color: var(--ink); border-bottom: 1px solid var(--line);
  }
  .card.featured .features li{ color: rgba(255,255,255,0.92); border-color: rgba(255,255,255,0.12); }
  .features li:last-child{ border-bottom:none; }
  .check{
    width: 20px; height:20px; border-radius:50%;
    background: rgba(111,163,201,0.18); display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .check svg{ width:11px; height:11px; }
  .check svg path{ stroke: var(--deep); }
  .card.featured .check{ background: rgba(255,255,255,0.16); }
  .card.featured .check svg path{ stroke: #fff; }
  .cta{
    display:block; text-align:center; padding: 14px 20px; border-radius: 14px;
    font-weight: 800; font-size: 14.5px; text-decoration:none; cursor:pointer;
    border: 1px solid var(--line); background: var(--mint-bg); color: var(--deep);
    transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
  }
  .cta:hover{ transform: translateY(-2px); }
  .cta.gold{
    background: linear-gradient(135deg, var(--gold), #B8853F);
    border:none; color:#fff; box-shadow: 0 14px 30px -12px rgba(199,154,87,0.65);
  }
  .cta.solid-deep{ background: var(--deep); border:none; color:#fff; box-shadow: 0 14px 30px -12px rgba(29,58,49,0.5); }
  .cta.outline-light{ background: transparent; border: 1px solid rgba(255,255,255,0.35); color: #fff; }
  .cta.outline-light:hover{ background: rgba(255,255,255,0.1); }
  .cta.mint-solid{ background: var(--sage); border:none; color: #fff; box-shadow: 0 14px 30px -12px rgba(111,163,201,0.65); }
    /* Custom Themes */
    .card.theme-free { background: var(--paper); border: 1px solid var(--line); }
    .cta.theme-free { background: var(--sage); color: #fff; box-shadow: 0 14px 30px -12px rgba(111,163,201,0.65); border: none; }
    
    .card.theme-monthly { background: linear-gradient(180deg, #FFFFFF 0%, #E8F4FA 100%); border: 1px solid var(--sage-soft); }
    .cta.theme-monthly { background: var(--deep); color: #fff; box-shadow: 0 14px 30px -12px rgba(27,58,92,0.5); border: none; }
    
    .card.featured.theme-annual { background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%); border: 1px solid rgba(255,255,255,0.1); transform: translateY(-12px); }
    .card.featured.theme-annual:hover { transform: translateY(-18px); }
    .card.featured.theme-annual .ribbon { background: linear-gradient(135deg, var(--gold), #B8853F); color: #fff; }
    .cta.theme-annual { background: linear-gradient(135deg, var(--gold), #B8853F); color: #fff; box-shadow: 0 14px 30px -12px rgba(199,154,87,0.65); border: none; }
    
    .card.featured.theme-lifetime { 
      background: linear-gradient(180deg, #101F2F 0%, #08111A 100%); 
      box-shadow: 0 35px 80px -25px rgba(10,21,35,0.8); 
      border: 1px solid rgba(27,184,150,0.25);
      transform: none;
    }
    .card.featured.theme-lifetime .ribbon { background: linear-gradient(135deg, #1BB896, #0D8268); color: #fff; }
    .card.featured.theme-lifetime:hover { box-shadow: 0 45px 90px -20px rgba(27,184,150,0.25); transform: translateY(-6px); border-color: #1BB896; }
    .card.featured.theme-lifetime .plan-name { color: #E8F5F2; }
    .card.featured.theme-lifetime .price .num { color: #fff; }
    .card.featured.theme-lifetime .price .cur { color: #1BB896; }
    .card.featured.theme-lifetime .check { background: rgba(27,184,150,0.15); border-color: transparent; }
    .card.featured.theme-lifetime .check svg path { stroke: #1BB896; }
    .cta.theme-lifetime { background: linear-gradient(135deg, #1BB896, #0D8268); color: #fff; box-shadow: 0 14px 30px -12px rgba(27,184,150,0.5); border: none; }

    footer{
    text-align:center; margin-top: 72px; padding-top: 26px; border-top: 1px solid var(--line);
    color: var(--ink-soft); font-size: 13px; line-height: 1.9;
  }
  footer strong{ color: var(--deep); }
  `;

  return (
    <div className="pricing-page-container" dir={language === "en" ? "ltr" : "rtl"}>
      <button
        type="button"
        onClick={() => setLanguage(language === "en" ? "ar" : "en")}
        style={{
          position: "absolute",
          top: "24px",
          insetInlineEnd: "24px",
          zIndex: 50,
          background: "var(--paper)",
          border: "1px solid var(--line)",
          padding: "8px 16px",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: 600,
          color: "var(--deep)",
          fontSize: "14px",
          boxShadow: "var(--shadow)"
        }}
      >
        {language === "en" ? "عربي" : "English"}
      </button>
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
        <svg
          className="leaf-vein"
          viewBox="0 0 100 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 0 C 20 50, 20 150, 50 200"
            stroke="#6FA3C9"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M50 30 C 40 40, 35 45, 25 45"
            stroke="#6FA3C9"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M50 80 C 65 90, 72 95, 82 95"
            stroke="#6FA3C9"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M50 130 C 38 140, 32 145, 20 145"
            stroke="#6FA3C9"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </div>

      <div className="wrap">
        <header className="hero">
          <div className="badge flex gap-2 items-center">
            <RoshettaLogo
              showText={true}
              className="w-5 h-5"
              textClassName="font-bold text-[14px] text-ink"
            />
          </div>

          <h1 className="pricing-title">
            {language === 'en' ? 'The Smartest System to ' : 'النظام الأذكى '}<span>{language === 'en' ? 'Manage' : 'لإدارة'}</span>{language === 'en' ? ' Your Pharmacy' : ' صيدليتك'}
          </h1>

          <p className="sub">
            {language === 'en' ? "Everything you need to manage your pharmacy in one place, with a simple, self-explanatory interface. Choose the right plan for your business size, and get started in minutes." : "كل ما تحتاجه لإدارة صيدليتك في مكان واحد، بواجهة بسيطة لا تحتاج شرحًا. اختر الباقة المناسبة لحجم عملك، وابدأ خلال دقائق."}
          </p>

          <Link href="/login" className="login-pill">
            {language === 'en' ? "Already have a pharmacy account? Log In" : "لديك حساب صيدلية بالفعل؟ تسجيل الدخول"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15"
                stroke="#1B3A5C"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M10 17L15 12L10 7"
                stroke="#1B3A5C"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 12H3"
                stroke="#1B3A5C"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </Link>
        </header>

        {isLoading ? (
          <div className="text-center py-20 text-ink-soft">
            {language === 'en' ? "Loading plans..." : "جاري تحميل الباقات..."}
          </div>
        ) : (
          <div className="grid">
            {plans.map((p: any) => (
              <div
                key={p.id}
                className={`card theme-${p.id || p.type} ${p.isFeatured ? "featured" : ""}`}
              >
                <div
                  className="plan-header"
                  style={{ alignItems: "flex-start" }}
                >
                  <div className="plan-name">{p.name}</div>
                  <div
                    className="flex flex-col gap-2"
                    style={{ alignItems: "flex-end" }}
                  >
                    {p.isFeatured &&
                      p.id !== "lifetime" &&
                      p.type !== "lifetime" && (
                        <div
                          className="offer-badge"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--gold), #B8853F)",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="12"
                            height="12"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          {language === 'en' ? "Best Value" : "الأفضل قيمة"}
                        </div>
                      )}
                    {p.oldPrice && p.oldPrice > p.price && (
                      <div className="offer-badge">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {language === 'en' ? "Limited Time" : "لفترة محدودة"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="plan-desc">{p.description}</div>
                <div className="price-row">
                  <div className="price" style={{ position: "relative" }}>
                    {p.isFree ? (
                      <span className="num" style={{ fontSize: "32px" }}>
                        {language === 'en' ? "Free" : "مجانًا"}
                      </span>
                    ) : (
                      <>
                        <span className="num">{formatPrice(p.price)}</span>
                        <span className="cur">₪</span>
                        {p.oldPrice && p.oldPrice > p.price && (
                          <span
                            style={{
                              textDecoration: "line-through",
                              color: p.isFeatured
                                ? "rgba(255,255,255,0.6)"
                                : "var(--ink-soft)",
                              fontSize: "16px",
                              opacity: p.isFeatured ? 1 : 0.6,
                              alignSelf: "flex-start",
                              marginLeft: "6px",
                              marginTop: "6px",
                            }}
                          >
                            ₪{formatPrice(p.oldPrice)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="price-cycle">{p.cycle}</div>
                </div>
                <ul className="features">
                  {p.features.map((f: string, idx: number) => (
                    <li key={idx}>
                      {f}
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
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() =>
                    router.push(`/register?plan=${p.id || p.type}`)
                  }
                  className={`cta theme-${p.id || p.type}`}
                >
                  {p.isFree ? (language === 'en' ? "Start Free Trial" : "ابدأ تجربتك المجانية") : (language === 'en' ? "Choose Plan" : "اختيار الباقة")}
                </button>
              </div>
            ))}
          </div>
        )}

        <footer>
          {language === 'en' ? 'All rights reserved for Roshetta © 2026' : 'جميع الحقوق محفوظة لبرنامج روشتة © 2026'}
          <br />
          {language === 'en' ? 'Developed with passion by Eng. ' : 'تم التطوير بشغف بواسطة المهندس '}<strong>{language === 'en' ? 'Aessa Baraka' : 'عيسى بركة'}</strong>
        </footer>
      </div>
    </div>
  );
}
