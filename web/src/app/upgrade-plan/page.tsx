"use client";

import { useRouter } from "next/navigation";
import AppBar from "@/components/AppBar";
import toast from "react-hot-toast";

export default function UpgradePlan() {
  const router = useRouter();

  const handleUpgrade = (planName: string) => {
    toast.success(language === "en" ? `Upgrade request to ${planName} sent successfully!` : `تم إرسال طلب الترقية إلى باقة ${planName} بنجاح!`);
    setTimeout(() => {
      router.push("/my-subscription");
    }, 1500);
  };

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
  .pricing-page-container {
    color: var(--ink);
    font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
    -webkit-font-smoothing: antialiased;
    position: relative; overflow-x:hidden;
    padding-bottom: 80px;
  }
  .bg-decor{ position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow:hidden; }
  .bg-decor svg{ position:absolute; }
  .blob-1{ top:-100px; right:-160px; width:500px; }
  .blob-2{ bottom:-100px; left:-180px; width:500px; }
  
  .wrap{ position:relative; z-index:1; max-width: 1000px; margin: 0 auto; padding: 0 24px; }
  .hero{ text-align:center; margin: 40px 0 50px; }
  h1.pricing-title {
    font-size: clamp(26px, 3.5vw, 36px); font-weight: 900; line-height: 1.35;
    margin: 0 0 16px; color: var(--deep); letter-spacing: -0.5px;
  }
  h1.pricing-title span{
    position:relative; color: var(--sage);
    background: linear-gradient(180deg, transparent 62%, var(--gold-soft) 62%);
    padding: 0 4px; border-radius: 6px;
  }
  .sub{ max-width: 620px; margin: 0 auto; color: var(--ink-soft); font-size: 15px; line-height: 1.8; }
  
  .grid{ display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: stretch; }
  @media (max-width: 900px){ .grid{ grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 620px){ .grid{ grid-template-columns: 1fr; } }
  
  .card{
    position: relative; background: var(--paper); border: 1px solid var(--line);
    border-radius: 20px; padding: 28px 22px 24px; display:flex; flex-direction:column;
    box-shadow: var(--shadow); transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
  }
  .card:hover{
    transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--sage-soft);
  }
  .card.featured{
    background: linear-gradient(180deg, var(--deep) 0%, var(--deep-2) 100%);
    color: #fff; border: none; transform: translateY(-8px);
    box-shadow: 0 25px 60px -20px rgba(29,58,49,0.55);
  }
  .card.featured:hover{ transform: translateY(-12px); }
  .ribbon{
    position:absolute; top:-12px; right:50%; transform: translateX(50%);
    background: linear-gradient(135deg, var(--gold), #B8853F);
    color:#fff; font-weight:800; font-size: 12px;
    padding: 5px 14px; border-radius: 999px;
    box-shadow: 0 8px 16px -4px rgba(199,154,87,0.6); white-space:nowrap;
  }
  .plan-name{ font-size: 18px; font-weight: 800; margin: 0 0 8px; color: var(--deep); }
  .card.featured .plan-name{ color: #fff; }
  .plan-desc{ font-size: 13px; line-height:1.7; color: var(--ink-soft); min-height: 40px; margin-bottom: 16px; }
  .card.featured .plan-desc{ color: rgba(255,255,255,0.72); }
  .price-row{ margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px dashed var(--line); }
  .card.featured .price-row{ border-color: rgba(255,255,255,0.18); }
  .price{ display:flex; align-items:baseline; gap:4px; }
  .price .num{ font-size: 32px; font-weight: 900; color: var(--deep); }
  .card.featured .price .num{ color:#fff; }
  .price .cur{ font-size: 15px; font-weight:700; color: var(--sage); }
  .card.featured .price .cur{ color: var(--sage-soft); }
  .price-cycle{ font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
  .card.featured .price-cycle{ color: rgba(255,255,255,0.6); }
  .features{ list-style:none; margin:0 0 22px; padding:0; flex:1; }
  .features li{
    display:flex; align-items:center; justify-content:space-between; gap: 8px;
    font-size: 13px; padding: 8px 0; color: var(--ink); border-bottom: 1px solid var(--line);
  }
  .card.featured .features li{ color: rgba(255,255,255,0.92); border-color: rgba(255,255,255,0.12); }
  .features li:last-child{ border-bottom:none; }
  .check{
    width: 18px; height:18px; border-radius:50%;
    background: rgba(111,163,201,0.18); display:flex; align-items:center; justify-content:center; flex-shrink:0;
  }
  .check svg{ width:10px; height:10px; }
  .check svg path{ stroke: var(--deep); }
  .card.featured .check{ background: rgba(255,255,255,0.16); }
  .card.featured .check svg path{ stroke: #fff; }
  .cta{
    display:block; text-align:center; padding: 12px 18px; border-radius: 12px; width: 100%;
    font-weight: 800; font-size: 13.5px; text-decoration:none; cursor:pointer;
    border: 1px solid var(--line); background: var(--mint-bg); color: var(--deep);
    transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
  }
  .cta:hover{ transform: translateY(-2px); }
  .cta.gold{
    background: linear-gradient(135deg, var(--gold), #B8853F);
    border:none; color:#fff; box-shadow: 0 12px 24px -10px rgba(199,154,87,0.65);
  }
  .cta.solid-deep{ background: var(--deep); border:none; color:#fff; box-shadow: 0 12px 24px -10px rgba(29,58,49,0.5); }
  `;

  return (
    <>
      <AppBar title="ترقية الباقة" backHref="/my-subscription" />
      <div className="pricing-page-container" dir="rtl">
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

        <div className="wrap mt-2">
          <header className="hero">
            <h1 className="pricing-title">
              اختر الباقة المناسبة <span>لترقية</span> صيدليتك
            </h1>
            <p className="sub">
              يمكنك الترقية في أي وقت بكل سهولة. سيتم احتساب قيمة الأيام
              المتبقية من اشتراكك الحالي وخصمها من قيمة الاشتراك الجديد
              تلقائياً.
            </p>
          </header>

          <div className="grid">
            <div className="card">
              <div className="plan-name">الرخصة الدائمة</div>
              <div className="plan-desc">
                امتلك النظام للأبد بدون أي التزامات شهرية أو سنوية.
              </div>
              <div className="price-row">
                <div className="price">
                  <span className="num">1,499</span>
                  <span className="cur">$</span>
                </div>
                <div className="price-cycle">تُدفع مرة واحدة فقط</div>
              </div>
              <ul className="features">
                <li>
                  كل الميزات متضمّنة{" "}
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
                <li>
                  لا يوجد أي رسوم إضافية{" "}
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
                <li>
                  استضافة سحابية مجانية لمدة سنة{" "}
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
                <li>
                  دعم فنّي VIP{" "}
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
              </ul>
              <button
                onClick={() => handleUpgrade("الرخصة الدائمة")}
                className="cta"
              >
                ترقية للرخصة الدائمة
              </button>
            </div>

            <div className="card featured">
              <div className="ribbon">الأكثر توفيرًا</div>
              <div className="plan-name">الاشتراك السنوي</div>
              <div className="plan-desc">
                وفّر 20% مع الاشتراك السنوي واشترِ راحة بالك.
              </div>
              <div className="price-row">
                <div className="price">
                  <span className="num">499</span>
                  <span className="cur">$</span>
                </div>
                <div className="price-cycle">سنويًا</div>
              </div>
              <ul className="features">
                <li>
                  كل ميزات الباقة الشهرية{" "}
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
                <li>
                  فروع غير محدودة{" "}
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
                <li>
                  تحديثات مجانية مستمرة{" "}
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
                <li>
                  مستشار مبيعات خاص{" "}
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
              </ul>
              <button
                onClick={() => handleUpgrade("الاشتراك السنوي")}
                className="cta gold"
              >
                ترقية للاشتراك السنوي
              </button>
            </div>

            <div className="card">
              <div className="plan-name">الاشتراك الشهري</div>
              <div className="plan-desc">
                الخيار الأمثل لإدارة صيدليتك بدفع بسيط شهريًا.
              </div>
              <div className="price-row">
                <div className="price">
                  <span className="num">49</span>
                  <span className="cur">$</span>
                </div>
                <div className="price-cycle">شهريًا</div>
              </div>
              <ul className="features">
                <li>
                  كل ميزات التجربة{" "}
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
                <li>
                  تقارير وتحليلات ذكية{" "}
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
                <li>
                  حتى 3 فروع{" "}
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
                <li>
                  دعم فنّي فوري (واتساب){" "}
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
              </ul>
              <button
                onClick={() => handleUpgrade("الاشتراك الشهري")}
                className="cta solid-deep"
              >
                تجديد أو ترقية للشهرية
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
