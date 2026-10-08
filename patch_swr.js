const fs = require('fs');
let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

if (!layout.includes('import useSWR')) {
  layout = layout.replace('import { useEffect } from "react";', 'import { useEffect } from "react";\nimport useSWR from "swr";');
  fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
  console.log('Injected useSWR');
} else {
  console.log('useSWR already imported');
}
