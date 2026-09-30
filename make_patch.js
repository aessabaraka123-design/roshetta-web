const fs = require('fs');
let appJs = fs.readFileSync('superadmin/assets/app.js', 'utf8');

const loginEnd = `      if (d.success && d.user?.role === "superadmin") {
        saveSession(d.user);
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("app").classList.add("flex");
  
        applyRBAC(d.user.platformRole);
  
        const wn = document.getElementById("welcomeName");
        if (wn) wn.textContent = \`مرحباً، \${d.user.managerName || 'أدمين'}\`;
  
        loadAll();`;

const replacement = `      if (d.success && d.user?.role === "superadmin") {
        saveSession(d.user);
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("app").classList.add("flex");
  
        applyRBAC(d.user.platformRole);
  
        const wn = document.getElementById("welcomeName");
        if (wn) wn.textContent = \`مرحباً، \${d.user.managerName || 'أدمين'}\`;
  
        // Reset to dashboard upon login
        tab('dashboard');
        
        loadAll();`;

// Wait, the Arabic strings might differ or cause match failure.
// Let's use string replace on "loadAll();" inside login function.

const patch = `
const fs = require('fs');
let text = fs.readFileSync('superadmin/assets/app.js', 'utf8');
text = text.replace('loadAll();', "tab('dashboard');\\n        loadAll();");
fs.writeFileSync('superadmin/assets/app.js', text);
`;
fs.writeFileSync('superadmin/patch_login.js', patch);
console.log('Script written');
