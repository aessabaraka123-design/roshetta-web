const fs = require('fs');
let appJs = fs.readFileSync('superadmin/assets/app.js', 'utf8');

// 1. Add tab('dashboard'); to login()
const loginTarget = `      if (d.success && d.user?.role === "superadmin") {
        saveSession(d.user);
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("app").classList.add("flex");
  
        applyRBAC(d.user.platformRole);
  
        const wn = document.getElementById("welcomeName");
        if (wn) wn.textContent = \`مرحباً، \${d.user.managerName || 'أدمين'}\`;
  
        loadAll();`;

const loginReplacement = `      if (d.success && d.user?.role === "superadmin") {
        saveSession(d.user);
        document.getElementById("loginScreen").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("app").classList.add("flex");
  
        applyRBAC(d.user.platformRole);
  
        const wn = document.getElementById("welcomeName");
        if (wn) wn.textContent = \`مرحباً، \${d.user.managerName || 'أدمين'}\`;
  
        tab('dashboard');
        loadAll();`;
        
// I'll use regex for login to be safe, because of arabic text
const loginRegex = /applyRBAC\(d\.user\.platformRole\);\s*const wn = document\.getElementById\("welcomeName"\);\s*if \(wn\) wn\.textContent = `.*?`;\s*loadAll\(\);/;

const loginRegexReplacement = `applyRBAC(d.user.platformRole);
        const wn = document.getElementById("welcomeName");
        if (wn) wn.textContent = \`مرحباً، \${d.user.managerName || 'أدمين'}\`;
        
        tab('dashboard');
        loadAll();`;

appJs = appJs.replace(loginRegex, loginRegexReplacement);


// 2. Fix applyRBAC to reset links
const rbacRegex = /const toHide = hideMap\[role\] \|\| \['sales', 'subrequests', 'settings', 'platform-staff', 'broadcasts'\];\s*toHide\.forEach/;

const rbacReplacement = `const toHide = hideMap[role] || ['sales', 'subrequests', 'settings', 'platform-staff', 'broadcasts'];

    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.style.display = 'flex';
    });

    toHide.forEach`;

appJs = appJs.replace(rbacRegex, rbacReplacement);

fs.writeFileSync('superadmin/assets/app.js', appJs);
console.log('Fixed login and rbac resets');
