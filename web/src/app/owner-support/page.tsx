"use client";

import AppBar from "@/components/AppBar";
import { useState } from "react";
import toast from "react-hot-toast";
import useSWR from "swr";
import { useStore } from "@/store";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OwnerSupportPage() {
  const user = useStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, mutate } = useSWR(
    user
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/tickets`
      : null,
    fetcher,
  );
  const tickets = data?.tickets || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    setLoading(true);
    try {
      const ticketId = "TCK-" + Math.floor(1000 + Math.random() * 9000);
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
          "/api/admin/tickets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: ticketId,
            pharmacy_id: user?.pharmacy_id,
            subject,
            text: message,
            sender: user?.managerName || "مدير النظام",
            date: new Date().toLocaleString("ar-EG"),
            priority: "medium",
          }),
        },
      );
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);

      toast.success("تم إرسال تذكرتك بنجاح، سيقوم الدعم الفني بالرد قريباً");
      setSubject("");
      setMessage("");
      setActiveTab("history");
      mutate(); // refresh tickets list
    } catch (err) {
      toast.error("حدث خطأ أثناء إرسال التذكرة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar title="الدعم الفني" backHref="/more" />
      <main className="max-w-4xl mx-auto p-4 pb-24 space-y-6 mt-4">
        <div className="flex bg-mint-line/30 rounded-xl p-1 mb-2">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "new" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            تذكرة جديدة
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 rounded-lg text-[14px] font-bold transition-all ${activeTab === "history" ? "bg-white text-primary shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            تذاكري السابقة
          </button>
        </div>

        {activeTab === "new" ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-mint-line rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                موضوع التذكرة
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثال: مشكلة في الطابعة"
                className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                التفاصيل
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اشرح المشكلة أو الاستفسار بالتفصيل هنا..."
                rows={5}
                className="w-full bg-bg border border-mint-line rounded-xl p-3 focus:outline-none focus:border-primary resize-none"
              ></textarea>
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-md shadow-primary/20 hover:bg-teal transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              {loading ? "جاري الإرسال..." : "إرسال التذكرة"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: any) => (
              <div
                key={ticket.id}
                className="bg-white border border-mint-line rounded-2xl p-4 shadow-sm cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-ink text-[15px]">
                    {ticket.subject}
                  </h4>
                  <span className="text-[12px] font-bold text-ink-soft bg-bg px-2 py-1 rounded-lg">
                    {ticket.id}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span
                    className={`text-[12px] font-bold px-3 py-1 rounded-full ${ticket.status === "resolved" || ticket.status === "مغلقة" ? "bg-mint-line text-ink-soft" : "bg-amber-pale text-amber"}`}
                  >
                    {ticket.status === "resolved"
                      ? "مغلقة"
                      : "مفتوحة / قيد المراجعة"}
                  </span>
                  <span className="text-[12px] font-semibold text-ink-soft">
                    {ticket.date}
                  </span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="text-center p-8 text-ink-soft border border-dashed border-mint-line rounded-2xl">
                لا يوجد لديك أي تذاكر سابقة
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
