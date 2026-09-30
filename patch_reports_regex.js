const fs = require('fs');
let file = './roshetta_server/server.js';
let content = fs.readFileSync(file, 'utf8');

const replacement = `      const topItems = Object.values(itemSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      let expensesQuery = 'SELECT * FROM expenses WHERE pharmacy_id = ?';
      let expParams = [id];
      if (branch && branch !== 'all') {
        expensesQuery += ' AND branch_id = ?';
        expParams.push(branch);
      }
      if (from) {
        expensesQuery += ' AND date >= ?';
        expParams.push(from + 'T00:00:00.000Z');
      }
      if (to) {
        expensesQuery += ' AND date <= ?';
        expParams.push(to + 'T23:59:59.999Z');
      }

      db.all(expensesQuery, expParams, (errExp, expRows) => {
        let totalExpenses = 0;
        if (!errExp) {
          (expRows || []).forEach(exp => {
            totalExpenses += (exp.amount || 0);
          });
        }
        
        const netProfit = totalProfit - totalExpenses;

        res.json({
          success: true,
          data: {
            totalRevenue,
            totalProfit,
            totalExpenses,
            netProfit,
            profitMargin:
              totalRevenue > 0
                ? ((totalProfit / totalRevenue) * 100).toFixed(1)
                : 0,
            dailyTrend,
            branchPerformance,
            topItems,
            paymentBreakdown,
          },
        });
      });`;

content = content.replace(/const topItems = Object\.values\(itemSales\)[\s\S]*?res\.json\(\{[\s\S]*?paymentBreakdown,\s*},\s*}\);/m, replacement);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed reports API via regex');
