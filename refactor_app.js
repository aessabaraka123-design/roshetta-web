const fs = require('fs');

const appJsPath = 'c:/Users/XPRISTO/Documents/antigravity/gallant-maxwell/superadmin/assets/app.js';
let code = fs.readFileSync(appJsPath, 'utf8');

const toggleModalStr = `
function toggleModal(id, show = true) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) { el.classList.remove("hidden"); el.classList.add("flex"); }
  else { el.classList.add("hidden"); el.classList.remove("flex"); }
}
`;

if (!code.includes('function toggleModal')) {
    code = code.replace('// Initialize App', toggleModalStr + '// Initialize App');
}

// Consolidate modal show/hide patterns
const openPattern = /document\.getElementById\((['"`])([^'"`]+)\1\)\.classList\.remove\(['"`]hidden['"`]\);\s*document\.getElementById\((['"`])\2\1\)\.classList\.add\(['"`]flex['"`]\);/g;
const closePattern = /document\.getElementById\((['"`])([^'"`]+)\1\)\.classList\.add\(['"`]hidden['"`]\);\s*document\.getElementById\((['"`])\2\1\)\.classList\.remove\(['"`]flex['"`]\);/g;

code = code.replace(openPattern, "toggleModal('$2', true);");
code = code.replace(closePattern, "toggleModal('$2', false);");

// Are there functions that can be consolidated?
// Yes, like closeP, closeConfirm, closeRenewModal, closeStaffModal, closeBranchModal, closeResetPassModal, closePrivateNotifyModal, closeVipPriceModal, closePlatformStaffModal
// They just call toggleModal and set one variable to null.

code = code.replace(/function closeP\(\) \{\s*toggleModal\('pharmModal', false\);\s*editId = null;\s*\}/g, 'function closeP() { toggleModal("pharmModal", false); editId = null; }');

// What about other dead code or unused variables?
// `pharms` is global
// `PAGINATION` is global

// Let's write back
fs.writeFileSync(appJsPath, code);

console.log("Refactoring complete");
