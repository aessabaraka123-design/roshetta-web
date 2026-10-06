const fs = require('fs');
let c = fs.readFileSync('web/src/app/pricing/page.tsx', 'utf8');

// 1. Remove the old definitions
const blockToRemove = `const translatePlanName = (name: string, lang: string) => {
  if (lang !== 'en') return name;
  if (!name) return name;
  if (name.includes('تجريبية') || name.includes('مجان')) return 'Free Trial';
  if (name.includes('شهري')) return 'Monthly Subscription';
  if (name.includes('سنوي')) return 'Annual Subscription';
  if (name.includes('الحياة') || name.includes('دائم')) return 'Lifetime License';
  return name;
};

const translateFeature = (feature: string, lang: string) => {
  if (lang !== 'en') return feature;
  if (!feature) return feature;
  const map: Record<string, string> = {
    "كل الميزات متضمّنة": "All features included",
    "كل الميزات متضمنة": "All features included",
    "لا يوجد أي رسوم إضافية": "No additional fees",
    "استضافة سحابية مجانية لمدة سنة": "Free cloud hosting for one year",
    "دعم فنّي VIP": "VIP Technical Support",
    "دعم فني VIP": "VIP Technical Support",
    "كل ميزات الباقة الشهرية": "All features of the monthly plan",
    "فروع غير محدودة": "Unlimited branches",
    "تحديثات مجانية مستمرة": "Continuous free updates",
    "مستشار مبيعات خاص": "Dedicated Sales Consultant",
    "تقارير وتحليلات ذكية": "Smart Analytics & Reports",
    "حتى 3 فروع": "Up to 3 branches",
    "دعم فني فوري (واتساب)": "Instant Tech Support (WhatsApp)",
    "دعم فني فوري": "Instant Tech Support",
    "كل ميزات التجربة": "All Trial features"
  };
  
  // Exact match
  if (map[feature.trim()]) return map[feature.trim()];
  
  // Partial matches just in case
  if (feature.includes('متضمنة') || feature.includes('متضمّنة')) return 'All features included';
  if (feature.includes('رسوم')) return 'No additional fees';
  if (feature.includes('سحابية')) return 'Free cloud hosting for one year';
  if (feature.includes('VIP')) return 'VIP Technical Support';
  if (feature.includes('الشهرية')) return 'All features of the monthly plan';
  if (feature.includes('غير محدودة')) return 'Unlimited branches';
  if (feature.includes('تحديثات')) return 'Continuous free updates';
  if (feature.includes('مبيعات')) return 'Dedicated Sales Consultant';
  if (feature.includes('تحليلات')) return 'Smart Analytics & Reports';
  if (feature.includes('3 فروع')) return 'Up to 3 branches';
  if (feature.includes('فوري')) return 'Instant Tech Support';
  if (feature.includes('التجربة')) return 'All Trial features';
  
  return feature;
};`;

c = c.replace(blockToRemove, '');

// 2. Insert them above the component
c = c.replace(
  'export default function Pricing() {',
  `${blockToRemove}

export default function Pricing() {`
);

fs.writeFileSync('web/src/app/pricing/page.tsx', c, 'utf8');
console.log('Fixed ReferenceError for translatePlanName');
