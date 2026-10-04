const fs = require('fs');

let code = fs.readFileSync('web/src/app/pos/page.tsx', 'utf8');

const returnStart = code.indexOf('return (\n    <div className="w-full pb-10 print:hidden">');
const modalStart = code.indexOf('{showReceipt && lastInvoice && (\n        <div className="fixed inset-0');

if (returnStart > -1 && modalStart > -1) {
  // 1. Change the first div to just open a Fragment
  code = code.replace(
    'return (\n    <div className="w-full pb-10 print:hidden">',
    'return (\n    <>\n      <div className="w-full pb-10 print:hidden">'
  );
  
  // 2. Find the closing div of the main wrapper. 
  // It is the div right before the modal.
  const modalStartString = '{showReceipt && lastInvoice && (';
  
  // We need to inject '</div>' right before modalStartString
  // Actually, the closing div is at the very end of POSContent!
  // Let's look at the end of the file.
  
  const endOfPOSContent = code.lastIndexOf(')} \n    </div>\n  );\n}\n\n\nexport default function POS() {');
  // Wait, if it ends with:
  /*
        </div>
      )}
    </div>
  );
}
  */
  
  // We want to move the closing </div> of `print:hidden` to BEFORE the modal!
  code = code.replace(
    '      </div>\n\n      {showReceipt && lastInvoice && (',
    '      </div>\n    </div>\n\n      {showReceipt && lastInvoice && ('
  );
  
  // And remove the closing </div> at the end, replacing it with </>
  code = code.replace(
    '      )}\n    </div>\n  );\n}',
    '      )}\n    </>\n  );\n}'
  );
  
  fs.writeFileSync('web/src/app/pos/page.tsx', code, 'utf8');
  console.log("Successfully separated receipt modal from print:hidden wrapper");
} else {
  console.log("Could not find targets");
}
