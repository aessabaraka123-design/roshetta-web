const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

// Fix the line 23
code = code.replace(/status: inv\.status \|\| "completed"/, 'status: "completed"');

// Fix handleEditDraft
const handleEditRegex = /const handleEditDraft = \(inv: any\) => \{[\s\S]*?branch_id: inv\.branch_id \|\| "all",\r?\n\s*status: "completed"\r?\n\s*\}\);/;
if(handleEditRegex.test(code)){
    code = code.replace(handleEditRegex, (match) => match.replace('status: "completed"', 'status: inv.status || "completed"'));
    console.log('Fixed handleEditDraft!');
}

fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
