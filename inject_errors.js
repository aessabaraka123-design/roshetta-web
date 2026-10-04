const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /<input\s+type="text"\s+placeholder="صيدلية الأمل"\s+value=\{formData\.pharmacyName\}\s+onChange=\{[\s\S]*?\}\s*\/>/,
  `$&
                        {errors.pharmacyName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.pharmacyName}</p>}`
);

c = c.replace(
  /<input\s+type="text"\s+placeholder="د\. محمد أحمد"\s+value=\{formData\.managerName\}\s+onChange=\{[\s\S]*?\}\s*\/>/,
  `$&
                        {errors.managerName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.managerName}</p>}`
);

c = c.replace(
  /<input\s+type="email"\s+placeholder="pharmacy@example\.com"\s+value=\{formData\.email\}\s+onChange=\{[\s\S]*?\}\s*\/>/,
  `$&
                      {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}`
);

c = c.replace(
  /<input\s+type="tel"\s+placeholder="0599 000 000"\s+value=\{formData\.phone\}\s+onChange=\{[\s\S]*?\}\s*\/>\s*<\/div>/,
  `$&
                      {errors.phone && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.phone}</p>}`
);

c = c.replace(
  /<input\s+type="password"\s+placeholder="••••••••"\s+value=\{formData\.password\}\s+onChange=\{[\s\S]*?\}\s*\/>/,
  `$&
                      {errors.password && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.password}</p>}`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Injected error texts into JSX');
