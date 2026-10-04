const fs = require('fs');

let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const targetStr = 'return (\n    <>\n      <div className="w-full pb-10 print:hidden">';

if (code.includes(targetStr)) {
  const replacement = `return (
    <>
      <style dangerouslySetInnerHTML={{__html: \`
        @media print {
          @page {
            size: \${printerSize === "80mm" ? "80mm" : "58mm"} auto;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      \`}} />
      <div className="w-full pb-10 print:hidden">`;
  
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Injected @page print styles");
} else {
  console.log("Target string not found");
}
