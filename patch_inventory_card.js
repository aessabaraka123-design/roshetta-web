const fs = require('fs');

let code = fs.readFileSync('web/src/app/inventory/page.tsx', 'utf8');

const targetStr = `                  <p
                    className="text-[14px] text-ink-soft mt-0.5 truncate max-w-full"
                    dir="auto"
                  >
                    {med.manufacturer} · {med.category}
                  </p>
                </div>
                <span
                  className={\`text-[12px] font-bold px-3 py-1 rounded-full \${tagColorClass}\`}
                >
                  {tag}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[14px] text-primary">
                  الكمية: {formatQty(med.qty, med.units)}
                </span>
                <span className="font-mono text-[16px] font-bold text-primary">
                  {med.price || 0} ₪
                </span>
              </div>`;

const newStr = `                  <p
                    className="text-[14px] text-ink-soft mt-0.5 truncate max-w-full"
                    dir="auto"
                  >
                    {med.manufacturer ? med.manufacturer + " · " : ""}{med.category}
                  </p>
                  {(med.isControlled === 1 || med.isControlled === true) && (
                    <span className="mt-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-coral-pale text-coral">
                      أدوية مراقبة (مخدّرة)
                    </span>
                  )}
                </div>
                <span
                  className={\`text-[12px] font-bold px-3 py-1 rounded-full \${tagColorClass}\`}
                >
                  {tag === "مراقبة" ? "متوفر" : tag}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[14px] text-primary">
                  الكمية: {formatQty(med.qty, med.units)}
                </span>
                <span className="font-mono text-[16px] font-bold text-primary">
                  {med.price || 0} ₪
                </span>
              </div>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, newStr);
  fs.writeFileSync('web/src/app/inventory/page.tsx', code, 'utf8');
  console.log("Patched inventory card UI");
} else {
  console.log("Could not find target string in inventory card");
}
