const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const target =           const cats = getMedCategory(med);
          const isOut = cats.includes("out");
          const isExpiring = cats.includes("expiring");
          const tag = isOut ? "‰›œ " : isExpiring ? "ﬁ«—»   ‰ ÂÌ" : "„ Ê›—";
          const tagColorClass = isOut ? "bg-coral-pale text-coral" : isExpiring ? "bg-amber-pale text-[#B9791C]" : "bg-teal-pale text-teal";;

const replacement =           const cats = getMedCategory(med);
          const isOut = cats.includes("out");
          const isExpiring = cats.includes("expiring");
          const isControlled = cats.includes("controlled");
          const tag = isOut ? "‰›œ " : isExpiring ? "ﬁ«—»   ‰ ÂÌ" : isControlled ? "„—«ﬁ»…" : "„ Ê›—";
          const tagColorClass = isOut ? "bg-coral-pale text-coral" : isExpiring ? "bg-amber-pale text-[#B9791C]" : isControlled ? "bg-primary-pale text-primary" : "bg-teal-pale text-teal";;

code = code.replace(target, replacement);
fs.writeFileSync('web/src/app/inventory/page.tsx', code);
