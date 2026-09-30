const fs = require('fs');
const cp = require('child_process');
const frontendCode = cp.execSync('findstr /S /C:"/api/" web\\src\\*.ts web\\src\\*.tsx').toString();
const endpoints = fs.readFileSync('endpoints.txt', 'utf8').split('\n');
for (let ep of endpoints) {
  if(!ep) continue;
  let p = ep.split(' ')[1];
  let testP = p.replace(/:[a-zA-Z]+/g, '').replace(/\/$/, '');
  let isUsed = frontendCode.includes(testP);
  // Also check dynamic routes like /api/pharmacies/${id}/something
  let parts = testP.split('/').filter(Boolean);
  let lastPart = parts[parts.length - 1];
  
  // just check if lastPart is anywhere in frontend code if it's not admin
  if (!frontendCode.includes(lastPart) && !p.includes('admin') && p !== '/api/auth/register' && p !== '/api/auth/login') {
      console.log('Unused frontend endpoint:', ep);
  }
}
