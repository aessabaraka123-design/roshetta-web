const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
        }
    });
    return results;
}

const files = walk('./web/src');
let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix TS implicitly any errors
    content = content.replace(/\(b =>/g, '((b: any) =>');
    content = content.replace(/\(total, employee\) =>/g, '((total: number, employee: any) =>');
    content = content.replace(/\(st, i\) =>/g, '((st: any, i: number) =>');
    content = content.replace(/\(med =>/g, '((med: any) =>');
    content = content.replace(/\(p, prx\) =>/g, '((p: any, prx: any) =>');
    content = content.replace(/\(s =>/g, '((s: any) =>');
    content = content.replace(/\(sale =>/g, '((sale: any) =>');
    content = content.replace(/\(item =>/g, '((item: any) =>');

    // Fix user is possibly null
    content = content.replace(/user\.name/g, 'user?.name');
    content = content.replace(/user\.username/g, 'user?.username');
    
    // Fix lint errors (unused vars)
    content = content.replace(/const err = /g, 'const _err = ');
    content = content.replace(/catch \(err\)/g, 'catch (_err)');
    content = content.replace(/catch \(error\)/g, 'catch (_error)');
    content = content.replace(/catch \(e\)/g, 'catch (_e)');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});
console.log('Modified ' + modifiedCount + ' files.');
