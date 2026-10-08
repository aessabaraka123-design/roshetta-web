const fs = require('fs');
let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

const injection = `  const language = useStore((state: any) => state.language);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: subStatusData } = useSWR(
    user?.isReadOnly && user?.pharmacy_id
      ? \`\${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pharmacies/\${user.pharmacy_id}/subscription-status\`
      : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const isRejected = subStatusData?.status === "rejected";`;

const regex = /const language = useStore\\(\\(state: any\\) => state\\.language\\);/;

if (!layout.includes('const isRejected')) {
  layout = layout.replace(regex, injection);
  fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
  console.log('Injected SWR variables successfully');
} else {
  console.log('Already injected');
}
