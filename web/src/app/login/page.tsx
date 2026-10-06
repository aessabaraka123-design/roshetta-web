"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RoshettaLogo from "@/components/RoshettaLogo";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/store";

export default function Login() {
  const router = useRouter();
  const loginFn = useStore((state) => state.login);
  const language = useStore((state: any) => state.language);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("roshetta_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const customStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap');
  :root{
    --deep: #223E56;
    --deep-2: #2B516E;
    --sky: #6FA3C9;
    --sky-soft: #A8C7DD;
    --pale-bg: #EFF5FA;
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
 
  .login-page-container {
    margin:0; padding:0;
    color: var(--ink);
    font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
    -webkit-font-smoothing: antialiased;
    min-height:100vh;
    display:flex; align-items:center; justify-content:center;
    padding: 48px 20px;
    position: relative;
    overflow-x:hidden;
  }
 
  .bg-decor{ position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow:hidden; }
  .bg-decor svg{ position:absolute; }
  .blob-1{ top:-180px; right:-160px; width:620px; }
  .blob-2{ bottom:-220px; left:-180px; width:700px; }
 
  .shell{
    position:relative; z-index:1;
    width: 100%; max-width: 460px;
  }
 
  .header{
    background: linear-gradient(165deg, var(--deep) 0%, var(--deep-2) 100%);
    border-radius: 26px 26px 0 0;
    padding: 40px 36px 76px;
    text-align:center;
    color:#fff;
    position:relative;
  }
 
  .brand{ display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom: 22px; }
  .brand-mark{
    display:flex; align-items:center; justify-content:center;
  }
  .brand-name{ font-weight:800; font-size:19px; }
 
  .header h1{ font-size: 15.5px; font-weight:700; margin: 0 0 8px; color: #fff; }
  .header p{ font-size: 12.5px; color: rgba(255,255,255,0.62); font-weight:600; margin:0; }
 
  .card{
    background: var(--paper);
    border-radius: 24px;
    margin-top: -46px;
    padding: 36px 34px 30px;
    box-shadow: var(--shadow-lg);
    position:relative; z-index:2;
  }
 
  .card-title{ text-align:center; margin-bottom: 30px; }
  .card-title h2{ font-size: 22px; font-weight: 800; color: var(--deep); margin: 0 0 8px; }
  .card-title p{ font-size: 13.5px; color: var(--ink-soft); margin:0; }
 
  .field{ margin-bottom: 20px; }
  .field label{ display:block; font-size:13px; font-weight:700; color: var(--deep); margin-bottom: 9px; }
 
  .input-wrap{ position:relative; }
  .field input{
    width:100%;
    border: 1.5px solid var(--line);
    background: var(--pale-bg);
    border-radius: 13px;
    padding: 13px 44px 13px 16px;
    font-family: inherit; font-size: 14px; color: var(--ink);
    outline:none;
    transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
  }
  .field input::placeholder{ color:#9AA9B4; }
  .field input:focus{
    border-color: var(--sky);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(111,163,201,0.16);
  }
  .input-wrap svg{
    position:absolute; right:15px; top:50%; transform:translateY(-50%);
    width:16px; height:16px; pointer-events:none;
  }
  .input-wrap svg path, .input-wrap svg circle{ stroke: var(--ink-soft); }
  .toggle-eye{
    position:absolute; left:15px; top:50%; transform:translateY(-50%);
    cursor:pointer; width:16px; height:16px; pointer-events:auto !important;
  }
  .toggle-eye path{ stroke: var(--ink-soft); }
 
  .submit-btn{
    width:100%;
    display:flex; align-items:center; justify-content:center; gap:9px;
    background: linear-gradient(135deg, var(--deep), var(--deep-2));
    color:#fff; border:none;
    padding: 15px 20px; border-radius: 14px;
    font-family:inherit; font-weight:800; font-size:15px;
    cursor:pointer;
    box-shadow: 0 16px 32px -14px rgba(34,62,86,0.5);
    transition: transform .2s ease, box-shadow .2s ease;
    margin-top: 8px;
  }
  .submit-btn:hover{ transform: translateY(-2px); box-shadow: 0 20px 38px -14px rgba(34,62,86,0.55); }
 
  .remember-row{ display:flex; align-items:center; gap:8px; margin-bottom: 20px; }
  .remember-row input{ width:16px; height:16px; cursor:pointer; accent-color: var(--sky); margin:0; }
  .remember-row label{ font-size:13px; color: var(--ink-soft); font-weight:600; cursor:pointer; margin:0; display:inline-block; }

 
  .divider-row{ display:flex; align-items:center; gap:12px; margin: 22px 0; }
  .divider-row .line{ flex:1; height:1px; background: var(--line); }
  .divider-row span{ font-size:12px; color: var(--ink-soft); font-weight:600; }
 
  .demo-btn{
    width:100%;
    display:flex; align-items:center; justify-content:center; gap:8px;
    background: var(--pale-bg);
    border: 1.5px solid var(--sky-soft);
    color: var(--deep);
    padding: 13px 18px; border-radius: 13px;
    font-family:inherit; font-weight:700; font-size:13.5px;
    cursor:pointer;
    transition: background .2s ease, transform .2s ease;
  }
  .demo-btn:hover{ background: #fff; transform: translateY(-1px); }
  .demo-btn svg{ width:15px; height:15px; }
  .demo-btn svg path{ stroke: var(--sky); }
 
  .footer-row{
    text-align:center; margin-top: 26px;
    padding-top: 20px; border-top: 1px solid var(--line);
    font-size: 13.5px; color: var(--ink-soft);
  }
  .footer-row a{ color: var(--deep); font-weight:800; text-decoration:none; }
  .footer-row a:hover{ text-decoration:underline; }
 
  .legal{
    text-align:center; margin-top: 22px;
    font-size: 11.5px; color: var(--ink-soft); line-height:1.8;
  }
  .legal a{ color: var(--sky); text-decoration:none; }
 
  .credit{
    text-align:center; margin-top: 14px;
    font-size: 11px; color: #9AA9B4;
  }
  `;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const data = await res.json();
      if (data.success) {
        if (rememberMe) {
          localStorage.setItem("roshetta_remembered_email", email);
        } else {
          localStorage.removeItem("roshetta_remembered_email");
        }

        loginFn(data.user);
        toast.success(language === "en" ? `Welcome, ${data.user.managerName || "Pharmacy Manager"}` : `أهلاً بك، ${data.user.managerName || "مدير الصيدلية"}`);
        if (data.user.role === "superadmin") {
          router.push("/super-admin");
        } else {
          router.push("/");
        }
      } else {
        toast.error(data.error || (language === "en" ? "Login error" : "خطأ في تسجيل الدخول"));
      }
    } catch (error) {
      toast.error(language === "en" ? "Cannot connect to server" : "لا يمكن الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container" dir="rtl">
      <style>{customStyles}</style>

      <div className="bg-decor">
        <svg
          className="blob-1"
          viewBox="0 0 800 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M410.5 752.5C282.5 798 111.5 700 48.5 561.5c-63-138.5 28-306 137.5-408.5C295.5 50.5 454.5-9.5 587.5 41c133 50.5 240 186.5 264 321.5 24 135-35 269-137.5 352-102.5 83-203.5 38-303.5 38z"
            fill="#E6EEF4"
          />
        </svg>
        <svg
          className="blob-2"
          viewBox="0 0 800 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M465 677.5C334 766 128 734.5 49 590.5c-79-144 8-320 126-444.5C293 21.5 455-14 590 53c135 67 243 198 259 342.5 16 144.5-60 274.5-167 335.5-107 61-217-53.5-217-53.5z"
            fill="#F0F5F9"
          />
        </svg>
      </div>

      <div className="shell">
        <div className="header">
          <div className="brand">
            <div className="brand-mark">
              <RoshettaLogo className="w-12 h-12" />
            </div>
            <div className="brand-name">روشتة</div>
          </div>
          <h1>مرحباً بك مجدداً في نظام إدارة الصيدليات</h1>
          <p>يرجى إدخال بيانات الدخول الخاصة بصيدليتك</p>
        </div>

        <div className="card">
          <div className="card-title">
            <h2>تسجيل الدخول</h2>
            <p>أدخل بياناتك للمتابعة</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>البريد الإلكتروني</label>
              <div className="input-wrap">
                <input
                  type="email"
                  placeholder="pharmacy@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2.5"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M3 7l9 6 9-6"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="field">
              <label>كلمة المرور</label>
              <div className="input-wrap">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="5"
                    y="11"
                    width="14"
                    height="9"
                    rx="2"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 11V7.5a4 4 0 0 1 8 0V11"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <svg
                  className="toggle-eye"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling
                      ?.previousElementSibling as HTMLInputElement;
                    if (input) {
                      input.type =
                        input.type === "password" ? "text" : "password";
                    }
                  }}
                >
                  <path
                    d="M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2M6.5 6.7C4 8.3 2.3 10.7 2 12c.9 3.3 5 8 10 8 1.7 0 3.3-.5 4.7-1.3M17.9 17.9C20 16.2 21.6 13.9 22 12c-.6-2.2-2.5-4.9-5.2-6.7C15.3 4.3 13.7 3.7 12 3.7c-1 0-2 .2-3 .5"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="remember-row">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">تذكرني</label>
            </div>

            <button disabled={loading} type="submit" className="submit-btn">
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>

            <div className="footer-row">
              ليس لديك حساب؟ <Link href="/pricing">اشترك الآن</Link>
            </div>
          </form>
        </div>

        <div className="legal">
          بالمتابعة أنت توافق على <Link href="#">شروط الاستخدام</Link> و
          <Link href="#">سياسة الخصوصية</Link>
        </div>
        <div className="credit">تم التطوير بواسطة م. عيسى بركة</div>
      </div>
    </div>
  );
}
