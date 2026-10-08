const fs = require('fs');

let page = fs.readFileSync('src/app/stock-take/page.tsx', 'utf8');

// The problematic block:
//   const { data, mutate } = useSWR(
//     user
//       ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/${user.pharmacy_id}/inventory?branch_id=${branchFilter}`
//       : null,
//     fetcher,
//   );
//   const [branchFilter, setBranchFilter] = useState("all");

const wrongOrder = `  const { data, mutate } = useSWR(
    user
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/inventory?branch_id=\${branchFilter}\`
      : null,
    fetcher,
  );
  const [branchFilter, setBranchFilter] = useState("all");
  const { data: dashboardData } = useSWR(
    user ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/dashboard\` : null,
    fetcher
  );
  const branches = dashboardData?.branches || [];`;

const correctOrder = `  const [branchFilter, setBranchFilter] = useState("all");
  const { data: dashboardData } = useSWR(
    user ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/dashboard\` : null,
    fetcher
  );
  const branches = dashboardData?.branches || [];

  const { data, mutate } = useSWR(
    user
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/inventory?branch_id=\${branchFilter}\`
      : null,
    fetcher,
  );`;

if (page.includes('const [branchFilter, setBranchFilter] = useState("all");')) {
  page = page.replace(wrongOrder, correctOrder);
  fs.writeFileSync('src/app/stock-take/page.tsx', page, 'utf8');
  console.log("Fixed variable declaration order!");
} else {
  console.log("Could not find the string to replace!");
}
