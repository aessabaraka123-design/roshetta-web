
const fs = require('fs');
let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

const regex = /\{user\?\.isReadOnly && \([\s\S]*?<\/div>\s*\)\}/;

const newBanner = `{user?.isReadOnly && (
        <div
          className="text-white text-center py-2 px-4 font-bold text-sm shadow-md sticky top-0 z-[9999] flex items-center justify-center gap-3 flex-wrap transition-colors duration-500"
          style={{ backgroundColor: isRejected ? "#B91C1C" : "#EF4444" }}
        >
          {isRejected ? (
            <>
              <span>{language === "en" ? "Receipt rejected. Please review with technical support." : "تم رفض إيصال الدفع، يرجى مراجعة الدعم الفني."}</span>
              <a
                href="https://wa.me/972590000000" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-green-600 transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                style={{
                  background: "#22c55e",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                💬 {language === "en" ? "WhatsApp Support" : "الدعم الفني عبر واتساب"}
              </a>
            </>
          ) : (
            <>
              <span>{language === "en" ? "App in Read-Only mode. Awaiting admin approval. Please check your receipt." : "التطبيق في وضع القراءة فقط. بانتظار موافقة المسؤول على تأكيد الاشتراك. راجع إيصالك."}</span>
              <Link
                href="/receipt-upload"
                className="bg-white text-red-600 rounded-lg px-3 py-1 text-xs font-bold hover:bg-red-50 transition-colors shrink-0 shadow-sm"
                style={{
                  color: "#EF4444",
                  background: "white",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
              >
                📄 {language === "en" ? "Review Receipt" : "راجع إيصالك"}
              </Link>
            </>
          )}
        </div>
      )}`;

layout = layout.replace(regex, newBanner);
fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
