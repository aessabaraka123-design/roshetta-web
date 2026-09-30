"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RoshettaLogo from "@/components/RoshettaLogo";

export default function Pricing() {
  const router = useRouter();

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
  footer{
    text-align:center; margin-top: 72px; padding-top: 26px; border-top: 1px solid var(--line);
    color: var(--ink-soft); font-size: 13px; line-height: 1.9;
  }
  footer strong{ color: var(--deep); }
  `;

  return (
    <div className="pricing-page-container" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      <div className="bg-decor">
        <svg className="blob-1" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
          <path fill="#DCEBF5" d="M421,318Q404,436,286,447Q168,458,120,349Q72,240,164,158Q256,76,354,133Q452,190,421,318Z"/>
        </svg>
        <svg className="blob-2" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
          <path fill="#E9F2F9" d="M437,305Q423,410,320,441Q217,472,132,404Q47,336,89,231Q131,126,246,112Q361,98,411,201Q461,304,437,305Z"/>
        </svg>
        <svg className="leaf-vein" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0 C 20 50, 20 150, 50 200" stroke="#6FA3C9" strokeWidth="2" fill="none"/>
          <path d="M50 30 C 40 40, 35 45, 25 45" stroke="#6FA3C9" strokeWidth="1.5" fill="none"/>
          <path d="M50 80 C 65 90, 72 95, 82 95" stroke="#6FA3C9" strokeWidth="1.5" fill="none"/>
          <path d="M50 130 C 38 140, 32 145, 20 145" stroke="#6FA3C9" strokeWidth="1.5" fill="none"/>
        </svg>
      </div>

      <div className="wrap">
        <header className="hero">
          <div className="badge flex gap-2 items-center">
            <RoshettaLogo showText={true} className="w-5 h-5" textClassName="font-bold text-[14px] text-ink" />
          </div>

          <h1 className="pricing-title">النظام الأذكى <span>لإدارة</span> صيدليتك</h1>

          <p className="sub">
            كل ما تحتاجه لإدارة صيدليتك في مكان واحد، بواجهة بسيطة لا تحتاج شرحًا.
            اختر الباقة المناسبة لحجم عملك، وابدأ خلال دقائق.
          </p>

          <Link href="/login" className="login-pill">
            لديك حساب صيدلية بالفعل؟ تسجيل الدخول
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="#1B3A5C" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M10 17L15 12L10 7" stroke="#1B3A5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="#1B3A5C" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </Link>
        </header>

        <div className="grid">
          <div className="card">
            <div className="plan-header">
              <div className="plan-name">الرخصة الدائمة</div>
              <div className="offer-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                لفترة محدودة
              </div>
            </div>
            <div className="plan-desc">امتلك النظام للأبد بدون أي التزامات شهرية أو سنوية.</div>
            <div className="price-row">
              <div className="price" style={{ position: 'relative' }}>
                <span className="num">1,499</span><span className="cur">$</span>
                <span style={{ textDecoration: 'line-through', color: 'var(--ink-soft)', fontSize: '16px', opacity: 0.6, alignSelf: 'flex-start', marginLeft: '6px', marginTop: '6px' }}>$1,999</span>
              </div>
              <div className="price-cycle">تُدفع مرة واحدة فقط</div>
            </div>
            <ul className="features">
              <li>كل الميزات متضمّنة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>لا يوجد أي رسوم إضافية <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>استضافة سحابية مجانية لمدة سنة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>دعم فنّي VIP <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
            </ul>
            <button onClick={() => router.push("/register?plan=lifetime")} className="cta">شراء الرخصة الدائمة</button>
          </div>

          <div className="card featured">
            <div className="plan-header">
              <div className="plan-name">الاشتراك السنوي</div>
              <div className="offer-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                لفترة محدودة
              </div>
            </div>
            <div className="plan-desc">وفّر 20% مع الاشتراك السنوي واشترِ راحة بالك.</div>
            <div className="price-row">
              <div className="price" style={{ position: 'relative' }}>
                <span className="num">499</span><span className="cur">$</span>
                <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.6)', fontSize: '16px', alignSelf: 'flex-start', marginLeft: '6px', marginTop: '6px' }}>$600</span>
              </div>
              <div className="price-cycle">سنويًا</div>
            </div>
            <ul className="features">
              <li>كل ميزات الباقة الشهرية <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>فروع غير محدودة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>تحديثات مجانية مستمرة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>مستشار مبيعات خاص <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
            </ul>
            <button onClick={() => router.push("/register?plan=annual")} className="cta gold">اشترك ووفّر 20% الآن</button>
          </div>

          <div className="card">
            <div className="plan-header">
              <div className="plan-name">الاشتراك الشهري</div>
              <div className="offer-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                لفترة محدودة
              </div>
            </div>
            <div className="plan-desc">الخيار الأمثل لإدارة صيدليتك بدفع بسيط شهريًا.</div>
            <div className="price-row">
              <div className="price" style={{ position: 'relative' }}>
                <span className="num">49</span><span className="cur">$</span>
                <span style={{ textDecoration: 'line-through', color: 'var(--ink-soft)', fontSize: '16px', opacity: 0.6, alignSelf: 'flex-start', marginLeft: '6px', marginTop: '6px' }}>$60</span>
              </div>
              <div className="price-cycle">شهريًا</div>
            </div>
            <ul className="features">
              <li>كل ميزات التجربة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>تقارير وتحليلات ذكية <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>حتى 3 فروع <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>دعم فنّي فوري (واتساب) <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
            </ul>
            <button onClick={() => router.push("/register?plan=monthly")} className="cta solid-deep">اختيار الباقة الشهرية</button>
          </div>

          <div className="card">
            <div className="plan-name">التجربة المجانية</div>
            <div className="plan-desc">جرّب النظام بكامل ميزاته وتأكّد من ملاءمته لصيدليتك.</div>
            <div className="price-row">
              <div className="price"><span className="num">0</span><span className="cur">$</span></div>
              <div className="price-cycle">لمدة 14 يوم</div>
            </div>
            <ul className="features">
              <li>إدارة مخزون متكاملة <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>شاشة كاشير سريعة (POS) <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>فرع واحد <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
              <li>دعم فنّي عبر البريد <span className="check"><svg viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span></li>
            </ul>
            <button onClick={() => router.push("/register?plan=free")} className="cta mint-solid">ابدأ تجربتك المجانية</button>
          </div>

        </div>

        <footer>
          جميع الحقوق محفوظة لبرنامج روشتة © 2026<br />
          تم التطوير بشغف بواسطة المهندس <strong>عيسى بركة</strong>
        </footer>
      </div>
    </div>
  );
}
