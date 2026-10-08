const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const regex = /if \(sale\.status === "refunded"\) return;\s*const saleTotal = sale\.total \|\| 0;\s*totalRevenue \+= saleTotal;\s*const day = sale\.date\s*\?\s*sale\.date\.split\("T"\)\[0\]\s*:\s*new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\];\s*if \(!dailySales\[day\]\) dailySales\[day\] = 0;\s*dailySales\[day\] \+= saleTotal;\s*const bName = sale\.branchName \|\| "غير محدد";\s*if \(!branchSales\[bName\]\) branchSales\[bName\] = 0;\s*branchSales\[bName\] \+= saleTotal;\s*\/\/ Payment method breakdown\s*const pm = \(sale\.paymentMethod \|\| ""\)\.toLowerCase\(\);\s*if \(pm === "cash" \|\| pm === "نقدي" \|\| pm === "كاش"\)\s*paymentBreakdown\.cash \+= saleTotal;\s*else if \(pm === "bank" \|\| pm === "بنكي"\)\s*paymentBreakdown\.bank \+= saleTotal;\s*else if \(pm === "jawwal" \|\| pm === "jawwalpay" \|\| pm === "جوال باي"\)\s*paymentBreakdown\.jawwal \+= saleTotal;\s*else if \(pm === "palpay" \|\| pm === "بال باي"\)\s*paymentBreakdown\.palpay \+= saleTotal;\s*else if \(pm === "maalchat" \|\| pm === "مالتشات"\)\s*paymentBreakdown\.maalchat \+= saleTotal;\s*else if \(pm === "credit" \|\| pm === "آجل" \|\| pm === "ذمم"\)\s*paymentBreakdown\.credit \+= saleTotal;\s*else paymentBreakdown\.other \+= saleTotal;/s;

const newLogic = `if (sale.status === "refunded") return;
      const saleTotal = sale.total || 0;
      const pm = (sale.paymentMethod || "").toLowerCase();
      const isDebtPayment = pm === "تسديد دين" || pm === "debt_payment";

      const day = sale.date ? sale.date.split("T")[0] : new Date().toISOString().split("T")[0];
      const bName = sale.branchName || "غير محدد";

      if (!isDebtPayment) {
        totalRevenue += saleTotal;
        if (!dailySales[day]) dailySales[day] = 0;
        dailySales[day] += saleTotal;
        if (!branchSales[bName]) branchSales[bName] = 0;
        branchSales[bName] += saleTotal;
      }

      // Payment method breakdown
      if (pm === "cash" || pm === "نقدي" || pm === "كاش" || isDebtPayment)
        paymentBreakdown.cash += saleTotal;
      else if (pm === "bank" || pm === "بنكي")
        paymentBreakdown.bank += saleTotal;
      else if (pm === "jawwal" || pm === "jawwalpay" || pm === "جوال باي")
        paymentBreakdown.jawwal += saleTotal;
      else if (pm === "palpay" || pm === "بال باي")
        paymentBreakdown.palpay += saleTotal;
      else if (pm === "maalchat" || pm === "مالتشات")
        paymentBreakdown.maalchat += saleTotal;
      else if (pm === "credit" || pm === "آجل" || pm === "ذمم")
        paymentBreakdown.credit += saleTotal;
      else paymentBreakdown.other += saleTotal;`;

if (regex.test(server)) {
  server = server.replace(regex, newLogic);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log("Successfully patched reports accounting logic!");
} else {
  console.log("Regex did not match!");
}
