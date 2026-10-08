const fs = require('fs');
let server = fs.readFileSync('roshetta_server/server.js', 'utf8');

// 1. Update PUT debt endpoint
const oldDebtEndpoint = `              payment,
              "تسديد دين",
              custJSON,
              date,
              "غير محدد",
              "الصيدلية الرئيسية",
              "completed",`;
              
const newDebtEndpoint = `              payment,
              req.body.paymentMethod || "cash",
              custJSON,
              date,
              "غير محدد",
              "الصيدلية الرئيسية",
              "debt_payment",`;

if (server.includes(oldDebtEndpoint)) {
  server = server.replace(oldDebtEndpoint, newDebtEndpoint);
  console.log("Updated PUT debt endpoint");
} else {
  console.log("Failed to find PUT debt endpoint");
}

// 2. Update GET reports logic
const oldReportLogic = `const isDebtPayment = pm === "تسديد دين" || pm === "debt_payment";`;
const newReportLogic = `const isDebtPayment = sale.status === "debt_payment" || pm === "تسديد دين" || pm === "debt_payment" || (sale.items === "[]" && saleTotal > 0);`;

if (server.includes(oldReportLogic)) {
  server = server.replace(oldReportLogic, newReportLogic);
  console.log("Updated GET reports logic");
} else {
  console.log("Failed to find GET reports logic");
}

fs.writeFileSync('roshetta_server/server.js', server, 'utf8');
