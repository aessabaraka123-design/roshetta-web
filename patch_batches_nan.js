const fs = require('fs');

let page = fs.readFileSync('web/src/app/batches/page.tsx', 'utf8');

// Fix getDaysUntilExpiry
page = page.replace(
  'const getDaysUntilExpiry = (expiryDate: string) => {',
  `const getDaysUntilExpiry = (expiryDate: string | null | undefined) => {
  if (!expiryDate) return null;`
);

// Fix getExpiryStyle to handle null days
page = page.replace(
  'const getExpiryStyle = (days: number) => {',
  `const getExpiryStyle = (days: number | null) => {
  if (days === null || isNaN(days)) return { row: "bg-white", badge: "bg-gray-100 text-gray-500", labelAr: "غير محدد", labelEn: "Not Set" };`
);

// Fix rendering in the table
page = page.replace(
  '{batch.expiry_date}',
  '{batch.expiry_date || "—"}'
);

fs.writeFileSync('web/src/app/batches/page.tsx', page, 'utf8');
console.log('Fixed batches NaN issue');
