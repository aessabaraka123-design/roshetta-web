const fs = require('fs');
const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /pharmacyName:\s*e\.target\.value,\s*\}\)\s*\}\s*\/>/g,
  `$&
                        {errors.pharmacyName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.pharmacyName}</p>}`
);

c = c.replace(
  /managerName:\s*e\.target\.value,\s*\}\)\s*\}\s*\/>/g,
  `$&
                        {errors.managerName && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.managerName}</p>}`
);

c = c.replace(
  /email:\s*e\.target\.value,\s*\}\)\s*\}\s*\/>/g,
  `$&
                      {errors.email && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.email}</p>}`
);

c = c.replace(
  /phone:\s*e\.target\.value,\s*\}\)\s*\}\s*\/>/g,
  `$&
                      </div>
                      {errors.phone && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.phone}</p>}`
);

c = c.replace(
  /password:\s*e\.target\.value,\s*\}\)\s*\}\s*\/>/g,
  `$&
                      {errors.password && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px', fontWeight: 500 }}>{errors.password}</p>}`
);

// Wait, the phone input is inside a div, so I should append the error span AFTER the closing div for phone, or just below the input.
// If I append it right below the input, it goes inside the `<div className="flex...">`. Let's just put it below the input. I removed the `\s*<\/div>` from the regex and added `</div>` in the replacement to be safe? No, let me just append it after `/>` and let it be inside the div or next to it.
// Actually, it's better to replace the `/>` and just let it render.

fs.writeFileSync(f, c, 'utf8');
console.log('Successfully injected inline errors v4');
