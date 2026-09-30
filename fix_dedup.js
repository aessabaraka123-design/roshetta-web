const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

// 1. Remove Date.now() from inventory alert IDs
code = code.replace(/id: "low_stock_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "low_stock_" + item.id,');
code = code.replace(/id: "exp_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "exp_" + item.id,');
code = code.replace(/id: "exp_passed_" \+ item\.id \+ "_" \+ Date\.now\(\),/g, 'id: "exp_passed_" + item.id,');

// 2. Fix deduplication in checkInventoryAlerts
// Replace the notifications: [ ...newNotifications, ...state.notifications ] block
code = code.replace(
  /notifications: \[\s*\.\.\.newNotifications\.reverse\(\),\s*\.\.\.state\.notifications\.filter\(n => \{\s*if \(\!n\.created_at\) return true;\s*return \(new Date\(\) - new Date\(n\.created_at\)\) < \(48 \* 60 \* 60 \* 1000\);\s*\}\),\s*\]\.slice\(0, 50\),/g,
  \
otifications: (() => {
              const all = [...newNotifications.reverse(), ...state.notifications.filter(n => {
                if (!n.created_at) return true;
                return (new Date() - new Date(n.created_at)) < (48 * 60 * 60 * 1000);
              })];
              const unique = [];
              const ids = new Set();
              for (const notif of all) {
                if (!ids.has(notif.id)) {
                  unique.push(notif);
                  ids.add(notif.id);
                }
              }
              return unique.slice(0, 50);
            })(),\
);

// 3. Fix deduplication in addNotification
code = code.replace(
  /notifications: \[\s*\{\s*\.\.\.notif,\s*id: notif\.id \|\| Date\.now\(\)\.toString\(\),\s*time: new Date\(\)\.toLocaleTimeString\("ar-EG-u-nu-latn", \{\s*hour: "2-digit",\s*minute: "2-digit",\s*\}\),\s*\},\s*\.\.\.state\.notifications\.filter\(n => \{\s*if \(\!n\.created_at\) return true;\s*return \(new Date\(\) - new Date\(n\.created_at\)\) < \(48 \* 60 \* 60 \* 1000\);\s*\}\),\s*\]\.slice\(0, 50\),/g,
  \
otifications: (() => {
              const newNotif = {
                ...notif,
                id: notif.id || Date.now().toString(),
                time: new Date().toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" }),
              };
              const existing = state.notifications.filter(n => n.id !== newNotif.id && (!n.created_at || (new Date() - new Date(n.created_at)) < (48 * 60 * 60 * 1000)));
              return [newNotif, ...existing].slice(0, 50);
            })(),\
);

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
