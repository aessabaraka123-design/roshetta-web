const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const regex = /items\.forEach\(\(item\) => \{\s*const qty = item\.cartQty \|\| 1;\s*const price = item\.price \|\| 0;\s*const cost = item\.cost != null \? Number\(item\.cost\) : \(price \* 0\.7\);\s*totalProfit \+= \(price - cost\) \* qty;\s*if \(!itemSales\[item\.id\]\) \{\s*itemSales\[item\.id\] = \{\s*id: item\.id,\s*name: item\.name,\s*qty: 0,\s*revenue: 0,\s*\};\s*\}\s*itemSales\[item\.id\]\.qty \+= qty;\s*itemSales\[item\.id\]\.revenue \+= price \* qty;\s*\}\);/m;

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

if (regex.test(server)) {
  server = server.replace(regex, newLogic);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log("Successfully patched proportional cost logic!");
} else {
  console.log("Could not find the target string with regex!");
}
