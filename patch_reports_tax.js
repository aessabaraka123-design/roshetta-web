const fs = require('fs');

let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

const oldReportsLogic1 = `        let totalRevenue = 0;
        let totalProfit = 0;
        let dailySales = {};`;
const newReportsLogic1 = `        let totalRevenue = 0;
        let totalProfit = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let dailySales = {};`;
server = server.replace(oldReportsLogic1, newReportsLogic1);

const oldReportsLogic2 = `      (salesRows || []).forEach((sale) => {
        if (sale.status === "refunded") return;
        const pm = (sale.paymentMethod || "").toLowerCase();`;
const newReportsLogic2 = `      (salesRows || []).forEach((sale) => {
        if (sale.status === "refunded") return;
        
        // Sum taxes and discounts
        totalTax += (sale.tax || 0);
        totalDiscount += (sale.discount || 0);

        const pm = (sale.paymentMethod || "").toLowerCase();`;
server = server.replace(oldReportsLogic2, newReportsLogic2);

const oldReportsLogic3 = `        let totalExpenses = 0;
        if (!errExp) {
          (expRows || []).forEach(exp => {
            totalExpenses += (exp.amount || 0);
          });
        }
        
        const netProfit = totalProfit - totalExpenses;`;
const newReportsLogic3 = `        let totalExpenses = 0;
        if (!errExp) {
          (expRows || []).forEach(exp => {
            totalExpenses += (exp.amount || 0);
          });
        }
        
        const netProfit = totalProfit - totalDiscount - totalExpenses;`;
server = server.replace(oldReportsLogic3, newReportsLogic3);

const oldReportsLogic4 = `          data: {
            totalRevenue,
            totalProfit,
            totalExpenses,
            netProfit,`;
const newReportsLogic4 = `          data: {
            totalRevenue,
            totalProfit,
            totalDiscount,
            totalTax,
            totalExpenses,
            netProfit,`;
server = server.replace(oldReportsLogic4, newReportsLogic4);

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
console.log("Patched server.js reports logic!");
