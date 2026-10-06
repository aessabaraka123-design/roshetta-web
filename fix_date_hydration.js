const fs = require('fs');
let c = fs.readFileSync('web/src/app/page.tsx', 'utf8');

c = c.replace(
  /<p[\s\S]*?suppressHydrationWarning[\s\S]*?className="text-\[15px\] text-ink-soft font-medium"[\s\S]*?>[\s\S]*?<\/p>/,
  `<p className="text-[15px] text-ink-soft font-medium">
            {mounted ? new Date().toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }) : ""}
            {" "}
            —{" "}
            {isManager
              ? t.dashboard.summary_today
              : \`\${t.dashboard.summary_today_branch} \${user.branch || ""}\`}
          </p>`
);

fs.writeFileSync('web/src/app/page.tsx', c, 'utf8');
console.log('Fixed date rendering with mounted');
