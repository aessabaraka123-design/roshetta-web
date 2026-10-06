const fs = require('fs');
let c = fs.readFileSync('web/src/app/pricing/page.tsx', 'utf8');

const newMap = `const translateFeature = (feature: string, lang: string) => {
  if (lang !== 'en') return feature;
  if (!feature) return feature;
  const map: Record<string, string> = {
    "وصول كامل لجميع ميزات النظام": "Full access to all system features",
    "تجربة 14 يوماً بدون بطاقة ائتمانية": "14-day trial without credit card",
    "تجربة 14 يوما بدون بطاقة ائتمانية": "14-day trial without credit card",
    "إضافة موظفين للتجربة بحرية": "Add staff freely during trial",
    "دعم فني وإرشادي للبدء": "Tech and guidance support to start",
    
    "إدارة شاملة للمخزون والمبيعات": "Comprehensive inventory and sales management",
    "تحديثات دورية مجانية": "Free periodic updates",
    "دعم فني متواصل 24/7": "24/7 continuous tech support",
    "يدعم حتى 3 فروع وصلاحيات دقيقة": "Supports up to 3 branches and precise permissions",
    
    "جميع ميزات الباقة الشهرية": "All features of the monthly plan",
    "توفير 20% من قيمة الاشتراك": "Save 20% of subscription value",
    "عدد غير محدود من الفروع والموظفين": "Unlimited branches and staff",
    "تقارير مالية وإحصائيات متقدمة": "Financial reports and advanced statistics",
    
    "جميع الميزات السابقة مدى الحياة": "All previous features for life",
    "دفع لمرة واحدة فقط (بدون تجديد)": "Pay only once (no renewal)",
    "أولوية قصوى للدعم الفني (VIP)": "Top priority for tech support (VIP)",
    "أمان استثنائي ونسخ احتياطي سحابي": "Exceptional security and cloud backup"
  };
  
  const f = feature.trim();
  if (map[f]) return map[f];
  
  // Partial matches
  if (f.includes('وصول كامل')) return "Full access to all system features";
  if (f.includes('بدون بطاقة')) return "14-day trial without credit card";
  if (f.includes('إضافة موظفين')) return "Add staff freely during trial";
  if (f.includes('إرشادي')) return "Tech and guidance support to start";
  if (f.includes('شاملة للمخزون')) return "Comprehensive inventory and sales management";
  if (f.includes('تحديثات دورية')) return "Free periodic updates";
  if (f.includes('متواصل 24/7')) return "24/7 continuous tech support";
  if (f.includes('3 فروع وصلاحيات')) return "Supports up to 3 branches and precise permissions";
  if (f.includes('جميع ميزات الباقة الشهرية')) return "All features of the monthly plan";
  if (f.includes('توفير 20%')) return "Save 20% of subscription value";
  if (f.includes('غير محدود')) return "Unlimited branches and staff";
  if (f.includes('تقارير مالية')) return "Financial reports and advanced statistics";
  if (f.includes('السابقة مدى الحياة')) return "All previous features for life";
  if (f.includes('دفع لمرة واحدة')) return "Pay only once (no renewal)";
  if (f.includes('أولوية قصوى')) return "Top priority for tech support (VIP)";
  if (f.includes('أمان استثنائي')) return "Exceptional security and cloud backup";
  
  // Fallbacks from previous dictionary
  if (f.includes('متضمنة') || f.includes('متضمّنة')) return 'All features included';
  if (f.includes('رسوم')) return 'No additional fees';
  if (f.includes('سحابية')) return 'Free cloud hosting for one year';
  if (f.includes('VIP')) return 'VIP Technical Support';
  if (f.includes('الشهرية')) return 'All features of the monthly plan';
  if (f.includes('تحديثات')) return 'Continuous free updates';
  if (f.includes('مبيعات')) return 'Dedicated Sales Consultant';
  if (f.includes('تحليلات')) return 'Smart Analytics & Reports';
  if (f.includes('3 فروع')) return 'Up to 3 branches';
  if (f.includes('فوري')) return 'Instant Tech Support';
  if (f.includes('التجربة')) return 'All Trial features';
  
  return feature;
};`;

const oldMapRegex = /const translateFeature = \(feature: string, lang: string\) => \{[\s\S]*?\n\};\n/m;
c = c.replace(oldMapRegex, newMap + '\n');

fs.writeFileSync('web/src/app/pricing/page.tsx', c, 'utf8');
console.log('Updated translation map for features');
