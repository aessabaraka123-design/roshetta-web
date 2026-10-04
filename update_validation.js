const fs = require('fs');

const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Add errors state
c = c.replace(
  'const [formData, setFormData] = useState({',
  'const [errors, setErrors] = useState<Record<string, string>>({});\n  const [formData, setFormData] = useState({'
);

// 2. Replace handleNext
const newHandleNext = `const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.pharmacyName) newErrors.pharmacyName = "يرجى إدخال اسم الصيدلية";
    if (!formData.managerName) newErrors.managerName = "يرجى إدخال اسم المدير / المالك";
    
    if (!formData.email) {
      newErrors.email = "يرجى إدخال البريد الإلكتروني";
    } else {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "يرجى إدخال بريد إلكتروني صحيح";
      }
    }

    if (!formData.phone) {
      newErrors.phone = "يرجى إدخال رقم الجوال";
    } else if (formData.phone.trim().length < 9) {
      newErrors.phone = "رقم الجوال يجب أن لا يقل عن 9 أرقام";
    }

    if (!formData.password) {
      newErrors.password = "يرجى إدخال كلمة المرور";
    } else if (formData.password.length < 6) {
      newErrors.password = "كلمة المرور يجب أن لا تقل عن 6 خانات";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;`;

const handleNextRegex = /const handleNext = \(\) => \{[\s\S]*?if \(formData\.password\.length < 6\) \{[\s\S]*?return;\n\s*\}/;
c = c.replace(handleNextRegex, newHandleNext);

// 3. Clear errors when input changes (optional but good practice)
// Actually we can just leave it to re-validate on click, or clear it on change.
// To clear it on change, we could update the onChange handlers, but let's just let it clear on submit for simplicity.

// 4. Inject error spans
// We need to inject `{errors.FIELD && <p className="text-red-500 text-sm mt-1">{errors.FIELD}</p>}` after each input.

// Pharmacy Name
c = c.replace(
  /value=\{formData\.pharmacyName\}[\s\S]*?onChange=\{\(e\) => setFormData\(\{\s*\.\.\.formData,\s*pharmacyName: e\.target\.value,\s*\}\)\}\s*\/>/,
  `$&
                        {errors.pharmacyName && <p className="text-red-500 text-sm mt-1 font-medium">{errors.pharmacyName}</p>}`
);

// Manager Name
c = c.replace(
  /value=\{formData\.managerName\}[\s\S]*?onChange=\{\(e\) => setFormData\(\{\s*\.\.\.formData,\s*managerName: e\.target\.value,\s*\}\)\}\s*\/>/,
  `$&
                        {errors.managerName && <p className="text-red-500 text-sm mt-1 font-medium">{errors.managerName}</p>}`
);

// Email
c = c.replace(
  /value=\{formData\.email\}[\s\S]*?onChange=\{\(e\) => setFormData\(\{\s*\.\.\.formData,\s*email: e\.target\.value,\s*\}\)\}\s*\/>/,
  `$&
                      {errors.email && <p className="text-red-500 text-sm mt-1 font-medium">{errors.email}</p>}`
);

// Phone (The phone input is inside a flex container or something? Let's check.)
// Let's inject after the phone input.
c = c.replace(
  /value=\{formData\.phone\}[\s\S]*?onChange=\{\(e\) => setFormData\(\{\s*\.\.\.formData,\s*phone: e\.target\.value,\s*\}\)\}\s*\/>/,
  `$&`
);
// Actually wait, for phone it's inside `<div className="flex ..."><input.../></div>`. We should put it after that div!
// Let's use a simpler replace. I'll read the code and do it manually.
fs.writeFileSync(f, c, 'utf8');
