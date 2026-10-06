const fs = require('fs');

let content = fs.readFileSync('web/src/components/SocketProvider.tsx', 'utf8');

const oldToast = `toast(
        (t) => (
          <div className="flex gap-3 items-start p-1" style={{ direction: language === "en" ? "ltr" : "rtl" }}>
            <div className="text-2xl mt-1">
              {data.type === "system_alert" ? "📢" : "💡"}
            </div>
            <div>
              <h4 className="font-bold text-ink mb-1">{data.title}</h4>
              <p className="text-sm text-ink-soft">{data.body}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: "top-center",
          style: {
            borderRadius: '16px',
            border: '1px solid rgba(13, 148, 136, 0.2)',
            padding: '16px',
          }
        }
      );`;

const newToast = `toast.custom(
        (t) => (
          <div
            className={\`\${
              t.visible ? "animate-enter" : "animate-leave"
            } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5\`}
            style={{ direction: language === "en" ? "ltr" : "rtl" }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="shrink-0 pt-0.5 text-2xl">
                  {data.type === "system_alert" ? "📢" : "💡"}
                </div>
                <div className={\`ml-3 flex-1 \${language === "en" ? "ml-3" : "mr-3"}\`}>
                  <p className="text-sm font-bold text-ink">
                    {data.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {data.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-mint-line">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary hover:text-teal focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {language === "en" ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        ),
        { duration: 6000, position: "top-center" }
      );`;

if (content.includes('toast(') && content.includes('data.type === "system_alert"')) {
  content = content.replace(oldToast, newToast);
  fs.writeFileSync('web/src/components/SocketProvider.tsx', content, 'utf8');
  console.log('Fixed toast to use toast.custom');
} else {
  console.log('Could not find the old toast to replace!');
}
