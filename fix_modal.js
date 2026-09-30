const fs = require('fs');
let code = fs.readFileSync('C:/roshetta_app/src/components/ReceiptModal.js', 'utf8');

// 1. Calculate original Total
const originalTotalLogic = `\n  const originalTotal = items ? items.reduce((s, it) => s + ((*it.cartQty || it.qty || 1) * (it.price || 0)), 0) : 0;\n  const displayTotal = sale.status === 'refunded' && Number(sale.total) === 0 ? originalTotal : Number(sale.total || 0);\n;k`;
code = code.replace('const saleDate = sale.date ? new Date(sale.date) : new Date();', 'const saleDate = sale.date ? new Date(sale.date) : new Date();' + originalTotalLogic);

// 2. Add Invoice Status Row
const statusRow = `\n              <View style={[styles.thermalRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>\n                <Text style={[styles.thermalLabel, { textAlign: isRtl ? 'right' : 'left' }, { textAlign: isRtl ? 'right' : 'left' }]}>\u0628\u0627\u0644\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629:</Text>\n                <Text style={styles.thermalValue}>\n                  {sale.status === 'refunded' ? '\u0645\u0633\u062A\u0631\u062C\u0639\u0629' : sale.status === 'partial_refund' ? '\u0645\u0633\u062A\u0631\u062C\u0639\u0629 \u062C\u0632\u0626\u064A\u0641' : '\u0645\u063B\u062A\u0645\u0644\u0629'}\n                </Text>\n              </View>`;
code = code.replace(/\<Text style=\{styles.thermalValue\}\>\{sale.id\}\<\/Text\>\n|s*\<\/View\>/, '<Text style={styles.thermalValue}>{'"' + sale.id + ''}</Text>\n              </View>' + statusRow); // fake
code = code.replace("<Text style={styles.thermalValue}>{sale.id}</Text>\n              </View>", "<Text style={styles.thermalValue}>{sale.id}</Text>\n              </View>" + statusRow);

// 3. Replace total with displayTotal
code = code.replace("Number(sale.total || 0).toFixed(2)", "displayTotal.toFixed(2)");

fs.writeFileSync('C:/roshetta_app/src/components/ReceiptModal.js', code, 'utf8');
