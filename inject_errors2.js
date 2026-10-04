const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /(\<input[^>]*?value=\{formData\.pharmacyName\}[^>]*?\/\>)/,
  `$1\n                        {errors.pharmacyName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.pharmacyName}</p>}`
);

c = c.replace(
  /(\<input[^>]*?value=\{formData\.managerName\}[^>]*?\/\>)/,
  `$1\n                        {errors.managerName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.managerName}</p>}`
);

c = c.replace(
  /(\<input[^>]*?value=\{formData\.email\}[^>]*?\/\>)/,
  `$1\n                      {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}`
);

c = c.replace(
  /(\<input[^>]*?value=\{formData\.phone\}[^>]*?\/\>\s*<\/div>)/,
  `$1\n                      {errors.phone && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.phone}</p>}`
);

c = c.replace(
  /(\<input[^>]*?value=\{formData\.password\}[^>]*?\/\>)/,
  `$1\n                      {errors.password && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.password}</p>}`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Injected error texts into JSX');
