const fs = require('fs');

let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetStr = `          body: JSON.stringify({
            name: editingItem.name,
            manufacturer: editingItem.manufacturer,
            category: editingItem.category,
            price_sell: editingItem.price,
            price_buy: editingItem.cost,
            qty: (() => {`;

const newStr = `          body: JSON.stringify({
            name: editingItem.name,
            manufacturer: editingItem.manufacturer,
            category: editingItem.category,
            price_sell: editingItem.price,
            price_buy: editingItem.cost,
            isControlled: editingItem.isControlled ? 1 : 0,
            qty: (() => {`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Patched PUT request body in inventory");
} else {
  console.log("Could not find target string in inventory PUT request");
}
