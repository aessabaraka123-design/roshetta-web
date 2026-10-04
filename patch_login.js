const fs = require('fs');
let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

// For Staff
code = code.replace(
  '                        role: staff.role,\n                        pharmacy_id: pharmacy.id,\n                        branch: staff.branch,\n                        isReadOnly:',
  '                        role: staff.role,\n                        pharmacy_id: pharmacy.id,\n                        branch: staff.branch,\n                        controlledMedsAccess: staff.controlledMedsAccess,\n                        isReadOnly:'
);

// For Users (Manager)
// First we need to find the users part
const oldUserResponse = `                      user: {
                        id: user.id,
                        email: user.email,
                        managerName: user.managerName,
                        pharmacyName: pharmacy.name,
                        subscriptionType: pharmacy.subscriptionType || "basic",
                        subscriptionExpiry: pharmacy.subscriptionExpiry,
                        role: user.role,
                        pharmacy_id: pharmacy.id,
                        isReadOnly:`;

const newUserResponse = `                      user: {
                        id: user.id,
                        email: user.email,
                        managerName: user.managerName,
                        pharmacyName: pharmacy.name,
                        subscriptionType: pharmacy.subscriptionType || "basic",
                        subscriptionExpiry: pharmacy.subscriptionExpiry,
                        role: user.role,
                        controlledMedsAccess: 1, // Manager always has access
                        pharmacy_id: pharmacy.id,
                        isReadOnly:`;

code = code.replace(oldUserResponse, newUserResponse);

fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
console.log("Patched login endpoint to include controlledMedsAccess");
