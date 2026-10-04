const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Add import AlertCircle
if (!c.includes('AlertCircle')) {
  c = c.replace('import { useStore } from "@/store";', 'import { useStore } from "@/store";\nimport { AlertCircle } from "lucide-react";');
}

// Helper to inject input styles and update error text
function updateField(code, fieldName) {
  // Update Input Style
  const inputRegex = new RegExp(`(\\<input[\\s\\S]*?value=\\{formData\\.${fieldName}\\}[\\s\\S]*?)(onChange=\\{[\\s\\S]*?\\})`, 'g');
  code = code.replace(inputRegex, `$1 style={errors.${fieldName} ? { borderColor: '#ef4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)' } : {}}\n                          $2`);
  
  // Update Error Text
  const errorRegex = new RegExp(`\\{errors\\.${fieldName} && <p style=\\{\\{[\\s\\S]*?\\}\\}>\\{errors\\.${fieldName}\\}\\<\\/p>\\}`);
  const newError = `{errors.${fieldName} && (
                        <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={15} />
                          {errors.${fieldName}}
                        </p>
                      )}`;
  code = code.replace(errorRegex, newError);
  return code;
}

c = updateField(c, 'pharmacyName');
c = updateField(c, 'managerName');
c = updateField(c, 'email');
c = updateField(c, 'phone');
c = updateField(c, 'password');

fs.writeFileSync(f, c, 'utf8');
console.log('Updated styles and icons');
