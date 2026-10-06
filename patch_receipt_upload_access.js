const fs = require('fs');
let c = fs.readFileSync('web/src/app/receipt-upload/page.tsx', 'utf8');

c = c.replace(
  'if (!user.isReadOnly) {\n      router.push("/");\n      return;\n    }',
  '// Allow active users to upload a receipt for renewal\n    // if (!user.isReadOnly) {\n    //   router.push("/");\n    //   return;\n    // }'
);

fs.writeFileSync('web/src/app/receipt-upload/page.tsx', c, 'utf8');
console.log('Fixed receipt-upload access for active users');
