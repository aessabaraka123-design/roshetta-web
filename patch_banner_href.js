const fs = require('fs');
let layout = fs.readFileSync('web/src/components/MainLayoutWrapper.tsx', 'utf8');

const oldHref = 'href="https://wa.me/972590000000"';
const newHref = 'href={`https://wa.me/${subStatusData?.whatsapp || "972590000000"}`}';

if (layout.includes(oldHref)) {
  layout = layout.replace(oldHref, newHref);
  fs.writeFileSync('web/src/components/MainLayoutWrapper.tsx', layout, 'utf8');
  console.log('Successfully updated WhatsApp href dynamically');
} else {
  console.log('Href not found');
}
