const fs = require('fs');
let code = fs.readFileSync('web/src/app/purchases/page.tsx', 'utf8');

const regex = /unit_size:\s*\(item\.has_parts \? \(item\.part1_qty \|\| 1\) : 1\) \* \(\(item\.has_parts && item\.has_subparts\) \? \(item\.part2_qty \|\| 1\) : 1\),/g;

const replacement = `unit_size: (() => {
              if (item.units) {
                try {
                  const arr = JSON.parse(item.units);
                  if (arr && arr.length > 0) return arr[0].count;
                } catch(e) {}
              }
              return 1;
            })(),`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('web/src/app/purchases/page.tsx', code, 'utf8');
    console.log("SUCCESS: Fixed unit_size calculation in purchases/page.tsx");
} else {
    console.log("Could not find unit_size in purchases/page.tsx");
}
