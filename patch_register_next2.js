const fs = require('fs');

let register = fs.readFileSync('web/src/app/register/page.tsx', 'utf8');

const blockToReplaceRegex = /if \(Object\.keys\(newErrors\)\.length > 0\) return;\s*\/\/.*?\s*if \(plan === "free" \|\| selectedPlan\?\.price === 0\) \{\s*handleRegister\(\);\s*\} else \{\s*setStep\(2\);\s*\}\s*\};/s;

const newBlock = `if (Object.keys(newErrors).length > 0) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") +
            "/api/auth/check-email",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: formData.email }),
          }
        );
        const data = await res.json();
        if (data.exists) {
          setErrors({ ...newErrors, email: language === "en" ? "Email is already in use" : "البريد الإلكتروني مستخدم بالفعل" });
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);

      if (plan === "free" || selectedPlan?.price === 0) {
        handleRegister();
      } else {
        setStep(2);
      }
    };`;

if (blockToReplaceRegex.test(register)) {
  register = register.replace('const handleNext = () => {', 'const handleNext = async () => {');
  register = register.replace(blockToReplaceRegex, newBlock);
  fs.writeFileSync('web/src/app/register/page.tsx', register, 'utf8');
  console.log('Updated handleNext successfully');
} else {
  console.log('Regex did not match handleNext block');
}
