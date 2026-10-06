const fs = require('fs');

let code = fs.readFileSync('roshetta_server/server.js', 'utf8');

const targetPut = `app.put("/api/pharmacies/:id/inventory/:itemId", (req, res) => {
  const { id: pharmacy_id, itemId } = req.params;
  const {
    name,
    scientificName,
    category,
    price,
    cost,
    price_buy,
    price_sell,
    qty,
    minQty,
    expiry,
    expiry_date,
    barcode,
    branch_id,
    units,
  } = req.body;
  const finalPrice = Number(price !== undefined ? price : price_sell) || 0;
  const finalCost = Number(cost !== undefined ? cost : price_buy) || 0;
  const finalExpiry = expiry || expiry_date || "";

  let updateQuery =
    "UPDATE inventory SET name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, barcode = ?, branch_id = ?, units = ? WHERE id = ? AND pharmacy_id = ?";
  let updateParams = [
    name,
    scientificName || "",
    category,
    finalPrice,
    finalCost,
    Number(qty) || 0,
    Number(minQty) || 0,
    finalExpiry,
    barcode || "",
    branch_id || "",
    units || null,
    itemId,
    pharmacy_id,
  ];`;

const newPut = `app.put("/api/pharmacies/:id/inventory/:itemId", (req, res) => {
  const { id: pharmacy_id, itemId } = req.params;
  const {
    name,
    scientificName,
    category,
    price,
    cost,
    price_buy,
    price_sell,
    qty,
    minQty,
    expiry,
    expiry_date,
    barcode,
    branch_id,
    units,
    isControlled,
  } = req.body;
  const finalPrice = Number(price !== undefined ? price : price_sell) || 0;
  const finalCost = Number(cost !== undefined ? cost : price_buy) || 0;
  const finalExpiry = expiry || expiry_date || "";

  let updateQuery =
    "UPDATE inventory SET name = ?, scientificName = ?, category = ?, price = ?, cost = ?, qty = ?, minQty = ?, expiry = ?, barcode = ?, branch_id = ?, units = ?, isControlled = ? WHERE id = ? AND pharmacy_id = ?";
  let updateParams = [
    name,
    scientificName || "",
    category,
    finalPrice,
    finalCost,
    Number(qty) || 0,
    Number(minQty) || 0,
    finalExpiry,
    barcode || "",
    branch_id || "",
    units || null,
    isControlled ? 1 : 0,
    itemId,
    pharmacy_id,
  ];`;

if (code.includes(targetPut)) {
  code = code.replace(targetPut, newPut);
  fs.writeFileSync('roshetta_server/server.js', code, 'utf8');
  console.log("Patched server.js PUT inventory logic");
} else {
  console.log("Could not find target string in server.js PUT logic");
}
