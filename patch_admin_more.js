const fs = require('fs');

let page = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

page = page.replace(
  '<div className="text-[12px] text-white/80">\n                            تاريخ التجديد القادم\n                          </div>',
  `<div className="text-[12px] text-white/80">
                            {language === "en" ? "Next Renewal Date" : "تاريخ التجديد القادم"}
                          </div>`
);

page = page.replace(
  'ترقية الباقة (فروع أكثر)\n                        </a>',
  `{language === "en" ? "Upgrade Plan (More Branches)" : "ترقية الباقة (فروع أكثر)"}
                        </a>`
);

page = page.replace(
  'تحميل فواتير الاشتراك\n                      </button>',
  `{language === "en" ? "Download Invoices" : "تحميل فواتير الاشتراك"}
                      </button>`
);

fs.writeFileSync('web/src/app/admin/page.tsx', page, 'utf8');
console.log('Fixed more admin translations');
