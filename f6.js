const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/store/index.js', 'utf8');

// 1. Add REFUND_PARTIAL to syncQueue processing
const switchTarget = \case "CLOSE_SHIFT":
                  url = \\\\\\/api/pharmacies/\\\/shifts/close\\\;
                  method = "POST";
                  body = task.payload;
                  break;\;
const switchReplacement = switchTarget + \
                case "REFUND_PARTIAL":
                  url = \\\\\\/api/pharmacies/\\\/sales/\\\/refund_partial\\\;
                  method = "PUT";
                  body = { itemsToRefund: task.payload.itemsToRefund };
                  break;\;
code = code.replace(switchTarget, switchReplacement);

// 2. Add refundSale action before checkout
const actionTarget = \      checkout: (\;
const actionReplacement = \      refundSale: (saleId, itemsToRefund, totalRefund) =>
        set((state) => {
          let updatedSales = state.sales.map((s) => {
            if (String(s.id) === String(saleId)) {
              return {
                ...s,
                status: "refunded",
                total: Math.max(0, s.total - totalRefund)
              };
            }
            return s;
          });
          return {
            sales: updatedSales,
            syncQueue: [
              ...state.syncQueue,
              { action: "REFUND_PARTIAL", payload: { saleId, itemsToRefund } }
            ]
          };
        }),

      checkout: (\;
code = code.replace(actionTarget, actionReplacement);

fs.writeFileSync('C:/roshetta_app/src/store/index.js', code, 'utf8');
