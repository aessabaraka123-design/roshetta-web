const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        if (fs.statSync(file).isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('web/src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Check for hardcoded const API = "http://localhost:3001"
    if (content.includes('const API = "http://localhost:3001"')) {
        content = content.replace(/const API = "http:\/\/localhost:3001"/g, 'const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"');
        changed = true;
    }

    // Check for hardcoded backticks like `http://localhost:3001/...`
    if (content.includes('`http://localhost:3001/')) {
        content = content.replace(/`http:\/\/localhost:3001\//g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed hardcoded API in:', file);
    }
});
