const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldLogic = `      items.forEach((item) => {
        const qty = item.cartQty || 1;
        const price = item.price || 0;
        const cost = item.cost != null ? Number(item.cost) : (price * 0.7);
        totalProfit += (price - cost) * qty;
        if (!itemSales[item.id]) {
          itemSales[item.id] = {
            id: item.id,
            name: item.name,
            qty: 0,
            revenue: 0,
          };
        }
        itemSales[item.id].qty += qty;
        itemSales[item.id].revenue += price * qty;
      });`;

const newLogic = `      items.forEach((item) => {
        let boxBaseCount = 1;
        try {
          if (item.units) {
             const uArr = typeof item.units === 'string' ? JSON.parse(item.units) : item.units;
             if (uArr && uArr.length > 0) boxBaseCount = uArr[0].count || 1;
          }
        } catch(e) {}
        
        const qty = item.cartQty || 1; 
        const totalBaseUnitsSold = item.deductQty || (qty * (item.unitCount || 1));
        
        const fullBoxCost = item.cost != null ? Number(item.cost) : (Number(item.price || 0) * 0.7);
        const singleBaseUnitCost = fullBoxCost / boxBaseCount;
        const actualCostOfSold = singleBaseUnitCost * totalBaseUnitsSold;
        
        const actualRevenueOfSold = (item.unitPrice || item.price || 0) * qty;
        
        totalProfit += (actualRevenueOfSold - actualCostOfSold);

        if (!itemSales[item.id]) {
          itemSales[item.id] = {
            id: item.id,
            name: item.name,
            qty: 0,
            revenue: 0,
          };
        }
        itemSales[item.id].qty += qty;
        itemSales[item.id].revenue += actualRevenueOfSold;
      });`;

if (server.includes(oldLogic)) {
  server = server.replace(oldLogic, newLogic);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log("Successfully patched proportional cost logic!");
} else {
  console.log("Could not find the target string!");
}
