const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /pharmacyName: e\.target\.value,\s*\}\)\}\s*\/>/g,
  `$&
                        {errors.pharmacyName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.pharmacyName}</p>}`
);

c = c.replace(
  /managerName: e\.target\.value,\s*\}\)\}\s*\/>/g,
  `$&
                        {errors.managerName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.managerName}</p>}`
);

c = c.replace(
  /email: e\.target\.value,\s*\}\)\}\s*\/>/g,
  `$&
                      {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}`
);

c = c.replace(
  /phone: e\.target\.value,\s*\}\)\}\s*\/>\s*<\/div>/g,
  `$&
                      {errors.phone && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.phone}</p>}`
);

c = c.replace(
  /password: e\.target\.value,\s*\}\)\}\s*\/>/g,
  `$&
                      {errors.password && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.password}</p>}`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Successfully injected inline errors');
