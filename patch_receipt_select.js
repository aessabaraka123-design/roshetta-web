const fs = require('fs');

let rcpt = fs.readFileSync('web/src/app/receipt-upload/page.tsx', 'utf8');

const regex = /<select[\s\S]*?value=\{plan\}[\s\S]*?onChange=\{[\s\S]*?\}[\s\S]*?>[\s\S]*?<\/select>/m;

const readOnlyCode = `{(() => {
              const selectedP = plans.find(p => p.id === plan);
              return (
                <div style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  fontFamily: "'Cairo',sans-serif",
                  background: "#f8fafc",
                  color: "var(--deep)",
                  fontWeight: 600
                }}>
                  {selectedP ? \`\${selectedP.name} - $\${selectedP.price}\` : (language === "en" ? "Loading..." : "جاري التحميل...")}
                </div>
              );
            })()}`;

rcpt = rcpt.replace(regex, readOnlyCode);

fs.writeFileSync('web/src/app/receipt-upload/page.tsx', rcpt, 'utf8');
console.log('Fixed plan select field');
