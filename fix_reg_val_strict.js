const fs = require('fs');

const f = 'web/src/app/register/page.tsx';
let c = fs.readFileSync(f, 'utf8');

const newHandleNext = `const handleNext = () => {
    if (!formData.pharmacyName || !formData.managerName || !formData.email || !formData.phone || !formData.password) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    
    // Email Validation
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i;
    if (!emailRegex.test(formData.email)) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    // Phone Validation
    if (formData.phone.trim().length < 9) {
      toast.error("رقم الجوال يجب أن لا يقل عن 9 أرقام");
      return;
    }

    // Password Validation
    if (formData.password.length < 6) {
      toast.error("كلمة المرور يجب أن لا تقل عن 6 خانات");
      return;
    }`;

// Replace the old handleNext
const handleNextRegex = /const handleNext = \(\) => \{[\s\S]*?return;\s*\}/;
c = c.replace(handleNextRegex, newHandleNext);

fs.writeFileSync(f, c, 'utf8');
console.log('Validations added successfully');
