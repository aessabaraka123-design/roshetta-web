const fs = require('fs');
let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const oldBlock = `                <span className="font-mono text-[14px] text-ink-soft font-semibold">\r
                  الكمية: {(() => {\r
                    if (med.units) {\r
                      try {\r
                        const parsedUnits = JSON.parse(med.units);\r
                        if (parsedUnits && parsedUnits.length > 1) {\r
                          const boxesCount = parsedUnits[0].count;\r
                          const boxes = Math.floor(med.qty / boxesCount);\r
                          const remainder = med.qty % boxesCount;\r
                          let parts = [\`\${boxes} \${parsedUnits[0].name || 'علبة'}\`];\r
                          \r
                          if (parsedUnits.length === 3) {\r
                            const stripCount = parsedUnits[1].count;\r
                            const strips = Math.floor(remainder / stripCount);\r
                            const pills = remainder % stripCount;\r
                            \r
                            if (strips > 0) parts.push(\`\${strips} \${parsedUnits[1].name}\`);\r
                            if (pills > 0) parts.push(\`\${pills} \${parsedUnits[2].name}\`);\r
                            \r
                            return parts.join(' و ');\r
                          } else if (parsedUnits.length === 2) {\r
                            const pills = remainder;\r
                            if (pills > 0) parts.push(\`\${pills} \${parsedUnits[1].name}\`);\r
                            return parts.join(' و ');\r
                          }\r
                        }\r
                      } catch (e) {}\r
                    }\r
                    return med.qty;\r
                  })()}\r
                </span>`;

const newBlock = `                <span className="font-bold text-[13px] text-ink-soft">
                  {(() => {
                    try {
                      const u = med.units ? JSON.parse(med.units) : null;
                      const totalQty = med.qty || 0;

                      if (u && u.has_parts && u.part1_qty > 0) {
                        const p1qty = u.part1_qty || 1;
                        const p2qty = (u.has_subparts && u.part2_qty) ? u.part2_qty : 1;
                        const qtyPerBox = p1qty * p2qty;

                        const boxes = Math.floor(totalQty / qtyPerBox);
                        const rem1 = totalQty % qtyPerBox;
                        const strips = Math.floor(rem1 / p2qty);
                        const pills = rem1 % p2qty;

                        const parts: string[] = [];
                        if (boxes > 0) parts.push(\`\${boxes} علبة\`);
                        if (strips > 0) parts.push(\`\${strips} \${u.part1_name || 'شريط'}\`);
                        if (u.has_subparts && pills > 0) parts.push(\`\${pills} \${u.part2_name || 'حبة'}\`);
                        if (parts.length === 0) parts.push(\`0 علبة\`);

                        return <span className="text-primary font-black">الكمية: {parts.join(' و ')}</span>;
                      }
                    } catch(e) {}
                    return <span className="text-ink font-bold">الكمية: {med.qty}</span>;
                  })()}
                </span>`;

if (code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log('SUCCESS: Updated quantity display with new schema parser!');
} else {
  // Try simpler approach - find the span block start
  const startIdx = code.indexOf('<span className="font-mono text-[14px] text-ink-soft font-semibold">');
  const endIdx = code.indexOf('</span>', startIdx) + 7;
  if (startIdx > 0) {
    console.log('Found block at:', startIdx, '-', endIdx);
    console.log('Content:', JSON.stringify(code.substring(startIdx, endIdx)));
  } else {
    console.log('Block not found at all');
  }
}
