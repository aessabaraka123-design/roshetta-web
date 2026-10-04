const fs = require('fs');

const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(
  /(\<input\s+type="tel"[\s\S]*?onChange=\{\(e\) => \{[\s\S]*?\}\}\s*\/>\s*<\/div>)/,
  `$1\n                      {errors.phone && <p className="text-red-500 text-sm mt-1 font-medium">{errors.phone}</p>}`
);

c = c.replace(
  /(\<input\s+type="password"[\s\S]*?value=\{formData\.password\}[\s\S]*?onChange=\{\(e\) => setFormData\(\{\s*\.\.\.formData,\s*password: e\.target\.value,\s*\}\)\}\s*\/>)/,
  `$1\n                      {errors.password && <p className="text-red-500 text-sm mt-1 font-medium">{errors.password}</p>}`
);

fs.writeFileSync(f, c, 'utf8');
console.log('Injected phone and password errors');
