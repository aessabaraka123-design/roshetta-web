const fs = require('fs');

let page = fs.readFileSync('web/src/app/stock-take/page.tsx', 'utf8');

// 1. Add states and dashboard SWR
page = page.replace(
  'const [items, setItems] = useState<any[]>([]);',
  `const [branchFilter, setBranchFilter] = useState("all");
  const { data: dashboardData } = useSWR(
    user ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/dashboard\` : null,
    fetcher
  );
  const branches = dashboardData?.branches || [];

  const [items, setItems] = useState<any[]>([]);`
);

// 2. Update inventory SWR
page = page.replace(
  '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory`',
  '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory?branch_id=${branchFilter}`'
);

// 3. Add UI selector
const uiSelector = `<div className="flex gap-4 mt-5">
        {(user?.role === "owner" || user?.role === "superadmin" || user?.role === "manager") && branches.length > 0 && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-white border border-mint-line rounded-[14px] px-4 py-2 font-bold text-ink outline-none focus:border-primary shadow-sm"
          >
            <option value="all">{language === 'en' ? 'All Branches' : 'كل الفروع'}</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex-1">`;

page = page.replace(
  '<div className="flex gap-4 mt-5">\n        <div className="flex-1">',
  uiSelector
);

fs.writeFileSync('web/src/app/stock-take/page.tsx', page, 'utf8');
console.log("Updated stock-take page with branch filtering!");
