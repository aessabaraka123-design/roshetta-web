const fs = require('fs');
let text = fs.readFileSync('superadmin/assets/app.js', 'utf8');

const rbacTarget = /function applyRBAC\(role\) \{[\s\S]*?\n\s*\n\}/;

const newRbac = `function applyRBAC(role) {
  const hideMap = {
    owner: [],
    support: ['sales', 'subrequests', 'settings', 'platform-staff'],
    sales: ['settings', 'platform-staff', 'tickets', 'users'],
    accountant: ['settings', 'platform-staff', 'tickets', 'users', 'broadcasts']
  };

  const toHide = hideMap[role] || ['sales', 'subrequests', 'settings', 'platform-staff', 'broadcasts', 'users'];

  // Reset display for all tabs first (in case of switching)
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.style.display = 'flex';
  });

  // Hide the specific tabs
  toHide.forEach(tabName => {
    const link = document.querySelector(\`[data-tab="\${tabName}"]\`);
    if (link) link.style.display = 'none';
  });

  // KPI obscuring based on role
  // k1: Pharmacies, k2: Users, k3: Payments, k4: Pending Sub Requests
  const k2 = document.getElementById('k2'); // Users
  const k3 = document.getElementById('k3'); // Payments
  const k4 = document.getElementById('k4'); // Sub Requests

  // Reset KPIs from *** just in case
  if (k2) k2.classList.remove('hidden-kpi');
  if (k3) k3.classList.remove('hidden-kpi');
  if (k4) k4.classList.remove('hidden-kpi');

  if (role === 'support') {
    if (k3) k3.textContent = '***';
    if (k4) k4.textContent = '***';
  } else if (role === 'sales' || role === 'accountant') {
    if (k2) k2.textContent = '***';
  }

  const session = getSession();
  if (session && session.id !== "superadmin-owner") {
    const addBtn = document.getElementById("addPlatformStaffBtn");
    if (addBtn) addBtn.style.display = 'none';
  }
}
`;

text = text.replace(rbacTarget, newRbac);

// Also need to make sure loadDash doesn't overwrite the '***' immediately if it loads after applyRBAC!
// Wait! `loadDash()` sets the textContent. So if `applyRBAC` runs before `loadDash()`, `loadDash` will overwrite the `***` with the actual number!
// Oh! `applyRBAC()` is called during `login()`. `loadAll()` is called AFTER `applyRBAC()`. So `loadDash()` WILL overwrite it!
// We need to apply KPI rules inside `loadDash()` OR run `applyRBAC()` again inside `loadAll()` AFTER the fetch.
// It's better to just put a check inside `loadDash()`.

text = text.replace(
  'document.getElementById("k3").textContent = paid.toLocaleString("en-US");',
  \`const sess = getSession();
    if (sess && sess.platformRole === 'support') {
      document.getElementById("k3").textContent = "***";
    } else {
      document.getElementById("k3").textContent = paid.toLocaleString("en-US");
    }\`
);

text = text.replace(
  'document.getElementById("k2").textContent = (uRes.users || []).length;',
  \`if (sess && (sess.platformRole === 'sales' || sess.platformRole === 'accountant')) {
      document.getElementById("k2").textContent = "***";
    } else {
      document.getElementById("k2").textContent = (uRes.users || []).length;
    }\`
);

text = text.replace(
  'document.getElementById("k4").textContent = pendingReqs;',
  \`if (sess && sess.platformRole === 'support') {
      document.getElementById("k4").textContent = "***";
    } else {
      document.getElementById("k4").textContent = pendingReqs;
    }\`
);

// Second k2 definition in loadUsers
text = text.replace(
  'document.getElementById("k2").textContent = users.length;',
  \`const session = getSession();
    if (session && (session.platformRole === 'sales' || session.platformRole === 'accountant')) {
      document.getElementById("k2").textContent = "***";
    } else {
      document.getElementById("k2").textContent = users.length;
    }\`
);

fs.writeFileSync('superadmin/assets/app.js', text);
console.log('RBAC applied perfectly.');
