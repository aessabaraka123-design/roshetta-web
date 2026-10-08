const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldLogic = `      if (sale.status === "refunded") return;
      const saleTotal = sale.total || 0;
      totalRevenue += saleTotal;
      const day = sale.date
        ? sale.date.split("T")[0]
        : new Date().toISOString().split("T")[0];
      if (!dailySales[day]) dailySales[day] = 0;
      dailySales[day] += saleTotal;
      const bName = sale.branchName || "غير محدد";
      if (!branchSales[bName]) branchSales[bName] = 0;
      branchSales[bName] += saleTotal;

      // Payment method breakdown
      const pm = (sale.paymentMethod || "").toLowerCase();
      if (pm === "cash" || pm === "نقدي" || pm === "كاش")
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

const newLogic = `      if (sale.status === "refunded") return;
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

if (server.includes(oldLogic)) {
  server = server.replace(oldLogic, newLogic);
  fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
  console.log("Successfully patched reports accounting logic!");
} else {
  console.log("Old logic not found! Did the format change?");
}
