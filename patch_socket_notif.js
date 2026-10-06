const fs = require('fs');
let content = fs.readFileSync('web/src/components/SocketProvider.tsx', 'utf8');

// Insert new_notification listener
content = content.replace(
  'newSocket.on("disconnect", () => {',
  `newSocket.on("new_notification", (data) => {
      console.log("New realtime notification:", data);
      
      // Force SWR to re-fetch notifications immediately
      mutate(
        (key) => typeof key === "string" && key.includes("/notifications"),
        undefined,
        { revalidate: true }
      );
      
      // Play a sound? Maybe just a toast for now
      toast(
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
      );
    });

    newSocket.on("disconnect", () => {`
);

fs.writeFileSync('web/src/components/SocketProvider.tsx', content, 'utf8');
console.log('Added new_notification socket listener');
