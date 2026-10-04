const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /(\<input\s+type="email"\s+placeholder="pharmacy@example\.com"[\s\S]*?\/>)\s*<\/div>/,
  `$1\n                      {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}\n                    </div>`
);

c = c.replace(
  /(\<input\s+type="tel"\s+placeholder="0599 000 000"[\s\S]*?\/>)\s*<\/div>/,
  `$1\n                      </div>\n                      {errors.phone && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.phone}</p>}`
);

c = c.replace(
  /(\<input\s+type="password"\s+placeholder="••••••••"[\s\S]*?\/>)\s*<\/div>/,
  `$1\n                      {errors.password && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.password}</p>}\n                    </div>`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Injected properly');
