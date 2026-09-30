const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const swrRegex = /const \{ data: inventoryData \} = useSWR\(/;
if (swrRegex.test(code)) {
  code = code.replace(swrRegex, 'const { data: inventoryData, mutate: mutateInventory } = useSWR(');
  console.log('Added mutateInventory');
}

const mutateInvRegex = /mutateInv\(\);/g;
if (mutateInvRegex.test(code)) {
  code = code.replace(mutateInvRegex, 'mutateInventory();');
  console.log('Fixed mutateInv call');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
