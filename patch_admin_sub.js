const fs = require('fs');

let page = fs.readFileSync('web/src/app/admin/page.tsx', 'utf8');

page = page.replace(
  '<h3 className="font-black text-[22px] mb-1">\n                        الاشتراك السنوي (Premium)\n                      </h3>',
  `<h3 className="font-black text-[22px] mb-1">
                        {language === "en" ? "Annual Subscription (Premium)" : "الاشتراك السنوي (Premium)"}
                      </h3>`
);

page = page.replace(
  '<p className="text-white/80 font-bold mb-4">\n                        يسمح لك بإدارة حتى 5 فروع مع تقارير متقدمة.\n                      </p>',
  `<p className="text-white/80 font-bold mb-4">
                        {language === "en" ? "Allows you to manage up to 5 branches with advanced reports." : "يسمح لك بإدارة حتى 5 فروع مع تقارير متقدمة."}
                      </p>`
);

page = page.replace(
  '<div className="font-bold font-mono text-[18px]">\n                            3 / 5\n                          </div>',
  `<div className="font-bold font-mono text-[18px]" dir="ltr">
                            3 / 5
                          </div>`
);

fs.writeFileSync('web/src/app/admin/page.tsx', page, 'utf8');
console.log('Fixed admin subscription placeholder translations and LTR rendering for fractions');
